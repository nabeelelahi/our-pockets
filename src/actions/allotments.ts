"use server";

import { revalidatePath } from "next/cache";
import { formString, runAction, type ActionResult } from "@/lib/action-result";
import { requireUserId } from "@/lib/auth/session";
import {
  createAllotment,
  deleteOrArchiveAllotment,
  moveAllotment,
  renameAllotment,
  setAllotmentArchived,
  type AllotmentInfo,
} from "@/services/allotment.service";

export async function createAllotmentAction(formData: FormData): Promise<ActionResult<AllotmentInfo>> {
  return runAction(async () => {
    const allotment = await createAllotment(await requireUserId(), { name: formString(formData, "name") });
    revalidatePath("/", "layout");
    return allotment;
  }, "Allotment added.");
}

export async function renameAllotmentAction(allotmentId: string, formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    await renameAllotment(await requireUserId(), allotmentId, { name: formString(formData, "name") });
    revalidatePath("/", "layout");
  }, "Allotment renamed.");
}

export async function moveAllotmentAction(allotmentId: string, direction: "up" | "down"): Promise<ActionResult> {
  return runAction(async () => {
    await moveAllotment(await requireUserId(), allotmentId, direction === "up" ? "up" : "down");
    revalidatePath("/", "layout");
  });
}

export async function setAllotmentArchivedAction(allotmentId: string, archived: boolean): Promise<ActionResult> {
  return runAction(async () => {
    await setAllotmentArchived(await requireUserId(), allotmentId, archived === true);
    revalidatePath("/", "layout");
  }, archived ? "Allotment archived." : "Allotment restored.");
}

export async function deleteOrArchiveAllotmentAction(
  allotmentId: string,
): Promise<ActionResult<{ outcome: "deleted" | "archived" }>> {
  const result = await runAction(async () => ({
    outcome: await deleteOrArchiveAllotment(await requireUserId(), allotmentId),
  }));
  if (!result.ok) return result;
  revalidatePath("/", "layout");
  return {
    ...result,
    message:
      result.data.outcome === "deleted"
        ? "Allotment deleted."
        : "This allotment has expenses, so it was archived to keep your history.",
  };
}
