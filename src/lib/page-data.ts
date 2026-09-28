import "server-only";
import type { ComponentProps } from "react";
import type { AddExpense } from "@/components/transactions/AddExpense";
import { todayInTimeZone } from "@/lib/dates";
import type { PublicUser } from "@/services/auth.service";
import { listAllotments } from "@/services/allotment.service";
import { listMembers, type Membership } from "@/services/household.service";
import { lastUsedAllotmentId } from "@/services/transaction.service";

/** Everything the Add Expense sheet needs, loaded in parallel. */
export async function loadAddExpenseProps(
  user: PublicUser,
  membership: Membership,
): Promise<ComponentProps<typeof AddExpense>> {
  const [allotments, members, lastAllotment] = await Promise.all([
    listAllotments(user.id),
    listMembers(user.id),
    lastUsedAllotmentId(user.id),
  ]);
  return {
    allotments: allotments.map((a) => ({ id: a.id, name: a.name })),
    members: members.map((m) => ({ id: m.id, name: m.name })),
    currentUserId: user.id,
    defaultAllotmentId: lastAllotment ?? undefined,
    today: todayInTimeZone(membership.household.timezone),
    currency: membership.household.currency,
  };
}
