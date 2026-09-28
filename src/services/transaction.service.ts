import { Types } from "mongoose";
import type { AllotmentSummary } from "@/lib/budget-math";
import { monthDateRange, monthOf } from "@/lib/dates";
import { AppError, NotFoundError } from "@/lib/errors";
import {
  fieldErrorsOf,
  transactionFiltersSchema,
  transactionSchema,
  type TransactionFilters,
  type TransactionInput,
} from "@/lib/validation";
import { Allotment } from "@/models/Allotment";
import { Transaction, type TransactionDoc } from "@/models/Transaction";
import { User } from "@/models/User";
import { ensureBudget, getAllotmentSummary } from "./budget.service";
import { requireMembership, type Membership } from "./household.service";

export type TransactionView = {
  id: string;
  amount: number;
  description: string;
  transactionDate: string;
  allotmentId: string;
  allotmentName: string;
  paidByUserId: string;
  paidByName: string;
};

const TRANSACTION_NOT_FOUND = "This expense no longer exists.";

function parseTransaction(input: TransactionInput) {
  const parsed = transactionSchema.safeParse(input);
  if (!parsed.success) throw new AppError("Please fix the highlighted fields.", fieldErrorsOf(parsed.error));
  return parsed.data;
}

async function findOwnTransaction(householdId: Types.ObjectId, transactionId: string) {
  if (!Types.ObjectId.isValid(transactionId)) throw new NotFoundError(TRANSACTION_NOT_FOUND);
  // Always scoped by householdId: never trust a bare findById.
  const tx = await Transaction.findOne({ _id: transactionId, householdId });
  if (!tx) throw new NotFoundError(TRANSACTION_NOT_FOUND);
  return tx;
}

async function assertAllotment(membership: Membership, allotmentId: string, opts: { allowArchived: boolean }) {
  const allotment = await Allotment.findOne({ _id: allotmentId, householdId: membership.householdId }).lean();
  if (!allotment) {
    const message = "This allotment no longer exists.";
    throw new AppError(message, { allotmentId: [message] });
  }
  if (allotment.isArchived && !opts.allowArchived) {
    throw new AppError("This allotment is archived. Choose another one.", {
      allotmentId: ["This allotment is archived."],
    });
  }
  return allotment;
}

function assertPayer(membership: Membership, paidByUserId: string, previousPayer?: string) {
  // A former member stays valid as the payer of expenses they already recorded.
  if (!membership.memberIds.includes(paidByUserId) && paidByUserId !== previousPayer) {
    throw new AppError("Choose a member of your household.", { paidByUserId: ["Choose a member of your household."] });
  }
}

export type SavedTransaction = {
  id: string;
  allotmentName: string;
  month: string;
  allotment: AllotmentSummary;
};

export async function createTransaction(userId: string, input: TransactionInput): Promise<SavedTransaction> {
  const membership = await requireMembership(userId);
  const data = parseTransaction(input);
  const allotment = await assertAllotment(membership, data.allotmentId, { allowArchived: false });
  assertPayer(membership, data.paidByUserId);

  const month = monthOf(data.transactionDate);
  const budget = await ensureBudget(membership.householdId, month);
  const tx = await Transaction.create({
    householdId: membership.householdId,
    budgetId: budget._id,
    allotmentId: allotment._id,
    amount: data.amount,
    description: data.description,
    paidByUserId: data.paidByUserId,
    transactionDate: data.transactionDate,
  });

  return {
    id: tx._id.toString(),
    allotmentName: allotment.name,
    month,
    allotment: await getAllotmentSummary(membership.householdId, budget._id, allotment._id),
  };
}

export async function updateTransaction(
  userId: string,
  transactionId: string,
  input: TransactionInput,
): Promise<SavedTransaction> {
  const membership = await requireMembership(userId);
  const tx = await findOwnTransaction(membership.householdId, transactionId);
  const data = parseTransaction(input);
  const allotment = await assertAllotment(membership, data.allotmentId, {
    // Keeping an expense in its (now archived) allotment is fine; moving into one isn't.
    allowArchived: tx.allotmentId.toString() === data.allotmentId,
  });
  assertPayer(membership, data.paidByUserId, tx.paidByUserId.toString());

  // The date decides the month; moving the date across months moves the budget.
  const month = monthOf(data.transactionDate);
  const budget = await ensureBudget(membership.householdId, month);
  tx.set({
    budgetId: budget._id,
    allotmentId: allotment._id,
    amount: data.amount,
    description: data.description,
    paidByUserId: data.paidByUserId,
    transactionDate: data.transactionDate,
  });
  await tx.save();

  return {
    id: tx._id.toString(),
    allotmentName: allotment.name,
    month,
    allotment: await getAllotmentSummary(membership.householdId, budget._id, allotment._id),
  };
}

export async function deleteTransaction(userId: string, transactionId: string): Promise<void> {
  const { householdId } = await requireMembership(userId);
  if (!Types.ObjectId.isValid(transactionId)) throw new NotFoundError(TRANSACTION_NOT_FOUND);
  const result = await Transaction.deleteOne({ _id: transactionId, householdId });
  if (result.deletedCount === 0) throw new NotFoundError(TRANSACTION_NOT_FOUND);
}

async function toViews(docs: TransactionDoc[]): Promise<TransactionView[]> {
  const allotmentIds = [...new Set(docs.map((d) => d.allotmentId.toString()))];
  const userIds = [...new Set(docs.map((d) => d.paidByUserId.toString()))];
  const [allotments, users] = await Promise.all([
    Allotment.find({ _id: { $in: allotmentIds } }).select("name").lean(),
    User.find({ _id: { $in: userIds } }).select("name").lean(),
  ]);
  const allotmentNames = new Map(allotments.map((a) => [a._id.toString(), a.name]));
  const userNames = new Map(users.map((u) => [u._id.toString(), u.name]));

  return docs.map((d) => ({
    id: d._id.toString(),
    amount: d.amount,
    description: d.description ?? "",
    transactionDate: d.transactionDate,
    allotmentId: d.allotmentId.toString(),
    allotmentName: allotmentNames.get(d.allotmentId.toString()) ?? "Deleted allotment",
    paidByUserId: d.paidByUserId.toString(),
    paidByName: userNames.get(d.paidByUserId.toString()) ?? "Former member",
  }));
}

export async function getTransaction(userId: string, transactionId: string): Promise<TransactionView> {
  const { householdId } = await requireMembership(userId);
  const tx = await findOwnTransaction(householdId, transactionId);
  const [view] = await toViews([tx.toObject()]);
  return view;
}

export const TRANSACTION_LIST_LIMIT = 500;

export async function listTransactions(userId: string, filters: TransactionFilters): Promise<TransactionView[]> {
  const { householdId } = await requireMembership(userId);
  const parsed = transactionFiltersSchema.safeParse(filters);
  if (!parsed.success) throw new AppError("Invalid filters.");
  const { month, allotmentId, paidByUserId, date, q } = parsed.data;
  const range = monthDateRange(month);

  const query: Record<string, unknown> = {
    householdId,
    transactionDate: date && monthOf(date) === month ? date : { $gte: range.start, $lte: range.end },
  };
  if (allotmentId) query.allotmentId = new Types.ObjectId(allotmentId);
  if (paidByUserId) query.paidByUserId = new Types.ObjectId(paidByUserId);
  if (q) query.description = { $regex: q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" };

  const docs = await Transaction.find(query)
    .sort({ transactionDate: -1, createdAt: -1 })
    .limit(TRANSACTION_LIST_LIMIT)
    .lean<TransactionDoc[]>();
  return toViews(docs);
}

/** The allotment of the user's most recent expense, used as the Add Expense default. */
export async function lastUsedAllotmentId(userId: string): Promise<string | null> {
  const { householdId } = await requireMembership(userId);
  const last = await Transaction.findOne({ householdId, paidByUserId: userId })
    .sort({ createdAt: -1 })
    .select("allotmentId")
    .lean();
  return last?.allotmentId.toString() ?? null;
}
