import type { Metadata } from "next";
import Link from "next/link";
import { MonthNav } from "@/components/layout/MonthNav";
import { AddExpense } from "@/components/transactions/AddExpense";
import { TransactionList } from "@/components/transactions/TransactionList";
import { buttonClass, cardClass, inputClass } from "@/components/ui/styles";
import { requireHousehold } from "@/lib/auth/session";
import { currentMonthInTimeZone, isValidDate, monthOf, todayInTimeZone } from "@/lib/dates";
import { formatMoney, sumAmounts } from "@/lib/money";
import { resolveMonth } from "@/lib/month-param";
import { loadAddExpenseProps } from "@/lib/page-data";
import { listAllotments } from "@/services/allotment.service";
import { listTransactions, TRANSACTION_LIST_LIMIT } from "@/services/transaction.service";

export const metadata: Metadata = { title: "Transactions" };

const str = (v: string | string[] | undefined) => (typeof v === "string" && v.trim() ? v.trim() : undefined);
const asId = (v: string | undefined) => (v && /^[a-f\d]{24}$/i.test(v) ? v : undefined);

export default async function TransactionsPage(props: PageProps<"/transactions">) {
  const { user, membership } = await requireHousehold();
  const sp = await props.searchParams;
  const tz = membership.household.timezone;
  const month = resolveMonth(sp.m, tz);
  const date = str(sp.date);
  const filters = {
    allotmentId: asId(str(sp.allotment)),
    paidByUserId: asId(str(sp.person)),
    date: date && isValidDate(date) && monthOf(date) === month ? date : undefined,
    q: str(sp.q)?.slice(0, 100),
  };

  const [transactions, allotments, addExpense] = await Promise.all([
    listTransactions(user.id, { month, ...filters }),
    listAllotments(user.id, { includeArchived: true }),
    loadAddExpenseProps(user, membership),
  ]);
  const currency = membership.household.currency;
  const filtered = Object.values(filters).some(Boolean);

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <MonthNav
            month={month}
            basePath="/transactions"
            currentMonth={currentMonthInTimeZone(tz)}
            params={{ allotment: filters.allotmentId, person: filters.paidByUserId, q: filters.q }}
          />
        </div>
        <AddExpense {...addExpense} />
      </div>

      <form method="get" role="search" className={`${cardClass} grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-5`}>
        <input type="hidden" name="m" value={month} />
        <label className="sr-only" htmlFor="f-q">
          Search description
        </label>
        <input
          id="f-q"
          name="q"
          type="search"
          placeholder="Search description"
          defaultValue={filters.q}
          className={`${inputClass} lg:col-span-2`}
        />
        <label className="sr-only" htmlFor="f-allotment">
          Allotment
        </label>
        <select id="f-allotment" name="allotment" defaultValue={filters.allotmentId ?? ""} className={inputClass}>
          <option value="">All allotments</option>
          {allotments.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
              {a.isArchived ? " (archived)" : ""}
            </option>
          ))}
        </select>
        <label className="sr-only" htmlFor="f-person">
          Paid by
        </label>
        <select id="f-person" name="person" defaultValue={filters.paidByUserId ?? ""} className={inputClass}>
          <option value="">Everyone</option>
          {addExpense.members.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
        <label className="sr-only" htmlFor="f-date">
          Date
        </label>
        <input
          id="f-date"
          name="date"
          type="date"
          defaultValue={filters.date}
          min={`${month}-01`}
          max={`${month}-31`}
          className={inputClass}
        />
        <div className="flex gap-2 sm:col-span-2 lg:col-span-5">
          <button type="submit" className={buttonClass("secondary", "flex-1 sm:flex-none")}>
            Apply filters
          </button>
          {filtered && (
            <Link href={`/transactions?m=${month}`} className={buttonClass("ghost")}>
              Clear
            </Link>
          )}
        </div>
      </form>

      <div className="flex items-baseline justify-between text-sm text-muted">
        <span>
          {transactions.length} {transactions.length === 1 ? "expense" : "expenses"}
          {transactions.length >= TRANSACTION_LIST_LIMIT && ` (showing the latest ${TRANSACTION_LIST_LIMIT})`}
        </span>
        <span className="tabular font-semibold text-fg">
          Total {formatMoney(sumAmounts(transactions.map((t) => t.amount)), currency)}
        </span>
      </div>

      {transactions.length === 0 ? (
        <div className={`${cardClass} p-8 text-center`}>
          <p className="font-medium">{filtered ? "No expenses match these filters." : "No expenses recorded yet."}</p>
          {!filtered && <p className="mt-1 text-sm text-muted">Tap “Add Expense” to record your first one.</p>}
        </div>
      ) : (
        <TransactionList transactions={transactions} currency={currency} today={todayInTimeZone(tz)} />
      )}
    </div>
  );
}
