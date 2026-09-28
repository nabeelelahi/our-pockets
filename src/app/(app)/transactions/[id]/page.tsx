import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EditTransactionForm } from "@/components/transactions/EditTransactionForm";
import { ChevronLeftIcon } from "@/components/ui/icons";
import { cardClass } from "@/components/ui/styles";
import { requireHousehold } from "@/lib/auth/session";
import { monthOf } from "@/lib/dates";
import { NotFoundError } from "@/lib/errors";
import { listCategories } from "@/services/category.service";
import { listMembers } from "@/services/household.service";
import { getTransaction, type TransactionView } from "@/services/transaction.service";

export const metadata: Metadata = { title: "Edit expense" };

export default async function EditTransactionPage(props: PageProps<"/transactions/[id]">) {
  const { user, membership } = await requireHousehold();
  const { id } = await props.params;

  let transaction: TransactionView;
  try {
    transaction = await getTransaction(user.id, id);
  } catch (err) {
    // Also covers ids from other households: they look exactly like missing ones.
    if (err instanceof NotFoundError) notFound();
    throw err;
  }

  const [categories, members] = await Promise.all([
    listCategories(user.id, { includeArchived: true }),
    listMembers(user.id),
  ]);
  // Active categories, plus the expense's own category even if archived.
  const categoryOptions = categories
    .filter((c) => !c.isArchived || c.id === transaction.categoryId)
    .map((c) => ({ id: c.id, name: c.name, icon: c.icon, isArchived: c.isArchived }));
  const memberOptions = members.map((m) => ({ id: m.id, name: m.name }));
  if (!memberOptions.some((m) => m.id === transaction.paidByUserId)) {
    memberOptions.push({ id: transaction.paidByUserId, name: transaction.paidByName });
  }
  const backHref = `/transactions?m=${monthOf(transaction.transactionDate)}`;

  return (
    <div className="mx-auto max-w-md space-y-4">
      <Link href={backHref} className="inline-flex min-h-11 items-center gap-1 text-sm font-medium text-muted hover:text-fg">
        <ChevronLeftIcon width={18} height={18} /> Transactions
      </Link>
      <div className={`${cardClass} p-5`}>
        <h1 className="mb-4 text-xl font-semibold">Edit expense</h1>
        <EditTransactionForm
          transaction={transaction}
          categories={categoryOptions}
          members={memberOptions}
          currency={membership.household.currency}
        />
      </div>
    </div>
  );
}
