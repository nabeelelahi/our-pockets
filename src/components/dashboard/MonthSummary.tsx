import Link from "next/link";
import { cardClass, cn } from "@/components/ui/styles";
import type { MonthTotals } from "@/lib/budget-math";
import { formatMoney } from "@/lib/money";

export function MonthSummary({
  totals,
  currency,
  budgetHref,
}: {
  totals: MonthTotals;
  currency: string;
  budgetHref: string;
}) {
  return (
    <section aria-label="Month summary" className={cn(cardClass, "p-5")}>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-sm text-muted">
            <span aria-hidden="true" className="mr-1 text-accent">↓</span>Money in
          </p>
          <p className="tabular text-2xl font-bold tracking-tight md:text-3xl">{formatMoney(totals.moneyIn, currency)}</p>
        </div>
        <div>
          <p className="text-sm text-muted">
            <span aria-hidden="true" className="mr-1 text-danger">↑</span>Money out
          </p>
          <p className="tabular text-2xl font-bold tracking-tight md:text-3xl">{formatMoney(totals.moneyOut, currency)}</p>
        </div>
      </div>

      <dl className="tabular mt-4 grid grid-cols-3 gap-3 border-t border-border pt-4 text-sm">
        <div>
          <dt className="text-xs text-muted">Balance</dt>
          <dd className={cn("font-semibold", totals.balance < 0 && "text-danger")}>
            {formatMoney(totals.balance, currency)}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted">Allotted</dt>
          <dd className="font-semibold">{formatMoney(totals.allotted, currency)}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted">Not allotted</dt>
          <dd className={cn("font-semibold", totals.unallotted < 0 && "text-danger")}>
            {formatMoney(totals.unallotted, currency)}
          </dd>
        </div>
      </dl>

      {totals.moneyIn === 0 ? (
        <p className="mt-3 text-sm text-muted">
          No money in recorded yet.{" "}
          <Link href={`${budgetHref}#money-in`} className="font-medium text-accent">
            Add income
          </Link>
        </p>
      ) : (
        totals.unallotted < 0 && (
          <p className="mt-3 rounded-xl bg-danger-soft px-3 py-2 text-sm font-medium text-danger">
            ⚠ You have allotted {formatMoney(-totals.unallotted, currency)} more than came in.
          </p>
        )
      )}
    </section>
  );
}
