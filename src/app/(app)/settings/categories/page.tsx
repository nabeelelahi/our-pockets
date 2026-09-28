import type { Metadata } from "next";
import Link from "next/link";
import { CategoryManager } from "@/components/budget/CategoryManager";
import { ChevronLeftIcon } from "@/components/ui/icons";
import { requireHousehold } from "@/lib/auth/session";
import { listCategories } from "@/services/category.service";

export const metadata: Metadata = { title: "Categories" };

export default async function CategoriesPage() {
  const { user } = await requireHousehold();
  const categories = await listCategories(user.id, { includeArchived: true });

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Link href="/settings" className="inline-flex min-h-11 items-center gap-1 text-sm font-medium text-muted hover:text-fg">
        <ChevronLeftIcon width={18} height={18} /> Settings
      </Link>
      <h1 className="text-xl font-semibold">Categories</h1>
      <p className="text-sm text-muted">
        Categories are your spending envelopes. Set how much goes into each one on the{" "}
        <Link href="/budget" className="font-medium text-accent">Budget</Link> page.
      </p>
      <CategoryManager categories={categories} />
    </div>
  );
}
