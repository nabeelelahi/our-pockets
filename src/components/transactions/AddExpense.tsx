"use client";

import { useEffect, useRef, useState } from "react";
import { createTransactionAction } from "@/actions/transactions";
import { Alert } from "@/components/ui/Alert";
import { CloseIcon, PlusIcon } from "@/components/ui/icons";
import { buttonClass } from "@/components/ui/styles";
import { useServerForm } from "@/components/ui/useServerForm";
import { formatMoney } from "@/lib/money";
import { TransactionFields, type AllotmentOption, type MemberOption } from "./TransactionFields";

type Toast = { text: string; over: boolean };

export function AddExpense({
  allotments,
  members,
  currentUserId,
  defaultAllotmentId,
  today,
  currency,
}: {
  allotments: AllotmentOption[];
  members: MemberOption[];
  currentUserId: string;
  /** Last-used allotment, or the allotment page being viewed. */
  defaultAllotmentId?: string;
  today: string;
  currency: string;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  // Remounting the form (new key) resets every field to its defaults.
  const [formKey, setFormKey] = useState(0);
  const [lastAllotmentId, setLastAllotmentId] = useState(defaultAllotmentId);
  const [toast, setToast] = useState<Toast | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const { result, setResult, pending, onSubmit, fieldErrors } = useServerForm(createTransactionAction, {
    onSuccess: (res, form) => {
      const { allotment, allotmentName } = res.data;
      setLastAllotmentId(String(new FormData(form).get("allotmentId")));
      setToast({
        over: allotment.remaining < 0,
        text:
          allotment.remaining < 0
            ? `Saved. ${allotmentName} is over by ${formatMoney(allotment.overBy, currency)}.`
            : `Saved. You now have ${formatMoney(allotment.remaining, currency)} left in ${allotmentName}.`,
      });
      clearTimeout(toastTimer.current);
      toastTimer.current = setTimeout(() => setToast(null), 5000);
      close();
    },
  });

  // Focus the amount once the freshly mounted form is in the open dialog.
  useEffect(() => {
    if (formKey > 0) document.getElementById("add-amount")?.focus();
  }, [formKey]);

  function show() {
    setResult(null);
    setFormKey((k) => k + 1);
    dialogRef.current?.showModal();
  }

  function close() {
    dialogRef.current?.close();
  }

  const disabled = allotments.length === 0;

  return (
    <>
      <button
        type="button"
        onClick={show}
        disabled={disabled}
        title={disabled ? "Create an allotment first" : undefined}
        className={buttonClass(
          "primary",
          "fixed right-4 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-40 h-14 rounded-full px-5 shadow-lg md:static md:h-11 md:rounded-xl md:shadow-none",
        )}
      >
        <PlusIcon />
        Add Expense
      </button>

      {toast && (
        <div
          role="status"
          className="fixed inset-x-4 top-4 z-50 mx-auto max-w-md rounded-2xl border border-border bg-card p-4 text-sm font-medium shadow-lg"
        >
          <span aria-hidden="true" className="mr-1">
            {toast.over ? "⚠" : "✓"}
          </span>
          {toast.text}
        </div>
      )}

      <dialog
        ref={dialogRef}
        aria-labelledby="add-expense-title"
        className="m-0 mt-auto max-h-[92dvh] w-full max-w-none rounded-t-3xl border border-border bg-card p-0 text-fg sm:m-auto sm:max-w-md sm:rounded-3xl"
      >
          <form key={formKey} onSubmit={onSubmit} noValidate className="space-y-4 p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))]">
            <div className="flex items-center justify-between">
              <h2 id="add-expense-title" className="text-lg font-semibold">
                Add expense
              </h2>
              <button type="button" onClick={close} aria-label="Close" className={buttonClass("ghost", "w-11 px-0")}>
                <CloseIcon />
              </button>
            </div>
            {result && !result.ok && <Alert>{result.error}</Alert>}
            <TransactionFields
              idPrefix="add"
              allotments={allotments}
              members={members}
              currency={currency}
              fieldErrors={fieldErrors}
              defaults={{
                allotmentId: allotments.some((a) => a.id === lastAllotmentId) ? lastAllotmentId : undefined,
                paidByUserId: currentUserId,
                transactionDate: today,
              }}
            />
            <button type="submit" disabled={pending} className={buttonClass("primary", "h-12 w-full text-base")}>
              {pending ? "Saving…" : "Add Expense"}
            </button>
          </form>
      </dialog>
    </>
  );
}
