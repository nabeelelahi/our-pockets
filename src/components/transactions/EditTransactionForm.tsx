"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteTransactionAction, updateTransactionAction } from "@/actions/transactions";
import { Alert } from "@/components/ui/Alert";
import { buttonClass } from "@/components/ui/styles";
import { useServerForm } from "@/components/ui/useServerForm";
import { monthOf } from "@/lib/dates";
import type { TransactionView } from "@/services/transaction.service";
import { TransactionFields, type CategoryOption, type MemberOption } from "./TransactionFields";

export function EditTransactionForm({
  transaction,
  categories,
  members,
  currency,
}: {
  transaction: TransactionView;
  categories: CategoryOption[];
  members: MemberOption[];
  currency: string;
}) {
  const router = useRouter();
  const [deleting, startDelete] = useTransition();
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const { result, pending, onSubmit, fieldErrors } = useServerForm(
    (formData) => updateTransactionAction(transaction.id, formData),
    { onSuccess: (res) => router.push(`/transactions?m=${res.data.month}`) },
  );

  function onDelete() {
    if (!window.confirm("Delete this expense? The amount goes back to its category.")) return;
    startDelete(async () => {
      const res = await deleteTransactionAction(transaction.id);
      if (res.ok) router.push(`/transactions?m=${monthOf(transaction.transactionDate)}`);
      else setDeleteError(res.error);
    });
  }

  const busy = pending || deleting;

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      {result && !result.ok && <Alert>{result.error}</Alert>}
      {deleteError && <Alert>{deleteError}</Alert>}
      <TransactionFields
        idPrefix="edit"
        categories={categories}
        members={members}
        currency={currency}
        fieldErrors={fieldErrors}
        defaults={{
          amount: transaction.amount,
          categoryId: transaction.categoryId,
          description: transaction.description,
          paidByUserId: transaction.paidByUserId,
          transactionDate: transaction.transactionDate,
        }}
      />
      <button type="submit" disabled={busy} className={buttonClass("primary", "h-12 w-full text-base")}>
        {pending ? "Saving…" : "Save changes"}
      </button>
      <button type="button" onClick={onDelete} disabled={busy} className={buttonClass("danger", "w-full")}>
        {deleting ? "Deleting…" : "Delete expense"}
      </button>
    </form>
  );
}
