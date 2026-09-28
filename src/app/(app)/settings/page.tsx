import type { Metadata } from "next";
import Link from "next/link";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { HouseholdSettingsForm } from "@/components/household/HouseholdSettingsForm";
import { InviteSpouse } from "@/components/household/InviteSpouse";
import { MemberList } from "@/components/household/MemberList";
import { ProfileForm } from "@/components/household/ProfileForm";
import { ChevronRightIcon } from "@/components/ui/icons";
import { cardClass } from "@/components/ui/styles";
import { requireHousehold } from "@/lib/auth/session";
import { MAX_HOUSEHOLD_MEMBERS } from "@/models/Household";
import { listMembers } from "@/services/household.service";

export const metadata: Metadata = { title: "Settings" };

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-heading`} className={`${cardClass} scroll-mt-20 p-5`}>
      <h2 id={`${id}-heading`} className="mb-4 font-semibold">
        {title}
      </h2>
      {children}
    </section>
  );
}

export default async function SettingsPage() {
  const { user, membership } = await requireHousehold();
  const members = await listMembers(user.id);
  const isOwner = membership.role === "OWNER";
  const { household } = membership;

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-xl font-semibold">Settings</h1>

      <Section id="profile" title="Profile">
        <ProfileForm name={user.name} email={user.email} />
      </Section>

      <Section id="household" title="Household">
        {isOwner ? (
          <HouseholdSettingsForm
            name={household.name}
            currency={household.currency}
            timezone={household.timezone}
            timezones={Intl.supportedValuesOf("timeZone")}
          />
        ) : (
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-muted">Name</dt><dd>{household.name}</dd></div>
            <div className="flex justify-between"><dt className="text-muted">Currency</dt><dd>{household.currency}</dd></div>
            <div className="flex justify-between"><dt className="text-muted">Timezone</dt><dd>{household.timezone}</dd></div>
            <p className="pt-1 text-muted">Only the household owner can change these.</p>
          </dl>
        )}
      </Section>

      <Section id="members" title="Members">
        <MemberList members={members} currentUserId={user.id} canRemove={isOwner} />
        {isOwner && members.length < MAX_HOUSEHOLD_MEMBERS && (
          <div className="mt-4 border-t border-border pt-4">
            <InviteSpouse />
          </div>
        )}
      </Section>

      <Link href="/settings/categories" className={`${cardClass} flex min-h-14 items-center justify-between p-5 font-semibold hover:bg-card-muted`}>
        Categories
        <ChevronRightIcon />
      </Link>

      <div className="pt-2">
        <LogoutButton />
      </div>
    </div>
  );
}
