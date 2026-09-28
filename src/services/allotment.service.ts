import { Types } from "mongoose";
import { AppError, NotFoundError } from "@/lib/errors";
import { allotmentSchema, fieldErrorsOf, type AllotmentInput } from "@/lib/validation";
import { Allotment, type AllotmentDoc } from "@/models/Allotment";
import { BudgetAllocation } from "@/models/BudgetAllocation";
import { Transaction } from "@/models/Transaction";
import { requireMembership } from "./household.service";

export type AllotmentInfo = {
  id: string;
  name: string;
  sortOrder: number;
  isArchived: boolean;
};

export function toAllotmentInfo(a: AllotmentDoc): AllotmentInfo {
  return { id: a._id.toString(), name: a.name, sortOrder: a.sortOrder, isArchived: a.isArchived };
}

const ALLOTMENT_NOT_FOUND = "This allotment no longer exists.";

async function findOwnAllotment(householdId: Types.ObjectId, allotmentId: string) {
  if (!Types.ObjectId.isValid(allotmentId)) throw new NotFoundError(ALLOTMENT_NOT_FOUND);
  const allotment = await Allotment.findOne({ _id: allotmentId, householdId });
  if (!allotment) throw new NotFoundError(ALLOTMENT_NOT_FOUND);
  return allotment;
}

function parseAllotment(input: AllotmentInput) {
  const parsed = allotmentSchema.safeParse(input);
  if (!parsed.success) throw new AppError("Please fix the highlighted fields.", fieldErrorsOf(parsed.error));
  return parsed.data;
}

async function assertNameAvailable(householdId: Types.ObjectId, name: string, exceptId?: Types.ObjectId) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const clash = await Allotment.exists({
    householdId,
    isArchived: false,
    name: { $regex: `^${escaped}$`, $options: "i" },
    ...(exceptId ? { _id: { $ne: exceptId } } : {}),
  });
  if (clash) {
    const message = "An allotment with this name already exists.";
    throw new AppError(message, { name: [message] });
  }
}

/** The household's allotment for an id, or a NotFoundError (also for other households' ids). */
export async function getAllotment(userId: string, allotmentId: string): Promise<AllotmentInfo> {
  const { householdId } = await requireMembership(userId);
  return toAllotmentInfo((await findOwnAllotment(householdId, allotmentId)).toObject());
}

export async function listAllotments(
  userId: string,
  opts: { includeArchived?: boolean } = {},
): Promise<AllotmentInfo[]> {
  const { householdId } = await requireMembership(userId);
  const allotments = await Allotment.find({
    householdId,
    ...(opts.includeArchived ? {} : { isArchived: false }),
  })
    .sort({ isArchived: 1, sortOrder: 1, createdAt: 1 })
    .lean<AllotmentDoc[]>();
  return allotments.map(toAllotmentInfo);
}

export async function createAllotment(userId: string, input: AllotmentInput): Promise<AllotmentInfo> {
  const { householdId } = await requireMembership(userId);
  const data = parseAllotment(input);
  await assertNameAvailable(householdId, data.name);
  const last = await Allotment.findOne({ householdId }).sort({ sortOrder: -1 }).lean();
  const allotment = await Allotment.create({ ...data, householdId, sortOrder: (last?.sortOrder ?? -1) + 1 });
  return toAllotmentInfo(allotment.toObject());
}

export async function renameAllotment(userId: string, allotmentId: string, input: AllotmentInput): Promise<void> {
  const { householdId } = await requireMembership(userId);
  const allotment = await findOwnAllotment(householdId, allotmentId);
  const data = parseAllotment(input);
  await assertNameAvailable(householdId, data.name, allotment._id);
  allotment.name = data.name;
  await allotment.save();
}

export async function setAllotmentArchived(userId: string, allotmentId: string, archived: boolean): Promise<void> {
  const { householdId } = await requireMembership(userId);
  const allotment = await findOwnAllotment(householdId, allotmentId);
  if (!archived) await assertNameAvailable(householdId, allotment.name, allotment._id);
  allotment.isArchived = archived;
  await allotment.save();
}

/** Swaps an allotment with its neighbour among the active allotments. */
export async function moveAllotment(userId: string, allotmentId: string, direction: "up" | "down"): Promise<void> {
  const { householdId } = await requireMembership(userId);
  const active = await Allotment.find({ householdId, isArchived: false }).sort({ sortOrder: 1, createdAt: 1 });
  const index = active.findIndex((a) => a._id.toString() === allotmentId);
  if (index === -1) throw new NotFoundError(ALLOTMENT_NOT_FOUND);
  const target = direction === "up" ? index - 1 : index + 1;
  if (target < 0 || target >= active.length) return;

  [active[index], active[target]] = [active[target], active[index]];
  await Allotment.bulkWrite(
    active.map((a, i) => ({
      updateOne: { filter: { _id: a._id, householdId }, update: { $set: { sortOrder: i } } },
    })),
  );
}

/**
 * Removes an allotment everywhere when it has no expenses; otherwise archives
 * it so past spending stays in the history.
 */
export async function deleteOrArchiveAllotment(
  userId: string,
  allotmentId: string,
): Promise<"deleted" | "archived"> {
  const { householdId } = await requireMembership(userId);
  const allotment = await findOwnAllotment(householdId, allotmentId);
  if (await Transaction.exists({ householdId, allotmentId: allotment._id })) {
    allotment.isArchived = true;
    await allotment.save();
    return "archived";
  }
  await BudgetAllocation.deleteMany({ householdId, allotmentId: allotment._id });
  await Allotment.deleteOne({ _id: allotment._id, householdId });
  return "deleted";
}
