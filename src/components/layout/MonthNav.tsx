import Link from "next/link";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/ui/icons";
import { formatMonthLabel, shiftMonth } from "@/lib/dates";

/** ‹ September 2026 › — links keep any other query params the page passes in. */
export function MonthNav({
  month,
  basePath,
  currentMonth,
  params = {},
}: {
  month: string;
  basePath: string;
  currentMonth: string;
  params?: Record<string, string | undefined>;
}) {
  const href = (m: string) => {
    const search = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v) search.set(k, v);
    search.set("m", m);
    return `${basePath}?${search.toString()}`;
  };
  const prev = shiftMonth(month, -1);
  const next = shiftMonth(month, 1);
  const arrow =
    "flex h-11 w-11 items-center justify-center rounded-full text-muted hover:bg-card-muted hover:text-fg";

  return (
    <nav aria-label="Month" className="flex items-center justify-between gap-2">
      <Link href={href(prev)} className={arrow} aria-label={`Previous month, ${formatMonthLabel(prev)}`}>
        <ChevronLeftIcon />
      </Link>
      <div className="text-center">
        <h1 className="text-lg font-semibold">{formatMonthLabel(month)}</h1>
        {month !== currentMonth && (
          <Link href={href(currentMonth)} className="text-xs font-medium text-accent">
            Back to this month
          </Link>
        )}
      </div>
      <Link href={href(next)} className={arrow} aria-label={`Next month, ${formatMonthLabel(next)}`}>
        <ChevronRightIcon />
      </Link>
    </nav>
  );
}
