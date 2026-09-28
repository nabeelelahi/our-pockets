import type { Metadata } from "next";
import Link from "next/link";
import { AllotmentManager } from "@/components/budget/AllotmentManager";
import { ChevronLeftIcon } from "@/components/ui/icons";
import { requireHousehold } from "@/lib/auth/session";
import { listAllotments } from "@/services/allotment.service";

export const metadata: Metadata = { title: "Allotments" };

export default async function AllotmentsSettingsPage() {
  const { user } = await requireHousehold();
  const allotments = await listAllotments(user.id, { includeArchived: true });

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Link href="/settings" className="inline-flex min-h-11 items-center gap-1 text-sm font-medium text-muted hover:text-fg">
        <ChevronLeftIcon width={18} height={18} /> Settings
      </Link>
      <h1 className="text-xl font-semibold">Allotments</h1>
      <p className="text-sm text-muted">
        Allotments are reused every month. Set how much each one gets on the{" "}
        <Link href="/budget" className="font-medium text-accent">
          Budget
        </Link>{" "}
        page.
      </p>
      <AllotmentManager allotments={allotments} />
    </div>
  );
}
