import Link from "next/link";
import { cardClass, cn } from "@/components/ui/styles";
import { formatMoney } from "@/lib/money";
import type { CategoryRow } from "@/services/budget.service";
import { ProgressBar } from "./ProgressBar";

/** Text badge so status never relies on colour alone. */
function StatusBadge({ row, currency }: { row: CategoryRow; currency: string }) {
  if (row.status === "over") {
    return (
      <span className="rounded-full bg-danger-soft px-2 py-0.5 text-xs font-semibold text-danger">
        ⚠ Over by {formatMoney(row.overBy, currency)}
      </span>
    );
  }
  if (row.status === "full") {
    return <span className="rounded-full bg-warn-soft px-2 py-0.5 text-xs font-semibold text-warn">Fully spent</span>;
  }
  if (row.status === "low") {
    return <span className="rounded-full bg-warn-soft px-2 py-0.5 text-xs font-semibold text-warn">Running low</span>;
  }
  return null;
}

export function CategoryCard({ row, currency, href }: { row: CategoryRow; currency: string; href: string }) {
  return (
    <Link href={href} className={cn(cardClass, "block p-4 transition hover:border-accent/50")}>
      <div className="mb-3 flex items-start justify-between gap-2">
        <h3 className="font-semibold">
          {row.icon && <span aria-hidden="true" className="mr-1.5">{row.icon}</span>}
          {row.name}
          {row.isArchived && <span className="ml-2 text-xs font-normal text-muted">(archived)</span>}
        </h3>
        <StatusBadge row={row} currency={currency} />
      </div>
      <ProgressBar
        percent={row.percentUsed}
        status={row.status}
        label={`${row.name}: ${row.percentUsed}% of budget used`}
      />
      <dl className="tabular mt-3 grid grid-cols-3 gap-2 text-sm">
        <div>
          <dt className="text-xs text-muted">Budget</dt>
          <dd className="font-medium">{formatMoney(row.allocated, currency)}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted">Spent</dt>
          <dd className="font-medium">{formatMoney(row.spent, currency)}</dd>
        </div>
        <div className="text-right">
          <dt className="text-xs text-muted">Remaining</dt>
          <dd className={cn("font-semibold", row.remaining < 0 ? "text-danger" : "text-fg")}>
            {formatMoney(row.remaining, currency)}
          </dd>
        </div>
      </dl>
    </Link>
  );
}
