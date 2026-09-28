"use client";

import { Field, fieldAria } from "@/components/ui/Field";
import { inputClass } from "@/components/ui/styles";

export type CategoryOption = { id: string; name: string; icon: string; isArchived?: boolean };
export type MemberOption = { id: string; name: string };

export type TransactionDefaults = {
  amount?: number;
  categoryId?: string;
  description?: string;
  paidByUserId: string;
  transactionDate: string;
};

export function TransactionFields({
  idPrefix,
  categories,
  members,
  defaults,
  currency,
  fieldErrors,
  autoFocusAmount,
}: {
  idPrefix: string;
  categories: CategoryOption[];
  members: MemberOption[];
  defaults: TransactionDefaults;
  currency: string;
  fieldErrors: Record<string, string[]>;
  autoFocusAmount?: boolean;
}) {
  const id = (name: string) => `${idPrefix}-${name}`;

  return (
    <div className="space-y-4">
      <Field id={id("amount")} label={`Amount (${currency})`} error={fieldErrors.amount}>
        <input
          {...fieldAria(id("amount"), fieldErrors.amount)}
          name="amount"
          inputMode="numeric"
          pattern="[0-9,]*"
          autoComplete="off"
          placeholder="0"
          defaultValue={defaults.amount ?? ""}
          autoFocus={autoFocusAmount}
          required
          className={`${inputClass} tabular h-14 text-2xl font-semibold`}
        />
      </Field>

      <Field id={id("category")} label="Category" error={fieldErrors.categoryId}>
        <select
          {...fieldAria(id("category"), fieldErrors.categoryId)}
          name="categoryId"
          defaultValue={defaults.categoryId ?? ""}
          required
          className={inputClass}
        >
          <option value="" disabled>
            Choose a category
          </option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.icon ? `${c.icon} ` : ""}
              {c.name}
              {c.isArchived ? " (archived)" : ""}
            </option>
          ))}
        </select>
      </Field>

      <Field id={id("description")} label="Description (optional)" error={fieldErrors.description}>
        <input
          {...fieldAria(id("description"), fieldErrors.description)}
          name="description"
          maxLength={140}
          placeholder="e.g. Dinner"
          defaultValue={defaults.description ?? ""}
          className={inputClass}
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field id={id("paidBy")} label="Paid by" error={fieldErrors.paidByUserId}>
          <select
            {...fieldAria(id("paidBy"), fieldErrors.paidByUserId)}
            name="paidByUserId"
            defaultValue={defaults.paidByUserId}
            className={inputClass}
          >
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </Field>
        <Field id={id("date")} label="Date" error={fieldErrors.transactionDate}>
          <input
            {...fieldAria(id("date"), fieldErrors.transactionDate)}
            name="transactionDate"
            type="date"
            defaultValue={defaults.transactionDate}
            required
            className={inputClass}
          />
        </Field>
      </div>
    </div>
  );
}
