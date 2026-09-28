import Link from "next/link";
import { cardClass, cn } from "@/components/ui/styles";
import type { AllotmentSummary } from "@/lib/budget-math";
import { formatMoney } from "@/lib/money";
import { ProgressBar } from "./ProgressBar";

type Props = {
  allotment: AllotmentSummary & { name: string; isArchived: boolean };
  currency: string;
  href?: string;
};

/** Text badge so status never relies on colour alone. */
export function StatusBadge({ allotment, currency }: Omit<Props, "href">) {
  if (allotment.status === "over") {
    return (
      <span className="rounded-full bg-danger-soft px-2 py-0.5 text-xs font-semibold whitespace-nowrap text-danger">
        ⚠ Over by {formatMoney(allotment.overBy, currency)}
      </span>
    );
  }
  if (allotment.status === "full") {
    return <span className="rounded-full bg-warn-soft px-2 py-0.5 text-xs font-semibold text-warn">Fully spent</span>;
  }
  if (allotment.status === "low") {
    return <span className="rounded-full bg-warn-soft px-2 py-0.5 text-xs font-semibold text-warn">Running low</span>;
  }
  return null;
}

export function AllotmentFigures({ allotment, currency }: Omit<Props, "href">) {
  return (
    <>
      <ProgressBar
        percent={allotment.percentUsed}
        status={allotment.status}
        label={`${allotment.name}: ${allotment.percentUsed}% of allotted amount spent`}
      />
      <dl className="tabular mt-3 grid grid-cols-3 gap-2 text-sm">
        <div>
          <dt className="text-xs text-muted">Allotted</dt>
          <dd className="font-medium">{formatMoney(allotment.allocated, currency)}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted">Spent</dt>
          <dd className="font-medium">{formatMoney(allotment.spent, currency)}</dd>
        </div>
        <div className="text-right">
          <dt className="text-xs text-muted">Left</dt>
          <dd className={cn("font-semibold", allotment.remaining < 0 ? "text-danger" : "text-fg")}>
            {formatMoney(allotment.remaining, currency)}
          </dd>
        </div>
      </dl>
    </>
  );
}

export function AllotmentCard({ allotment, currency, href }: Props) {
  const body = (
    <>
      <div className="mb-3 flex items-start justify-between gap-2">
        <h3 className="font-semibold">
          {allotment.name}
          {allotment.isArchived && <span className="ml-2 text-xs font-normal text-muted">(archived)</span>}
        </h3>
        <StatusBadge allotment={allotment} currency={currency} />
      </div>
      <AllotmentFigures allotment={allotment} currency={currency} />
    </>
  );
  return href ? (
    <Link href={href} className={cn(cardClass, "block p-4 transition hover:border-accent/50")}>
      {body}
    </Link>
  ) : (
    <div className={cn(cardClass, "p-4")}>{body}</div>
  );
}
