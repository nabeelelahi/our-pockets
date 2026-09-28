import Link from "next/link";
import { cardClass } from "@/components/ui/styles";
import { formatDateLabel } from "@/lib/dates";
import { formatMoney, sumAmounts } from "@/lib/money";
import type { TransactionView } from "@/services/transaction.service";

export function TransactionList({
  transactions,
  currency,
  today,
}: {
  transactions: TransactionView[];
  currency: string;
  today: string;
}) {
  // Already sorted newest first; group consecutive items by date.
  const groups: { date: string; items: TransactionView[] }[] = [];
  for (const t of transactions) {
    const last = groups.at(-1);
    if (last?.date === t.transactionDate) last.items.push(t);
    else groups.push({ date: t.transactionDate, items: [t] });
  }

  return (
    <div className="space-y-5">
      {groups.map((group) => {
        const label = formatDateLabel(group.date, today);
        return (
          <section key={group.date} aria-label={label}>
            <div className="mb-2 flex items-baseline justify-between px-1">
              <h2 className="text-sm font-semibold text-muted">{label}</h2>
              <span className="tabular text-xs text-muted">
                {formatMoney(sumAmounts(group.items.map((t) => t.amount)), currency)}
              </span>
            </div>
            <ul className={`${cardClass} divide-y divide-border overflow-hidden`}>
              {group.items.map((t) => (
                <li key={t.id}>
                  <Link
                    href={`/transactions/${t.id}`}
                    className="flex min-h-16 items-center gap-3 px-4 py-3 hover:bg-card-muted"
                  >
                    <span
                      aria-hidden="true"
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-card-muted text-lg"
                    >
                      {t.categoryIcon || "•"}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{t.description || t.categoryName}</span>
                      <span className="block truncate text-sm text-muted">
                        {t.categoryName} · {t.paidByName}
                      </span>
                    </span>
                    <span className="tabular shrink-0 font-semibold">{formatMoney(t.amount, currency)}</span>
                    <span className="sr-only">Edit</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
