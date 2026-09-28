import type { Metadata } from "next";
import Link from "next/link";
import { BudgetForm } from "@/components/budget/BudgetForm";
import { MonthNav } from "@/components/layout/MonthNav";
import { buttonClass, cardClass } from "@/components/ui/styles";
import { requireHousehold } from "@/lib/auth/session";
import { currentMonthInTimeZone } from "@/lib/dates";
import { resolveMonth } from "@/lib/month-param";
import { getMonthOverview, previousBudgetMonth } from "@/services/budget.service";

export const metadata: Metadata = { title: "Budget" };

export default async function BudgetPage(props: PageProps<"/budget">) {
  const { user, membership } = await requireHousehold();
  const { m } = await props.searchParams;
  const tz = membership.household.timezone;
  const month = resolveMonth(m, tz);
  const [overview, previousMonth] = await Promise.all([
    getMonthOverview(user.id, month),
    previousBudgetMonth(user.id, month),
  ]);
  const editable = overview.categories.filter((c) => !c.isArchived);

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <MonthNav month={month} basePath="/budget" currentMonth={currentMonthInTimeZone(tz)} />
      {editable.length === 0 ? (
        <div className={`${cardClass} p-6 text-center`}>
          <p className="font-medium">Create your first budget category.</p>
          <Link href="/settings/categories" className={buttonClass("primary", "mt-3")}>
            Add categories
          </Link>
        </div>
      ) : (
        <BudgetForm
          key={month}
          month={month}
          currency={overview.household.currency}
          hasBudget={overview.hasBudget}
          previousMonth={previousMonth}
          income={overview.totals.income}
          categories={editable.map((c) => ({
            id: c.id,
            name: c.name,
            icon: c.icon,
            type: c.type,
            allocated: c.allocated,
            spent: c.spent,
          }))}
        />
      )}
      <p className="text-center text-sm">
        <Link href="/settings/categories" className="font-medium text-accent">
          Add, rename, reorder or archive categories
        </Link>
      </p>
    </div>
  );
}
