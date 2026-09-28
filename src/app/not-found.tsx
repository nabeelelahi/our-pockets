import Link from "next/link";
import { buttonClass } from "@/components/ui/styles";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col items-center justify-center px-4 text-center">
      <h1 className="text-xl font-semibold">Not found</h1>
      <p className="mt-1 text-muted">This item no longer exists, or you don&apos;t have access to it.</p>
      <Link href="/" className={buttonClass("primary", "mt-4")}>
        Go home
      </Link>
    </main>
  );
}
