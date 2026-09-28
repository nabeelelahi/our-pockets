"use client";

import { useState, useTransition } from "react";
import { createIncomeAction, deleteIncomeAction, updateIncomeAction } from "@/actions/income";
import { Alert } from "@/components/ui/Alert";
import { Field, fieldAria } from "@/components/ui/Field";
import { PlusIcon, TrashIcon } from "@/components/ui/icons";
import { buttonClass, cardClass, cn, inputClass } from "@/components/ui/styles";
import { useServerForm } from "@/components/ui/useServerForm";
import { formatDateLabel } from "@/lib/dates";
import { formatMoney, sumAmounts } from "@/lib/money";
import type { IncomeView } from "@/services/income.service";

type Member = { id: string; name: string };

function IncomeFields({
  idPrefix,
  members,
  defaults,
  currency,
  fieldErrors,
}: {
  idPrefix: string;
  members: Member[];
  defaults: { amount?: number; source?: string; receivedByUserId: string; receivedDate: string };
  currency: string;
  fieldErrors: Record<string, string[]>;
}) {
  const id = (name: string) => `${idPrefix}-${name}`;
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Field id={id("amount")} label={`Amount (${currency})`} error={fieldErrors.amount}>
        <input
          {...fieldAria(id("amount"), fieldErrors.amount)}
          name="amount"
          inputMode="numeric"
          pattern="[0-9,]*"
          autoComplete="off"
          placeholder="0"
          defaultValue={defaults.amount ?? ""}
          required
          className={cn(inputClass, "tabular font-semibold")}
        />
      </Field>
      <Field id={id("source")} label="Source (optional)" error={fieldErrors.source}>
        <input
          {...fieldAria(id("source"), fieldErrors.source)}
          name="source"
          maxLength={60}
          placeholder="e.g. Salary"
          defaultValue={defaults.source ?? ""}
          className={inputClass}
        />
      </Field>
      <Field id={id("by")} label="Received by" error={fieldErrors.receivedByUserId}>
        <select
          {...fieldAria(id("by"), fieldErrors.receivedByUserId)}
          name="receivedByUserId"
          defaultValue={defaults.receivedByUserId}
          className={inputClass}
        >
          {members.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
      </Field>
      <Field id={id("date")} label="Date" error={fieldErrors.receivedDate}>
        <input
          {...fieldAria(id("date"), fieldErrors.receivedDate)}
          name="receivedDate"
          type="date"
          defaultValue={defaults.receivedDate}
          required
          className={inputClass}
        />
      </Field>
    </div>
  );
}

function IncomeRow({
  income,
  members,
  currency,
  today,
}: {
  income: IncomeView;
  members: Member[];
  currency: string;
  today: string;
}) {
  const [editing, setEditing] = useState(false);
  const [deleting, startDelete] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const form = useServerForm((fd) => updateIncomeAction(income.id, fd), { onSuccess: () => setEditing(false) });
  const memberOptions = members.some((m) => m.id === income.receivedByUserId)
    ? members
    : [...members, { id: income.receivedByUserId, name: income.receivedByName }];

  function remove() {
    if (!window.confirm(`Delete this income of ${formatMoney(income.amount, currency)}?`)) return;
    startDelete(async () => {
      const res = await deleteIncomeAction(income.id);
      if (!res.ok) setError(res.error);
    });
  }

  if (editing) {
    return (
      <li className="p-4">
        <form onSubmit={form.onSubmit} noValidate className="space-y-3">
          {form.result && !form.result.ok && <Alert>{form.result.error}</Alert>}
          <IncomeFields
            idPrefix={`income-${income.id}`}
            members={memberOptions}
            currency={currency}
            fieldErrors={form.fieldErrors}
            defaults={income}
          />
          <div className="flex gap-2">
            <button type="submit" disabled={form.pending} className={buttonClass("primary")}>
              {form.pending ? "Saving…" : "Save"}
            </button>
            <button type="button" onClick={() => setEditing(false)} className={buttonClass("ghost")}>
              Cancel
            </button>
          </div>
        </form>
      </li>
    );
  }

  return (
    <li className="px-4 py-3">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="flex min-w-0 flex-1 items-center gap-3 text-left"
          aria-label={`Edit income ${formatMoney(income.amount, currency)} ${income.source}`}
        >
          <span className="min-w-0 flex-1">
            <span className="block truncate font-medium">{income.source || "Income"}</span>
            <span className="block truncate text-sm text-muted">
              {formatDateLabel(income.receivedDate, today)} · {income.receivedByName}
            </span>
          </span>
          <span className="tabular shrink-0 font-semibold text-accent">+{formatMoney(income.amount, currency)}</span>
        </button>
        <button
          type="button"
          onClick={remove}
          disabled={deleting}
          aria-label={`Delete income ${income.source || formatMoney(income.amount, currency)}`}
          className="flex h-11 w-10 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-danger-soft hover:text-danger disabled:opacity-40"
        >
          <TrashIcon width={18} height={18} />
        </button>
      </div>
      {error && <Alert className="mt-2">{error}</Alert>}
    </li>
  );
}

export function IncomeSection({
  incomes,
  members,
  currentUserId,
  defaultDate,
  today,
  currency,
}: {
  incomes: IncomeView[];
  members: Member[];
  currentUserId: string;
  /** Today if viewing the current month, otherwise the 1st of the viewed month. */
  defaultDate: string;
  today: string;
  currency: string;
}) {
  const [adding, setAdding] = useState(incomes.length === 0);
  const [formKey, setFormKey] = useState(0);
  const { result, pending, onSubmit, fieldErrors } = useServerForm(createIncomeAction, {
    onSuccess: () => setFormKey((k) => k + 1),
  });

  return (
    <section id="money-in" aria-labelledby="money-in-heading" className={cn(cardClass, "scroll-mt-20")}>
      <div className="flex items-baseline justify-between px-4 py-3">
        <h2 id="money-in-heading" className="font-semibold">
          <span aria-hidden="true" className="mr-1 text-accent">↓</span>Money in
        </h2>
        <span className="tabular font-semibold">{formatMoney(sumAmounts(incomes.map((i) => i.amount)), currency)}</span>
      </div>

      {incomes.length > 0 && (
        <ul className="divide-y divide-border border-t border-border">
          {incomes.map((income) => (
            <IncomeRow key={income.id} income={income} members={members} currency={currency} today={today} />
          ))}
        </ul>
      )}

      <div className="border-t border-border bg-card-muted/50 p-4">
        {adding ? (
          <form key={formKey} onSubmit={onSubmit} noValidate className="space-y-3">
            <p className="text-sm font-medium">Add money in</p>
            <IncomeFields
              idPrefix="new-income"
              members={members}
              currency={currency}
              fieldErrors={fieldErrors}
              defaults={{ receivedByUserId: currentUserId, receivedDate: defaultDate }}
            />
            {result && <Alert tone={result.ok ? "success" : "error"}>{result.ok ? result.message : result.error}</Alert>}
            <div className="flex gap-2">
              <button type="submit" disabled={pending} className={buttonClass("primary")}>
                {pending ? "Adding…" : "Add income"}
              </button>
              {incomes.length > 0 && (
                <button type="button" onClick={() => setAdding(false)} className={buttonClass("ghost")}>
                  Done
                </button>
              )}
            </div>
          </form>
        ) : (
          <button type="button" onClick={() => setAdding(true)} className={buttonClass("secondary")}>
            <PlusIcon width={18} height={18} /> Add money in
          </button>
        )}
      </div>
    </section>
  );
}
