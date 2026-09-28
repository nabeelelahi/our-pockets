"use client";

import { buttonClass, cardClass } from "@/components/ui/styles";

export default function AppError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className={`${cardClass} mx-auto max-w-md p-6 text-center`} role="alert">
      <h1 className="text-lg font-semibold">Something went wrong</h1>
      <p className="mt-1 text-muted">We couldn&apos;t load this page. Check your connection and try again.</p>
      <button type="button" onClick={reset} className={buttonClass("primary", "mt-4")}>
        Try again
      </button>
    </div>
  );
}
