import { Types } from "mongoose";
import { summarizeCategory, summarizeMonth, type CategorySummary, type MonthTotals } from "@/lib/budget-math";
import { formatMonthLabel, isValidMonth } from "@/lib/dates";
import { AppError, isDuplicateKeyError } from "@/lib/errors";
import { budgetSchema, fieldErrorsOf, type BudgetInput } from "@/lib/validation";
import { Budget, type BudgetDoc } from "@/models/Budget";
import { BudgetAllocation } from "@/models/BudgetAllocation";
import { Category, type CategoryDoc } from "@/models/Category";
import { Transaction } from "@/models/Transaction";
import { toCategoryInfo, type CategoryInfo } from "./category.service";
import { requireMembership, type HouseholdInfo } from "./household.service";

/** Returns the household's budget for a month, creating an empty one if needed. */
export async function ensureBudget(householdId: Types.ObjectId, month: string): Promise<BudgetDoc> {
  const upsert = () =>
    Budget.findOneAndUpdate(
      { householdId, month },
      { $setOnInsert: { householdId, month, totalIncome: 0 } },
      { upsert: true, returnDocument: "after" },
    ).lean<BudgetDoc>();
  try {
    return (await upsert())!;
  } catch (err) {
    // Two concurrent upserts can race on the unique index; the retry finds the winner.
    if (isDuplicateKeyError(err)) return (await upsert())!;
    throw err;
  }
}

/** Sum of transaction amounts per category for one budget. */
export async function spentByCategory(
  householdId: Types.ObjectId,
  budgetId: Types.ObjectId,
): Promise<Map<string, number>> {
  const rows = await Transaction.aggregate<{ _id: Types.ObjectId; spent: number }>([
    { $match: { householdId, budgetId } },
    { $group: { _id: "$categoryId", spent: { $sum: "$amount" } } },
  ]);
  return new Map(rows.map((r) => [r._id.toString(), r.spent]));
}

export type CategoryRow = CategoryInfo & CategorySummary;

export type MonthOverview = {
  household: HouseholdInfo;
  month: string;
  hasBudget: boolean;
  totals: MonthTotals;
  categories: CategoryRow[];
};

export async function getMonthOverview(userId: string, month: string): Promise<MonthOverview> {
  const { household, householdId } = await requireMembership(userId);
  if (!isValidMonth(month)) throw new AppError("Please choose a valid month.");

  const [budget, categories] = await Promise.all([
    Budget.findOne({ householdId, month }).lean<BudgetDoc>(),
    Category.find({ householdId }).sort({ sortOrder: 1, createdAt: 1 }).lean<CategoryDoc[]>(),
  ]);

  const allocations = new Map<string, number>();
  let spent = new Map<string, number>();
  if (budget) {
    const [allocationDocs, spentMap] = await Promise.all([
      BudgetAllocation.find({ householdId, budgetId: budget._id }).lean(),
      spentByCategory(householdId, budget._id),
    ]);
    for (const a of allocationDocs) allocations.set(a.categoryId.toString(), a.allocatedAmount);
    spent = spentMap;
  }

  const rows: CategoryRow[] = categories
    .map((c) => {
      const id = c._id.toString();
      return { ...toCategoryInfo(c), ...summarizeCategory(allocations.get(id) ?? 0, spent.get(id) ?? 0) };
    })
    // Archived categories only appear in months where they hold money or spending.
    .filter((row) => !row.isArchived || row.allocated > 0 || row.spent > 0);

  return {
    household,
    month,
    hasBudget: budget !== null,
    totals: summarizeMonth(budget?.totalIncome ?? 0, [...allocations.values()], [...spent.values()]),
    categories: rows,
  };
}

export async function getCategorySummary(
  householdId: Types.ObjectId,
  budgetId: Types.ObjectId,
  categoryId: Types.ObjectId,
): Promise<CategorySummary> {
  const [allocation, spentRows] = await Promise.all([
    BudgetAllocation.findOne({ householdId, budgetId, categoryId }).lean(),
    Transaction.aggregate<{ spent: number }>([
      { $match: { householdId, budgetId, categoryId } },
      { $group: { _id: null, spent: { $sum: "$amount" } } },
    ]),
  ]);
  return summarizeCategory(allocation?.allocatedAmount ?? 0, spentRows[0]?.spent ?? 0);
}

export async function saveBudget(userId: string, input: BudgetInput): Promise<void> {
  const { householdId } = await requireMembership(userId);
  const parsed = budgetSchema.safeParse(input);
  if (!parsed.success) throw new AppError("Please enter valid amounts.", fieldErrorsOf(parsed.error));
  const { month, totalIncome, allocations } = parsed.data;

  // Every category must belong to this household.
  const categoryIds = [...new Set(allocations.map((a) => a.categoryId))];
  const owned = await Category.countDocuments({ _id: { $in: categoryIds }, householdId });
  if (owned !== categoryIds.length) throw new AppError("This category no longer exists.");

  const budget = await ensureBudget(householdId, month);
  await Budget.updateOne({ _id: budget._id, householdId }, { $set: { totalIncome } });
  if (allocations.length > 0) {
    await BudgetAllocation.bulkWrite(
      allocations.map((a) => ({
        updateOne: {
          filter: { budgetId: budget._id, categoryId: new Types.ObjectId(a.categoryId) },
          update: {
            $set: { allocatedAmount: a.allocatedAmount },
            $setOnInsert: { householdId },
          },
          upsert: true,
        },
      })),
    );
  }
}

/**
 * Copies income and allocations (for categories that are still active) from the
 * most recent earlier budget. No rollover of unspent money happens here.
 */
export type CopiedBudget = { fromMonth: string; totalIncome: number; allocations: Record<string, number> };

export async function copyPreviousBudget(userId: string, month: string): Promise<CopiedBudget> {
  const { householdId } = await requireMembership(userId);
  if (!isValidMonth(month)) throw new AppError("Please choose a valid month.");

  const previous = await Budget.findOne({ householdId, month: { $lt: month } })
    .sort({ month: -1 })
    .lean<BudgetDoc>();
  if (!previous) throw new AppError(`There's no budget before ${formatMonthLabel(month)} to copy from.`);

  const [allocations, activeCategories] = await Promise.all([
    BudgetAllocation.find({ householdId, budgetId: previous._id }).lean(),
    Category.find({ householdId, isArchived: false }).select("_id").lean(),
  ]);
  const active = new Set(activeCategories.map((c) => c._id.toString()));

  const copied = allocations
    .filter((a) => active.has(a.categoryId.toString()))
    .map((a) => ({ categoryId: a.categoryId.toString(), allocatedAmount: a.allocatedAmount }));
  await saveBudget(userId, { month, totalIncome: previous.totalIncome, allocations: copied });
  return {
    fromMonth: previous.month,
    totalIncome: previous.totalIncome,
    allocations: Object.fromEntries(copied.map((a) => [a.categoryId, a.allocatedAmount])),
  };
}

/** The most recent month before `month` that has a budget, if any. */
export async function previousBudgetMonth(userId: string, month: string): Promise<string | null> {
  const { householdId } = await requireMembership(userId);
  const previous = await Budget.findOne({ householdId, month: { $lt: month } })
    .sort({ month: -1 })
    .select("month")
    .lean();
  return previous?.month ?? null;
}
