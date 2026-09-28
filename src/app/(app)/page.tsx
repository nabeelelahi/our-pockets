import Link from "next/link";
import { AllotmentCard } from "@/components/dashboard/AllotmentCard";
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
  const budgetHref = `/budget?m=${month}`;
  // This month's allotments, plus any with spending that weren't given an amount.
  const rows = overview.allotments.filter((a) => a.inBudget || a.spent > 0);
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
          <p className="mt-1 text-muted">Record the money coming in, then split it into allotments.</p>
          <Link href={budgetHref} className={buttonClass("primary", "mt-4")}>
            Set up budget
          </Link>
        </section>
      ) : (
        <>
          <MonthSummary totals={overview.totals} currency={currency} budgetHref={budgetHref} />

          <section aria-labelledby="allotments-heading" className="space-y-3">
            <div className="flex items-baseline justify-between">
              <h2 id="allotments-heading" className="font-semibold">
                Allotments
              </h2>
              <Link href={budgetHref} className="text-sm font-medium text-accent">
                Edit budget
              </Link>
            </div>
            {rows.length === 0 ? (
              <div className={`${cardClass} p-6 text-center`}>
                <p className="font-medium">No allotments in your {formatMonthName(month)} budget yet.</p>
                <Link href={budgetHref} className={buttonClass("secondary", "mt-3")}>
                  Create allotments
                </Link>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {rows.map((row) => (
                  <AllotmentCard
                    key={row.id}
                    allotment={row}
                    currency={currency}
                    href={`/allotments/${row.id}?m=${month}`}
                  />
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
