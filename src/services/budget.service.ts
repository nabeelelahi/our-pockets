import { Types } from "mongoose";
import { summarizeAllotment, summarizeMonth, type AllotmentSummary, type MonthTotals } from "@/lib/budget-math";
import { formatMonthLabel, isValidMonth } from "@/lib/dates";
import { AppError, isDuplicateKeyError } from "@/lib/errors";
import { budgetSchema, fieldErrorsOf, type BudgetInput } from "@/lib/validation";
import { Allotment, type AllotmentDoc } from "@/models/Allotment";
import { Budget, type BudgetDoc } from "@/models/Budget";
import { BudgetAllocation } from "@/models/BudgetAllocation";
import { Income } from "@/models/Income";
import { Transaction } from "@/models/Transaction";
import { toAllotmentInfo, type AllotmentInfo } from "./allotment.service";
import { requireMembership, type HouseholdInfo } from "./household.service";

/** Returns the household's budget for a month, creating an empty one if needed. */
export async function ensureBudget(householdId: Types.ObjectId, month: string): Promise<BudgetDoc> {
  const upsert = () =>
    Budget.findOneAndUpdate(
      { householdId, month },
      { $setOnInsert: { householdId, month } },
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

/** Sum of expenses per allotment for one budget. */
export async function spentByAllotment(
  householdId: Types.ObjectId,
  budgetId: Types.ObjectId,
): Promise<Map<string, number>> {
  const rows = await Transaction.aggregate<{ _id: Types.ObjectId; spent: number }>([
    { $match: { householdId, budgetId } },
    { $group: { _id: "$allotmentId", spent: { $sum: "$amount" } } },
  ]);
  return new Map(rows.map((r) => [r._id.toString(), r.spent]));
}

/** `inBudget`: the allotment was given an amount (possibly 0) in this month's budget. */
export type AllotmentRow = AllotmentInfo & AllotmentSummary & { inBudget: boolean };

export type MonthOverview = {
  household: HouseholdInfo;
  month: string;
  hasBudget: boolean;
  totals: MonthTotals;
  allotments: AllotmentRow[];
};

export async function getMonthOverview(userId: string, month: string): Promise<MonthOverview> {
  const { household, householdId } = await requireMembership(userId);
  if (!isValidMonth(month)) throw new AppError("Please choose a valid month.");

  const [budget, allotments] = await Promise.all([
    Budget.findOne({ householdId, month }).lean<BudgetDoc>(),
    Allotment.find({ householdId }).sort({ sortOrder: 1, createdAt: 1 }).lean<AllotmentDoc[]>(),
  ]);

  const allocations = new Map<string, number>();
  let spent = new Map<string, number>();
  let incomes: number[] = [];
  if (budget) {
    const [allocationDocs, spentMap, incomeDocs] = await Promise.all([
      BudgetAllocation.find({ householdId, budgetId: budget._id }).lean(),
      spentByAllotment(householdId, budget._id),
      Income.find({ householdId, budgetId: budget._id }).select("amount").lean(),
    ]);
    for (const a of allocationDocs) allocations.set(a.allotmentId.toString(), a.allocatedAmount);
    spent = spentMap;
    incomes = incomeDocs.map((i) => i.amount);
  }

  const rows: AllotmentRow[] = allotments
    .map((a) => {
      const id = a._id.toString();
      return {
        ...toAllotmentInfo(a),
        ...summarizeAllotment(allocations.get(id) ?? 0, spent.get(id) ?? 0),
        inBudget: allocations.has(id),
      };
    })
    // Archived allotments only appear in months where they are budgeted or have spending.
    .filter((row) => !row.isArchived || row.inBudget || row.spent > 0);

  return {
    household,
    month,
    hasBudget: budget !== null,
    totals: summarizeMonth(incomes, [...allocations.values()], [...spent.values()]),
    allotments: rows,
  };
}

export async function getAllotmentSummary(
  householdId: Types.ObjectId,
  budgetId: Types.ObjectId,
  allotmentId: Types.ObjectId,
): Promise<AllotmentSummary> {
  const [allocation, spentRows] = await Promise.all([
    BudgetAllocation.findOne({ householdId, budgetId, allotmentId }).lean(),
    Transaction.aggregate<{ spent: number }>([
      { $match: { householdId, budgetId, allotmentId } },
      { $group: { _id: null, spent: { $sum: "$amount" } } },
    ]),
  ]);
  return summarizeAllotment(allocation?.allocatedAmount ?? 0, spentRows[0]?.spent ?? 0);
}

/** Saves the complete set of allotted amounts for a month. */
export async function saveBudget(userId: string, input: BudgetInput): Promise<void> {
  const { householdId } = await requireMembership(userId);
  const parsed = budgetSchema.safeParse(input);
  if (!parsed.success) throw new AppError("Please enter valid amounts.", fieldErrorsOf(parsed.error));
  const { month, allocations } = parsed.data;

  // Every allotment must belong to this household.
  const allotmentIds = [...new Set(allocations.map((a) => a.allotmentId))];
  const owned = await Allotment.countDocuments({ _id: { $in: allotmentIds }, householdId });
  if (owned !== allotmentIds.length) throw new AppError("This allotment no longer exists.");

  const budget = await ensureBudget(householdId, month);
  // The submitted list is the month's full plan: allotments left out are removed from it.
  await BudgetAllocation.deleteMany({
    householdId,
    budgetId: budget._id,
    allotmentId: { $nin: allotmentIds.map((id) => new Types.ObjectId(id)) },
  });
  if (allocations.length > 0) {
    await BudgetAllocation.bulkWrite(
      allocations.map((a) => ({
        updateOne: {
          filter: { budgetId: budget._id, allotmentId: new Types.ObjectId(a.allotmentId) },
          update: { $set: { allocatedAmount: a.allocatedAmount }, $setOnInsert: { householdId } },
          upsert: true,
        },
      })),
    );
  }
}

export type CopiedBudget = { fromMonth: string; allocations: Record<string, number> };

/** The most recent budget before `month` that allotted any money. */
async function previousBudget(householdId: Types.ObjectId, month: string) {
  const budgetIds = await BudgetAllocation.distinct("budgetId", { householdId });
  return Budget.findOne({ householdId, month: { $lt: month }, _id: { $in: budgetIds } })
    .sort({ month: -1 })
    .lean<BudgetDoc>();
}

/**
 * Copies allotted amounts (for allotments that are still active) from the most
 * recent earlier budget. Income entries are actual receipts, so they are not
 * copied, and unspent money does not roll over.
 */
export async function copyPreviousBudget(userId: string, month: string): Promise<CopiedBudget> {
  const { householdId } = await requireMembership(userId);
  if (!isValidMonth(month)) throw new AppError("Please choose a valid month.");

  const previous = await previousBudget(householdId, month);
  if (!previous) throw new AppError(`There's no budget before ${formatMonthLabel(month)} to copy from.`);

  const [allocations, active] = await Promise.all([
    BudgetAllocation.find({ householdId, budgetId: previous._id }).lean(),
    Allotment.find({ householdId, isArchived: false }).select("_id").lean(),
  ]);
  const activeIds = new Set(active.map((a) => a._id.toString()));
  const copied = allocations
    .filter((a) => activeIds.has(a.allotmentId.toString()))
    .map((a) => ({ allotmentId: a.allotmentId.toString(), allocatedAmount: a.allocatedAmount }));
  await saveBudget(userId, { month, allocations: copied });
  return {
    fromMonth: previous.month,
    allocations: Object.fromEntries(copied.map((a) => [a.allotmentId, a.allocatedAmount])),
  };
}

/** The most recent month before `month` with allotted amounts to copy, if any. */
export async function previousBudgetMonth(userId: string, month: string): Promise<string | null> {
  const { householdId } = await requireMembership(userId);
  return (await previousBudget(householdId, month))?.month ?? null;
}
