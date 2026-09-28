import Link from "next/link";
import { CategoryCard } from "@/components/dashboard/CategoryCard";
import { MonthSummary } from "@/components/dashboard/MonthSummary";
import { MonthNav } from "@/components/layout/MonthNav";
import { AddExpense } from "@/components/transactions/AddExpense";
import { buttonClass, cardClass } from "@/components/ui/styles";
import { requireHousehold } from "@/lib/auth/session";
import { currentMonthInTimeZone, formatMonthName } from "@/lib/dates";
import { resolveMonth } from "@/lib/month-param";
import { loadAddExpenseProps } from "@/lib/page-data";
import { getMonthOverview } from "@/services/budget.service";

export default async function DashboardPage(props: PageProps<"/">) {
  const { user, membership } = await requireHousehold();
  const { m } = await props.searchParams;
  const tz = membership.household.timezone;
  const month = resolveMonth(m, tz);
  const [overview, addExpense] = await Promise.all([
    getMonthOverview(user.id, month),
    loadAddExpenseProps(user, membership),
  ]);
  const currency = overview.household.currency;
  const spouseMissing = membership.memberIds.length < 2 && membership.role === "OWNER";

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <MonthNav month={month} basePath="/" currentMonth={currentMonthInTimeZone(tz)} />
        </div>
        {/* Floating on mobile, inline on desktop. */}
        <AddExpense {...addExpense} />
      </div>

      {spouseMissing && (
        <Link href="/settings#members" className="block rounded-2xl bg-accent-soft p-4 text-sm font-medium text-accent">
          Invite your spouse so you can both record expenses →
        </Link>
      )}

      {!overview.hasBudget ? (
        <section className={`${cardClass} p-6 text-center`}>
          <h2 className="text-lg font-semibold">Set up your {formatMonthName(month)} budget.</h2>
          <p className="mt-1 text-muted">Enter your income and decide how much goes into each category.</p>
          <Link href={`/budget?m=${month}`} className={buttonClass("primary", "mt-4")}>
            Set up budget
          </Link>
        </section>
      ) : (
        <MonthSummary totals={overview.totals} currency={currency} />
      )}

      <section aria-labelledby="categories-heading" className="space-y-3">
        <div className="flex items-baseline justify-between">
          <h2 id="categories-heading" className="font-semibold">
            Categories
          </h2>
          <Link href={`/budget?m=${month}`} className="text-sm font-medium text-accent">
            Edit budget
          </Link>
        </div>
        {overview.categories.length === 0 ? (
          <div className={`${cardClass} p-6 text-center`}>
            <p className="font-medium">Create your first budget category.</p>
            <Link href="/settings/categories" className={buttonClass("secondary", "mt-3")}>
              Add categories
            </Link>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {overview.categories.map((row) => (
              <CategoryCard
                key={row.id}
                row={row}
                currency={currency}
                href={`/transactions?m=${month}&category=${row.id}`}
              />
            ))}
          </div>
        )}
      </section>

    </div>
  );
}
