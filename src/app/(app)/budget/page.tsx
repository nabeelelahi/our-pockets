import type { Metadata } from "next";
import Link from "next/link";
import { BudgetForm } from "@/components/budget/BudgetForm";
import { IncomeSection } from "@/components/budget/IncomeSection";
import { MonthNav } from "@/components/layout/MonthNav";
import { requireHousehold } from "@/lib/auth/session";
import { currentMonthInTimeZone, monthOf, todayInTimeZone } from "@/lib/dates";
import { resolveMonth } from "@/lib/month-param";
import { getMonthOverview, previousBudgetMonth } from "@/services/budget.service";
import { listMembers } from "@/services/household.service";
import { listIncomes } from "@/services/income.service";

export const metadata: Metadata = { title: "Budget" };

export default async function BudgetPage(props: PageProps<"/budget">) {
  const { user, membership } = await requireHousehold();
  const { m } = await props.searchParams;
  const tz = membership.household.timezone;
  const month = resolveMonth(m, tz);
  const today = todayInTimeZone(tz);
  const [overview, previousMonth, incomes, members] = await Promise.all([
    getMonthOverview(user.id, month),
    previousBudgetMonth(user.id, month),
    listIncomes(user.id, month),
    listMembers(user.id),
  ]);
  const currency = overview.household.currency;

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <MonthNav month={month} basePath="/budget" currentMonth={currentMonthInTimeZone(tz)} />

      <IncomeSection
        key={`income-${month}`}
        incomes={incomes}
        members={members.map((member) => ({ id: member.id, name: member.name }))}
        currentUserId={user.id}
        defaultDate={monthOf(today) === month ? today : `${month}-01`}
        today={today}
        currency={currency}
      />

      <BudgetForm
        key={month}
        month={month}
        currency={currency}
        moneyIn={overview.totals.moneyIn}
        previousMonth={previousMonth}
        allotments={overview.allotments.map((a) => ({
          id: a.id,
          name: a.name,
          isArchived: a.isArchived,
          inBudget: a.inBudget,
          allocated: a.allocated,
          spent: a.spent,
        }))}
      />
      <p className="text-center text-sm">
        <Link href="/settings/allotments" className="font-medium text-accent">
          Rename, reorder or restore allotments
        </Link>
      </p>
    </div>
  );
}
