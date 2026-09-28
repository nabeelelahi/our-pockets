"use client";

import { useState, useTransition } from "react";
import { copyPreviousBudgetAction, saveBudgetAction } from "@/actions/budget";
import { Alert } from "@/components/ui/Alert";
import { buttonClass, cardClass, cn, inputClass } from "@/components/ui/styles";
import { useServerForm } from "@/components/ui/useServerForm";
import { formatMonthLabel } from "@/lib/dates";
import { formatAmount, formatMoney, parseWholeAmount } from "@/lib/money";

type Row = { id: string; name: string; icon: string; type: string; allocated: number; spent: number };

/** Live preview only; the server recomputes and validates everything. */
const preview = (value: string) => parseWholeAmount(value.trim() === "" ? "0" : value) ?? 0;

export function BudgetForm({
  month,
  currency,
  hasBudget,
  previousMonth,
  income,
  categories,
}: {
  month: string;
  currency: string;
  hasBudget: boolean;
  previousMonth: string | null;
  income: number;
  categories: Row[];
}) {
  const [incomeText, setIncomeText] = useState(income ? formatAmount(income) : "");
  const [allocations, setAllocations] = useState<Record<string, string>>(() =>
    Object.fromEntries(categories.map((c) => [c.id, c.allocated ? formatAmount(c.allocated) : ""])),
  );
  const [copying, startCopy] = useTransition();
  const [copyResult, setCopyResult] = useState<{ ok: boolean; text: string } | null>(null);

  const { result, pending, onSubmit } = useServerForm(saveBudgetAction);

  const totalIncome = preview(incomeText);
  const allocated = categories.reduce((sum, c) => sum + preview(allocations[c.id] ?? ""), 0);
  const unallocated = totalIncome - allocated;

  function copyPrevious() {
    if (!previousMonth) return;
    if (hasBudget && !window.confirm(`Replace this month's income and allocations with ${formatMonthLabel(previousMonth)}'s?`)) {
      return;
    }
    startCopy(async () => {
      const res = await copyPreviousBudgetAction(month);
      if (!res.ok) {
        setCopyResult({ ok: false, text: res.error });
        return;
      }
      const { totalIncome: copiedIncome, allocations: copied } = res.data;
      setIncomeText(copiedIncome ? formatAmount(copiedIncome) : "");
      setAllocations(
        Object.fromEntries(categories.map((c) => [c.id, copied[c.id] ? formatAmount(copied[c.id]) : ""])),
      );
      setCopyResult({ ok: true, text: res.message ?? "Copied." });
    });
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <input type="hidden" name="month" value={month} />

      {!hasBudget && (
        <div className={cn(cardClass, "p-4")}>
          <p className="font-medium">Set up your {formatMonthLabel(month)} budget.</p>
          <p className="text-sm text-muted">Enter your income, then split it across your categories.</p>
        </div>
      )}

      {previousMonth && (
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" onClick={copyPrevious} disabled={copying} className={buttonClass("secondary")}>
            {copying ? "Copying…" : `Copy from ${formatMonthLabel(previousMonth)}`}
          </button>
          <span className="text-xs text-muted">Copies income and allocations. Unspent money does not roll over.</span>
        </div>
      )}
      {copyResult && <Alert tone={copyResult.ok ? "success" : "error"}>{copyResult.text}</Alert>}

      <section className={cn(cardClass, "p-4")}>
        <label htmlFor="totalIncome" className="block text-sm font-medium">
          Monthly income ({currency})
        </label>
        <input
          id="totalIncome"
          name="totalIncome"
          inputMode="numeric"
          pattern="[0-9,]*"
          autoComplete="off"
          placeholder="0"
          value={incomeText}
          onChange={(e) => setIncomeText(e.target.value)}
          className={cn(inputClass, "tabular mt-1.5 h-14 text-2xl font-semibold")}
        />
      </section>

      <section aria-labelledby="alloc-heading" className={cn(cardClass, "divide-y divide-border")}>
        <h2 id="alloc-heading" className="px-4 py-3 text-sm font-semibold text-muted">
          Allocations
        </h2>
        {categories.map((c) => (
          <div key={c.id} className="flex items-center gap-3 px-4 py-2.5">
            <label htmlFor={`alloc-${c.id}`} className="min-w-0 flex-1">
              <span className="block truncate font-medium">
                {c.icon && <span aria-hidden="true" className="mr-1.5">{c.icon}</span>}
                {c.name}
              </span>
              {c.spent > 0 && (
                <span className="tabular block text-xs text-muted">Spent {formatMoney(c.spent, currency)}</span>
              )}
            </label>
            <input
              id={`alloc-${c.id}`}
              name={`alloc:${c.id}`}
              inputMode="numeric"
              pattern="[0-9,]*"
              autoComplete="off"
              placeholder="0"
              value={allocations[c.id] ?? ""}
              onChange={(e) => setAllocations((prev) => ({ ...prev, [c.id]: e.target.value }))}
              className={cn(inputClass, "tabular w-36 text-right font-medium")}
            />
          </div>
        ))}
      </section>

      <section
        aria-label="Allocation totals"
        className={cn(cardClass, "tabular sticky bottom-[calc(4.5rem+env(safe-area-inset-bottom))] space-y-2 p-4 shadow-sm md:bottom-4")}
      >
        <div className="flex justify-between text-sm">
          <span className="text-muted">Allocated</span>
          <span className="font-semibold">{formatMoney(allocated, currency)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted">Unallocated</span>
          <span className={cn("font-semibold", unallocated < 0 && "text-danger")}>{formatMoney(unallocated, currency)}</span>
        </div>
        {unallocated < 0 && (
          <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm font-medium text-danger">
            ⚠ You have allocated {formatMoney(-unallocated, currency)} more than your income.
          </p>
        )}
        {result && <Alert tone={result.ok ? "success" : "error"}>{result.ok ? result.message : result.error}</Alert>}
        <button type="submit" disabled={pending} className={buttonClass("primary", "w-full")}>
          {pending ? "Saving…" : "Save budget"}
        </button>
      </section>
    </form>
  );
}
