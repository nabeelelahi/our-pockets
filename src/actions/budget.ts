"use server";

import { revalidatePath } from "next/cache";
import { formString, runAction, type ActionResult } from "@/lib/action-result";
import { requireUserId } from "@/lib/auth/session";
import { formatMonthLabel } from "@/lib/dates";
import { copyPreviousBudget, saveBudget, type CopiedBudget } from "@/services/budget.service";

/** Allotted-amount inputs are named "alloc:<allotmentId>". */
export async function saveBudgetAction(formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const allocations: { allotmentId: string; allocatedAmount: string }[] = [];
    for (const [key, value] of formData.entries()) {
      if (key.startsWith("alloc:") && typeof value === "string") {
        allocations.push({ allotmentId: key.slice("alloc:".length), allocatedAmount: value });
      }
    }
    await saveBudget(await requireUserId(), { month: formString(formData, "month"), allocations });
    revalidatePath("/", "layout");
  }, "Allotments saved.");
}

export async function copyPreviousBudgetAction(month: string): Promise<ActionResult<CopiedBudget>> {
  const result = await runAction(async () => copyPreviousBudget(await requireUserId(), month));
  if (!result.ok) return result;
  revalidatePath("/", "layout");
  return { ...result, message: `Copied allotments from ${formatMonthLabel(result.data.fromMonth)}.` };
}
