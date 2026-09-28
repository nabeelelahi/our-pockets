import "server-only";
import type { ComponentProps } from "react";
import type { AddExpense } from "@/components/transactions/AddExpense";
import { todayInTimeZone } from "@/lib/dates";
import type { PublicUser } from "@/services/auth.service";
import { listCategories } from "@/services/category.service";
import { listMembers, type Membership } from "@/services/household.service";
import { lastUsedCategoryId } from "@/services/transaction.service";

/** Everything the Add Expense sheet needs, loaded in parallel. */
export async function loadAddExpenseProps(
  user: PublicUser,
  membership: Membership,
): Promise<ComponentProps<typeof AddExpense>> {
  const [categories, members, lastCategory] = await Promise.all([
    listCategories(user.id),
    listMembers(user.id),
    lastUsedCategoryId(user.id),
  ]);
  return {
    categories: categories.map((c) => ({ id: c.id, name: c.name, icon: c.icon })),
    members: members.map((m) => ({ id: m.id, name: m.name })),
    currentUserId: user.id,
    defaultCategoryId: lastCategory ?? undefined,
    today: todayInTimeZone(membership.household.timezone),
    currency: membership.household.currency,
  };
}
