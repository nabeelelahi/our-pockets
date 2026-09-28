import { Types } from "mongoose";
import { monthOf } from "@/lib/dates";
import { AppError, NotFoundError } from "@/lib/errors";
import { fieldErrorsOf, incomeSchema, type IncomeInput } from "@/lib/validation";
import { Budget } from "@/models/Budget";
import { Income, type IncomeDoc } from "@/models/Income";
import { User } from "@/models/User";
import { ensureBudget } from "./budget.service";
import { requireMembership, type Membership } from "./household.service";

export type IncomeView = {
  id: string;
  amount: number;
  source: string;
  receivedDate: string;
  receivedByUserId: string;
  receivedByName: string;
};

const INCOME_NOT_FOUND = "This income entry no longer exists.";

function parseIncome(input: IncomeInput) {
  const parsed = incomeSchema.safeParse(input);
  if (!parsed.success) throw new AppError("Please fix the highlighted fields.", fieldErrorsOf(parsed.error));
  return parsed.data;
}

function assertReceiver(membership: Membership, userId: string, previous?: string) {
  // A former member stays valid on entries they already received.
  if (!membership.memberIds.includes(userId) && userId !== previous) {
    const message = "Choose a member of your household.";
    throw new AppError(message, { receivedByUserId: [message] });
  }
}

export async function createIncome(userId: string, input: IncomeInput): Promise<{ id: string; month: string }> {
  const membership = await requireMembership(userId);
  const data = parseIncome(input);
  assertReceiver(membership, data.receivedByUserId);
  const month = monthOf(data.receivedDate);
  const budget = await ensureBudget(membership.householdId, month);
  const income = await Income.create({ ...data, householdId: membership.householdId, budgetId: budget._id });
  return { id: income._id.toString(), month };
}

export async function updateIncome(userId: string, incomeId: string, input: IncomeInput): Promise<void> {
  const membership = await requireMembership(userId);
  if (!Types.ObjectId.isValid(incomeId)) throw new NotFoundError(INCOME_NOT_FOUND);
  const income = await Income.findOne({ _id: incomeId, householdId: membership.householdId });
  if (!income) throw new NotFoundError(INCOME_NOT_FOUND);
  const data = parseIncome(input);
  assertReceiver(membership, data.receivedByUserId, income.receivedByUserId.toString());
  // The date decides the month, as with expenses.
  const budget = await ensureBudget(membership.householdId, monthOf(data.receivedDate));
  income.set({ ...data, budgetId: budget._id });
  await income.save();
}

export async function deleteIncome(userId: string, incomeId: string): Promise<void> {
  const { householdId } = await requireMembership(userId);
  if (!Types.ObjectId.isValid(incomeId)) throw new NotFoundError(INCOME_NOT_FOUND);
  const result = await Income.deleteOne({ _id: incomeId, householdId });
  if (result.deletedCount === 0) throw new NotFoundError(INCOME_NOT_FOUND);
}

export async function listIncomes(userId: string, month: string): Promise<IncomeView[]> {
  const { householdId } = await requireMembership(userId);
  const budget = await Budget.findOne({ householdId, month }).lean();
  if (!budget) return [];
  const docs = await Income.find({ householdId, budgetId: budget._id })
    .sort({ receivedDate: -1, createdAt: -1 })
    .lean<IncomeDoc[]>();
  const users = await User.find({ _id: { $in: docs.map((d) => d.receivedByUserId) } })
    .select("name")
    .lean();
  const names = new Map(users.map((u) => [u._id.toString(), u.name]));
  return docs.map((d) => ({
    id: d._id.toString(),
    amount: d.amount,
    source: d.source ?? "",
    receivedDate: d.receivedDate,
    receivedByUserId: d.receivedByUserId.toString(),
    receivedByName: names.get(d.receivedByUserId.toString()) ?? "Former member",
  }));
}
