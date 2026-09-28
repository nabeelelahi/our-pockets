"use server";

import { revalidatePath } from "next/cache";
import { formString, runAction, type ActionResult } from "@/lib/action-result";
import { requireUserId } from "@/lib/auth/session";
import { createIncome, deleteIncome, updateIncome } from "@/services/income.service";

function incomeInput(formData: FormData) {
  return {
    amount: formString(formData, "amount"),
    source: formString(formData, "source"),
    receivedByUserId: formString(formData, "receivedByUserId"),
    receivedDate: formString(formData, "receivedDate"),
  };
}

export async function createIncomeAction(formData: FormData): Promise<ActionResult<{ month: string }>> {
  return runAction(async () => {
    const { month } = await createIncome(await requireUserId(), incomeInput(formData));
    revalidatePath("/", "layout");
    return { month };
  }, "Income added.");
}

export async function updateIncomeAction(incomeId: string, formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    await updateIncome(await requireUserId(), incomeId, incomeInput(formData));
    revalidatePath("/", "layout");
  }, "Income updated.");
}

export async function deleteIncomeAction(incomeId: string): Promise<ActionResult> {
  return runAction(async () => {
    await deleteIncome(await requireUserId(), incomeId);
    revalidatePath("/", "layout");
  }, "Income deleted.");
}
