"use server";

import { revalidatePath } from "next/cache";
import { formString, runAction, type ActionResult } from "@/lib/action-result";
import { requireUserId } from "@/lib/auth/session";
import {
  createHousehold,
  removeMember,
  updateHouseholdSettings,
} from "@/services/household.service";
import { acceptInvitation, createInvitation, revokeInvitations } from "@/services/invitation.service";

export async function createHouseholdAction(formData: FormData): Promise<ActionResult<{ redirectTo: string }>> {
  return runAction(async () => {
    await createHousehold(await requireUserId(), {
      name: formString(formData, "name"),
      useDefaultCategories: formData.get("useDefaultCategories") === "on",
    });
    revalidatePath("/", "layout");
    return { redirectTo: "/welcome" };
  });
}

export async function updateHouseholdAction(formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    await updateHouseholdSettings(await requireUserId(), {
      name: formString(formData, "name"),
      currency: formString(formData, "currency"),
      timezone: formString(formData, "timezone"),
    });
    revalidatePath("/", "layout");
  }, "Household saved.");
}

export async function createInvitationAction(): Promise<ActionResult<{ token: string; expiresAt: string }>> {
  return runAction(async () => {
    const { token, expiresAt } = await createInvitation(await requireUserId());
    return { token, expiresAt: expiresAt.toISOString() };
  });
}

export async function revokeInvitationsAction(): Promise<ActionResult> {
  return runAction(async () => {
    await revokeInvitations(await requireUserId());
  }, "Invitation link disabled.");
}

export async function acceptInvitationAction(token: string): Promise<ActionResult<{ redirectTo: string }>> {
  return runAction(async () => {
    await acceptInvitation(await requireUserId(), token);
    revalidatePath("/", "layout");
    return { redirectTo: "/" };
  });
}

export async function removeMemberAction(memberUserId: string): Promise<ActionResult> {
  return runAction(async () => {
    await removeMember(await requireUserId(), memberUserId);
    revalidatePath("/", "layout");
  }, "Member removed.");
}
