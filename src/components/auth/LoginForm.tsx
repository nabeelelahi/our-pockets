"use client";

import Link from "next/link";
import { loginAction } from "@/actions/auth";
import { Alert } from "@/components/ui/Alert";
import { Field, fieldAria } from "@/components/ui/Field";
import { buttonClass, cardClass, inputClass } from "@/components/ui/styles";
import { useServerForm } from "@/components/ui/useServerForm";

export function LoginForm({ next }: { next: string }) {
  const { result, pending, onSubmit, fieldErrors } = useServerForm(loginAction, {
    // Full navigation so no client cache from a previous session survives.
    onSuccess: (res) => window.location.assign(res.data.redirectTo),
  });

  return (
    <div className={`${cardClass} p-5`}>
      <h1 className="mb-4 text-xl font-semibold">Log in</h1>
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <input type="hidden" name="next" value={next} />
        {result && !result.ok && <Alert>{result.error}</Alert>}
        <Field id="email" label="Email" error={fieldErrors.email}>
          <input
            {...fieldAria("email", fieldErrors.email)}
            name="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            required
            className={inputClass}
          />
        </Field>
        <Field id="password" label="Password" error={fieldErrors.password}>
          <input
            {...fieldAria("password", fieldErrors.password)}
            name="password"
            type="password"
            autoComplete="current-password"
            required
            className={inputClass}
          />
        </Field>
        <button type="submit" disabled={pending} className={buttonClass("primary", "w-full")}>
          {pending ? "Logging in…" : "Log in"}
        </button>
      </form>
      <p className="mt-4 text-center text-sm text-muted">
        New here?{" "}
        <Link href={next ? `/register?next=${encodeURIComponent(next)}` : "/register"} className="font-semibold text-accent underline-offset-2 hover:underline">
          Create an account
        </Link>
      </p>
    </div>
  );
}
