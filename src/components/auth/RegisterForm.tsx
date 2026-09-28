"use client";

import Link from "next/link";
import { registerAction } from "@/actions/auth";
import { Alert } from "@/components/ui/Alert";
import { Field, fieldAria } from "@/components/ui/Field";
import { buttonClass, cardClass, inputClass } from "@/components/ui/styles";
import { useServerForm } from "@/components/ui/useServerForm";

export function RegisterForm({ next }: { next: string }) {
  const { result, pending, onSubmit, fieldErrors } = useServerForm(registerAction, {
    onSuccess: (res) => window.location.assign(res.data.redirectTo),
  });

  return (
    <div className={`${cardClass} p-5`}>
      <h1 className="mb-4 text-xl font-semibold">Create your account</h1>
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <input type="hidden" name="next" value={next} />
        {result && !result.ok && <Alert>{result.error}</Alert>}
        <Field id="name" label="Name" error={fieldErrors.name}>
          <input {...fieldAria("name", fieldErrors.name)} name="name" autoComplete="name" required className={inputClass} />
        </Field>
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
        <Field id="password" label="Password" error={fieldErrors.password} hint="At least 8 characters.">
          <input
            {...fieldAria("password", fieldErrors.password)}
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
            className={inputClass}
          />
        </Field>
        <Field id="confirmPassword" label="Confirm password" error={fieldErrors.confirmPassword}>
          <input
            {...fieldAria("confirmPassword", fieldErrors.confirmPassword)}
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            required
            className={inputClass}
          />
        </Field>
        <button type="submit" disabled={pending} className={buttonClass("primary", "w-full")}>
          {pending ? "Creating account…" : "Create account"}
        </button>
      </form>
      <p className="mt-4 text-center text-sm text-muted">
        Already have an account?{" "}
        <Link href={next ? `/login?next=${encodeURIComponent(next)}` : "/login"} className="font-semibold text-accent underline-offset-2 hover:underline">
          Log in
        </Link>
      </p>
    </div>
  );
}
