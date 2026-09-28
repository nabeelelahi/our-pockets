import { Types } from "mongoose";
import { dbConnect } from "@/lib/db";
import { AppError, ForbiddenError, isDuplicateKeyError } from "@/lib/errors";
import { createHouseholdSchema, fieldErrorsOf, householdSettingsSchema } from "@/lib/validation";
import { Allotment } from "@/models/Allotment";
import { Household, type HouseholdDoc, type HouseholdRole } from "@/models/Household";
import { User } from "@/models/User";

export type HouseholdInfo = {
  id: string;
  name: string;
  currency: string;
  timezone: string;
  ownerId: string;
};

export type Membership = {
  household: HouseholdInfo;
  householdId: Types.ObjectId;
  role: HouseholdRole;
  memberIds: string[];
};

export type Member = { id: string; name: string; email: string; role: HouseholdRole };

function toMembership(doc: HouseholdDoc, userId: string): Membership {
  const member = doc.members.find((m) => m.userId.toString() === userId);
  return {
    household: {
      id: doc._id.toString(),
      name: doc.name,
      currency: doc.currency,
      timezone: doc.timezone,
      ownerId: doc.ownerId.toString(),
    },
    householdId: doc._id,
    role: (member?.role ?? "MEMBER") as HouseholdRole,
    memberIds: doc.members.map((m) => m.userId.toString()),
  };
}

/**
 * The household is always derived from the authenticated user, never from a
 * client-supplied id. This is the root of every authorization check.
 */
export async function getMembership(userId: string): Promise<Membership | null> {
  if (!Types.ObjectId.isValid(userId)) return null;
  await dbConnect();
  const doc = await Household.findOne({ "members.userId": userId }).lean<HouseholdDoc>();
  return doc ? toMembership(doc, userId) : null;
}

export async function requireMembership(userId: string): Promise<Membership> {
  const membership = await getMembership(userId);
  if (!membership) throw new ForbiddenError("Create or join a household first.");
  return membership;
}

export async function requireOwner(userId: string): Promise<Membership> {
  const membership = await requireMembership(userId);
  if (membership.role !== "OWNER") {
    throw new ForbiddenError("Only the household owner can do this.");
  }
  return membership;
}

/** Suggested starting allotments, offered when a household is created. */
export function defaultAllotments(ownerName: string): string[] {
  const firstName = ownerName.trim().split(/\s+/)[0] || "Me";
  return [
    "Household",
    "Food & Groceries",
    "Transport",
    "Bills",
    `Personal - ${firstName}`,
    "Personal - Spouse",
    "Entertainment",
    "Medical",
    "Savings",
    "Miscellaneous",
  ];
}

export async function createHousehold(userId: string, input: unknown): Promise<HouseholdInfo> {
  const parsed = createHouseholdSchema.safeParse(input);
  if (!parsed.success) throw new AppError("Please fix the highlighted fields.", fieldErrorsOf(parsed.error));

  await dbConnect();
  const user = await User.findById(userId).lean();
  if (!user) throw new ForbiddenError("Please log in to continue.");
  if (await getMembership(userId)) throw new AppError("You already belong to a household.");

  let household;
  try {
    household = await Household.create({
      name: parsed.data.name,
      ownerId: user._id,
      members: [{ userId: user._id, role: "OWNER", joinedAt: new Date() }],
    });
  } catch (err) {
    // The unique index on members.userId catches a concurrent double-create.
    if (isDuplicateKeyError(err)) throw new AppError("You already belong to a household.");
    throw err;
  }

  if (parsed.data.useDefaultAllotments) {
    await Allotment.insertMany(
      defaultAllotments(user.name).map((name, i) => ({ name, householdId: household._id, sortOrder: i })),
    );
  }

  return toMembership(household.toObject(), userId).household;
}

export async function updateHouseholdSettings(userId: string, input: unknown): Promise<void> {
  const { householdId } = await requireOwner(userId);
  const parsed = householdSettingsSchema.safeParse(input);
  if (!parsed.success) throw new AppError("Please fix the highlighted fields.", fieldErrorsOf(parsed.error));
  await Household.updateOne({ _id: householdId }, { $set: parsed.data });
}

export async function listMembers(userId: string): Promise<Member[]> {
  const { householdId } = await requireMembership(userId);
  const doc = await Household.findById(householdId).lean<HouseholdDoc>();
  if (!doc) return [];
  const users = await User.find({ _id: { $in: doc.members.map((m) => m.userId) } }).lean();
  const byId = new Map(users.map((u) => [u._id.toString(), u]));
  return doc.members.flatMap((m) => {
    const u = byId.get(m.userId.toString());
    return u ? [{ id: u._id.toString(), name: u.name, email: u.email, role: m.role as HouseholdRole }] : [];
  });
}

export async function removeMember(ownerUserId: string, memberUserId: string): Promise<void> {
  const { householdId } = await requireOwner(ownerUserId);
  if (ownerUserId === memberUserId) throw new AppError("The owner can't be removed from the household.");
  if (!Types.ObjectId.isValid(memberUserId)) throw new AppError("That member doesn't exist.");

  const result = await Household.updateOne(
    { _id: householdId, members: { $elemMatch: { userId: memberUserId, role: "MEMBER" } } },
    { $pull: { members: { userId: new Types.ObjectId(memberUserId) } } },
  );
  if (result.modifiedCount === 0) throw new AppError("That member isn't part of your household.");
}
