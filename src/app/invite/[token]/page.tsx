import type { Metadata } from "next";
import Link from "next/link";
import { AcceptInvitationButton } from "@/components/household/AcceptInvitationButton";
import { buttonClass, cardClass } from "@/components/ui/styles";
import { getCurrentMembership, getCurrentUser } from "@/lib/auth/session";
import { previewInvitation } from "@/services/invitation.service";

export const metadata: Metadata = { title: "Household invitation", robots: { index: false } };

const MESSAGES = {
  invalid: "This invitation link is invalid. Ask for a new link.",
  expired: "This invitation has expired. Ask for a new link.",
  used: "This invitation has already been used.",
  full: "This household already has two members.",
} as const;

export default async function InvitePage(props: PageProps<"/invite/[token]">) {
  const { token } = await props.params;
  const [preview, user] = await Promise.all([previewInvitation(token), getCurrentUser()]);
  const membership = user ? await getCurrentMembership(user.id) : null;
  const next = encodeURIComponent(`/invite/${token}`);

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center px-4 py-10">
      <div className={`${cardClass} space-y-4 p-5`}>
        {preview.status !== "valid" ? (
          <>
            <h1 className="text-xl font-semibold">Invitation unavailable</h1>
            <p className="text-muted">{MESSAGES[preview.status]}</p>
            <Link href="/" className={buttonClass("secondary", "w-full")}>
              Go to Our Pockets
            </Link>
          </>
        ) : (
          <>
            <p className="text-sm text-muted">{preview.invitedByName} invited you to join</p>
            <h1 className="text-2xl font-semibold">{preview.householdName}</h1>
            <p className="text-muted">You&apos;ll share one budget and see each other&apos;s expenses.</p>
            {!user ? (
              <div className="space-y-2">
                <Link href={`/register?next=${next}`} className={buttonClass("primary", "w-full")}>
                  Create an account
                </Link>
                <Link href={`/login?next=${next}`} className={buttonClass("secondary", "w-full")}>
                  I already have an account
                </Link>
              </div>
            ) : membership ? (
              <p className="rounded-xl bg-warn-soft p-3 text-sm text-warn">
                You&apos;re signed in as {user.email}, who already belongs to a household. A person can belong to one
                household.
              </p>
            ) : (
              <>
                <p className="text-sm text-muted">Signed in as {user.email}</p>
                <AcceptInvitationButton token={token} />
              </>
            )}
          </>
        )}
      </div>
    </main>
  );
}
