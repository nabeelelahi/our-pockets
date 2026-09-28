"use server";

import { revalidatePath } from "next/cache";
import { formString, runAction, type ActionResult } from "@/lib/action-result";
import { requireUserId } from "@/lib/auth/session";
import {
  createTransaction,
  deleteTransaction,
  updateTransaction,
  type SavedTransaction,
} from "@/services/transaction.service";

function transactionInput(formData: FormData) {
  return {
    amount: formString(formData, "amount"),
    allotmentId: formString(formData, "allotmentId"),
    description: formString(formData, "description"),
    paidByUserId: formString(formData, "paidByUserId"),
    transactionDate: formString(formData, "transactionDate"),
  };
}

export async function createTransactionAction(formData: FormData): Promise<ActionResult<SavedTransaction>> {
  return runAction(async () => {
    const saved = await createTransaction(await requireUserId(), transactionInput(formData));
    revalidatePath("/", "layout");
    return saved;
  });
}

export async function updateTransactionAction(
  transactionId: string,
  formData: FormData,
): Promise<ActionResult<SavedTransaction>> {
  return runAction(async () => {
    const saved = await updateTransaction(await requireUserId(), transactionId, transactionInput(formData));
    revalidatePath("/", "layout");
    return saved;
  });
}

export async function deleteTransactionAction(transactionId: string): Promise<ActionResult> {
  return runAction(async () => {
    await deleteTransaction(await requireUserId(), transactionId);
    revalidatePath("/", "layout");
  }, "Expense deleted.");
}
