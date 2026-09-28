import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AllotmentFigures, StatusBadge } from "@/components/dashboard/AllotmentCard";
import { MonthNav } from "@/components/layout/MonthNav";
import { AddExpense } from "@/components/transactions/AddExpense";
import { TransactionList } from "@/components/transactions/TransactionList";
import { ChevronLeftIcon } from "@/components/ui/icons";
import { cardClass } from "@/components/ui/styles";
import { requireHousehold } from "@/lib/auth/session";
import { summarizeAllotment } from "@/lib/budget-math";
import { currentMonthInTimeZone, formatMonthName, todayInTimeZone } from "@/lib/dates";
import { NotFoundError } from "@/lib/errors";
import { resolveMonth } from "@/lib/month-param";
import { loadAddExpenseProps } from "@/lib/page-data";
import { getAllotment, type AllotmentInfo } from "@/services/allotment.service";
import { getMonthOverview } from "@/services/budget.service";
import { listTransactions } from "@/services/transaction.service";

export const metadata: Metadata = { title: "Allotment" };

export default async function AllotmentPage(props: PageProps<"/allotments/[id]">) {
  const { user, membership } = await requireHousehold();
  const [{ id }, { m }] = await Promise.all([props.params, props.searchParams]);
  const tz = membership.household.timezone;
  const month = resolveMonth(m, tz);

  let allotment: AllotmentInfo;
  try {
    allotment = await getAllotment(user.id, id);
  } catch (err) {
    // Also covers ids from other households: they look exactly like missing ones.
    if (err instanceof NotFoundError) notFound();
    throw err;
  }

  const [overview, expenses, addExpense] = await Promise.all([
    getMonthOverview(user.id, month),
    listTransactions(user.id, { month, allotmentId: allotment.id }),
    loadAddExpenseProps(user, membership),
  ]);
  const row = overview.allotments.find((a) => a.id === allotment.id);
  const summary = { ...allotment, ...(row ?? { ...summarizeAllotment(0, 0), inBudget: false }) };
  const currency = membership.household.currency;

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <Link href={`/?m=${month}`} className="inline-flex min-h-11 items-center gap-1 text-sm font-medium text-muted hover:text-fg">
        <ChevronLeftIcon width={18} height={18} /> Dashboard
      </Link>

      <div className="flex items-center gap-4">
        <div className="flex-1">
          <MonthNav month={month} basePath={`/allotments/${allotment.id}`} currentMonth={currentMonthInTimeZone(tz)} />
        </div>
        {!allotment.isArchived && <AddExpense {...addExpense} defaultAllotmentId={allotment.id} />}
      </div>

      <section className={`${cardClass} p-5`} aria-labelledby="allotment-name">
        <div className="mb-3 flex items-start justify-between gap-2">
          <h1 id="allotment-name" className="text-xl font-semibold">
            {allotment.name}
            {allotment.isArchived && <span className="ml-2 text-sm font-normal text-muted">(archived)</span>}
          </h1>
          <StatusBadge allotment={summary} currency={currency} />
        </div>
        <AllotmentFigures allotment={summary} currency={currency} />
        {!summary.inBudget && (
          <p className="mt-3 text-sm text-muted">
            Not in the {formatMonthName(month)} budget.{" "}
            <Link href={`/budget?m=${month}`} className="font-medium text-accent">
              Give it an amount
            </Link>
          </p>
        )}
      </section>

      <section aria-labelledby="expenses-heading" className="space-y-3">
        <h2 id="expenses-heading" className="font-semibold">
          Expenses in {formatMonthName(month)}
          <span className="ml-2 text-sm font-normal text-muted">{expenses.length}</span>
        </h2>
        {expenses.length === 0 ? (
          <div className={`${cardClass} p-8 text-center`}>
            <p className="font-medium">No expenses recorded against {allotment.name} yet.</p>
          </div>
        ) : (
          <TransactionList transactions={expenses} currency={currency} today={todayInTimeZone(tz)} hideAllotment />
        )}
      </section>
    </div>
  );
}
