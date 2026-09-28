import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CreateHouseholdForm } from "@/components/household/CreateHouseholdForm";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { getCurrentMembership, requireUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Create your household" };

export default async function OnboardingPage() {
  const user = await requireUser();
  if (await getCurrentMembership(user.id)) redirect("/");

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-4 py-10">
      <p className="text-sm text-muted">Welcome, {user.name}</p>
      <h1 className="mb-1 text-2xl font-semibold">Create your household to get started.</h1>
      <p className="mb-6 text-muted">
        You&apos;ll invite your spouse next. If they already set one up, ask them for the invitation link instead.
      </p>
      <CreateHouseholdForm defaultName={`${user.name.split(" ")[0]}'s Household`} />
      <div className="mt-6 text-center">
        <LogoutButton variant="ghost" />
      </div>
    </main>
  );
}
