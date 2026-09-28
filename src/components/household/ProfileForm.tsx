"use client";

import { updateProfileAction } from "@/actions/auth";
import { Alert } from "@/components/ui/Alert";
import { Field, fieldAria } from "@/components/ui/Field";
import { buttonClass, inputClass } from "@/components/ui/styles";
import { useServerForm } from "@/components/ui/useServerForm";

export function ProfileForm({ name, email }: { name: string; email: string }) {
  const { result, pending, onSubmit, fieldErrors } = useServerForm(updateProfileAction);
  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <Field id="profile-name" label="Name" error={fieldErrors.name}>
        <input {...fieldAria("profile-name", fieldErrors.name)} name="name" defaultValue={name} required className={inputClass} />
      </Field>
      <p className="text-sm text-muted">Email: {email}</p>
      {result && <Alert tone={result.ok ? "success" : "error"}>{result.ok ? result.message : result.error}</Alert>}
      <button type="submit" disabled={pending} className={buttonClass("secondary")}>
        {pending ? "Saving…" : "Save profile"}
      </button>
    </form>
  );
}
