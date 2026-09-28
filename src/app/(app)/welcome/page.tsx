import type { Metadata } from "next";
import Link from "next/link";
import { InviteSpouse } from "@/components/household/InviteSpouse";
import { buttonClass, cardClass } from "@/components/ui/styles";
import { requireHousehold } from "@/lib/auth/session";
import { MAX_HOUSEHOLD_MEMBERS } from "@/models/Household";

export const metadata: Metadata = { title: "Welcome" };

export default async function WelcomePage() {
  const { membership } = await requireHousehold();
  const canInvite = membership.role === "OWNER" && membership.memberIds.length < MAX_HOUSEHOLD_MEMBERS;

  return (
    <div className="mx-auto max-w-md space-y-4">
      <h1 className="text-2xl font-semibold">{membership.household.name} is ready</h1>
      <p className="text-muted">Two quick steps and you&apos;re budgeting together.</p>

      <section className={`${cardClass} p-5`}>
        <p className="mb-3 text-xs font-semibold tracking-wide text-muted uppercase">Step 1</p>
        {canInvite ? <InviteSpouse /> : <p className="font-medium">Your spouse has joined. ✓</p>}
      </section>

      <section className={`${cardClass} space-y-3 p-5`}>
        <p className="text-xs font-semibold tracking-wide text-muted uppercase">Step 2</p>
        <p className="font-medium">Record the money coming in and split it into allotments.</p>
        <Link href="/budget" className={buttonClass("primary", "w-full")}>
          Set up this month&apos;s budget
        </Link>
      </section>

      <p className="text-center">
        <Link href="/" className="text-sm font-medium text-muted hover:text-fg">
          Skip for now
        </Link>
      </p>
    </div>
  );
}
