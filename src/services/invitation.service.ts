import { createHash, randomBytes } from "node:crypto";
import { dbConnect } from "@/lib/db";
import { AppError, isDuplicateKeyError } from "@/lib/errors";
import { invitationTokenSchema } from "@/lib/validation";
import { Household, MAX_HOUSEHOLD_MEMBERS } from "@/models/Household";
import { Invitation } from "@/models/Invitation";
import { User } from "@/models/User";
import { getMembership, requireOwner } from "./household.service";

export const INVITATION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export function hashInvitationToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function createInvitation(
  userId: string,
  now: Date = new Date(),
): Promise<{ token: string; expiresAt: Date }> {
  const { householdId, memberIds } = await requireOwner(userId);
  if (memberIds.length >= MAX_HOUSEHOLD_MEMBERS) {
    throw new AppError("Your household already has two members.");
  }

  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(now.getTime() + INVITATION_TTL_MS);

  // Only one open invitation at a time: creating a new link voids older ones.
  await Invitation.deleteMany({ householdId, acceptedAt: null });
  await Invitation.create({
    householdId,
    invitedByUserId: userId,
    tokenHash: hashInvitationToken(token),
    expiresAt,
  });
  return { token, expiresAt };
}

export async function revokeInvitations(userId: string): Promise<void> {
  const { householdId } = await requireOwner(userId);
  await Invitation.deleteMany({ householdId, acceptedAt: null });
}

export type InvitationPreview =
  | { status: "valid"; householdName: string; invitedByName: string; expiresAt: Date }
  | { status: "invalid" | "expired" | "used" | "full" };

/** Public preview for the invite page. Never exposes financial data. */
export async function previewInvitation(token: string, now: Date = new Date()): Promise<InvitationPreview> {
  if (!invitationTokenSchema.safeParse(token).success) return { status: "invalid" };
  await dbConnect();
  const invitation = await Invitation.findOne({ tokenHash: hashInvitationToken(token) }).lean();
  if (!invitation) return { status: "invalid" };
  if (invitation.acceptedAt) return { status: "used" };
  if (invitation.expiresAt <= now) return { status: "expired" };

  const household = await Household.findById(invitation.householdId).lean();
  if (!household) return { status: "invalid" };
  if (household.members.length >= MAX_HOUSEHOLD_MEMBERS) return { status: "full" };
  const inviter = await User.findById(invitation.invitedByUserId).lean();
  return {
    status: "valid",
    householdName: household.name,
    invitedByName: inviter?.name ?? "Your spouse",
    expiresAt: invitation.expiresAt,
  };
}

export async function acceptInvitation(userId: string, token: string, now: Date = new Date()): Promise<void> {
  if (!invitationTokenSchema.safeParse(token).success) throw new AppError("This invitation link is invalid.");
  await dbConnect();

  const invitation = await Invitation.findOne({ tokenHash: hashInvitationToken(token) }).lean();
  if (!invitation) throw new AppError("This invitation link is invalid.");
  if (invitation.acceptedAt) throw new AppError("This invitation has already been used.");
  if (invitation.expiresAt <= now) throw new AppError("This invitation has expired.");

  const existing = await getMembership(userId);
  if (existing) {
    throw new AppError(
      existing.householdId.equals(invitation.householdId)
        ? "You're already a member of this household."
        : "You already belong to a household.",
    );
  }

  // Claim the invitation atomically so it can only ever be used once.
  const claimed = await Invitation.findOneAndUpdate(
    { _id: invitation._id, acceptedAt: null, expiresAt: { $gt: now } },
    { $set: { acceptedAt: now, acceptedByUserId: userId } },
  );
  if (!claimed) throw new AppError("This invitation has already been used.");

  let joined = false;
  try {
    // Guarded update: only succeeds while the household still has room.
    const result = await Household.updateOne(
      {
        _id: invitation.householdId,
        [`members.${MAX_HOUSEHOLD_MEMBERS - 1}`]: { $exists: false },
        "members.userId": { $ne: userId },
      },
      { $push: { members: { userId, role: "MEMBER", joinedAt: now } } },
    );
    joined = result.modifiedCount === 1;
  } catch (err) {
    if (!isDuplicateKeyError(err)) throw err;
    // Joined another household concurrently.
  } finally {
    if (!joined) {
      await Invitation.updateOne(
        { _id: invitation._id },
        { $set: { acceptedAt: null, acceptedByUserId: null } },
      );
    }
  }
  if (!joined) throw new AppError("This household already has two members.");
}
