import { cardClass, cn } from "@/components/ui/styles";
import type { MonthTotals } from "@/lib/budget-math";
import { formatMoney } from "@/lib/money";

export function MonthSummary({ totals, currency }: { totals: MonthTotals; currency: string }) {
  const stats = [
    { label: "Income", value: totals.income },
    { label: "Allocated", value: totals.allocated },
    { label: "Spent", value: totals.spent },
    { label: "Unallocated", value: totals.unallocated, negativeIsBad: true },
  ];

  return (
    <section aria-label="Month summary" className={cn(cardClass, "p-5")}>
      <p className="text-sm text-muted">Remaining this month</p>
      <p className={cn("tabular text-3xl font-bold tracking-tight md:text-4xl", totals.remaining < 0 && "text-danger")}>
        {formatMoney(totals.remaining, currency)}
      </p>
      <dl className="tabular mt-4 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label}>
            <dt className="text-xs text-muted">{s.label}</dt>
            <dd className={cn("font-semibold", s.negativeIsBad && s.value < 0 && "text-danger")}>
              {formatMoney(s.value, currency)}
            </dd>
          </div>
        ))}
      </dl>
      {totals.unallocated < 0 && (
        <p className="mt-3 rounded-xl bg-danger-soft px-3 py-2 text-sm font-medium text-danger">
          ⚠ You have allocated {formatMoney(-totals.unallocated, currency)} more than your income.
        </p>
      )}
    </section>
  );
}
