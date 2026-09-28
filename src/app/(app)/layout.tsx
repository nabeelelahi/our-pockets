import { AppNav } from "@/components/layout/AppNav";
import { RefreshOnFocus } from "@/components/layout/RefreshOnFocus";
import { requireHousehold } from "@/lib/auth/session";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const { membership } = await requireHousehold();

  return (
    <div className="min-h-dvh pb-[calc(9.5rem+env(safe-area-inset-bottom))] md:pb-10">
      <AppNav householdName={membership.household.name} />
      <main className="mx-auto w-full max-w-5xl px-4 pt-4 md:pt-8">{children}</main>
      <RefreshOnFocus />
    </div>
  );
}
