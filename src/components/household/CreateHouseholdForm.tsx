"use client";

import { createHouseholdAction } from "@/actions/household";
import { Alert } from "@/components/ui/Alert";
import { Field, fieldAria } from "@/components/ui/Field";
import { buttonClass, cardClass, inputClass } from "@/components/ui/styles";
import { useServerForm } from "@/components/ui/useServerForm";

export function CreateHouseholdForm({ defaultName }: { defaultName: string }) {
  const { result, pending, onSubmit, fieldErrors } = useServerForm(createHouseholdAction, {
    onSuccess: (res) => window.location.assign(res.data.redirectTo),
  });

  return (
    <form onSubmit={onSubmit} className={`${cardClass} space-y-4 p-5`} noValidate>
      {result && !result.ok && <Alert>{result.error}</Alert>}
      <Field id="name" label="Household name" error={fieldErrors.name} hint="For example “Nabeel & Ayesha”.">
        <input {...fieldAria("name", fieldErrors.name)} name="name" defaultValue={defaultName} required className={inputClass} />
      </Field>
      <label className="flex items-start gap-3 rounded-xl bg-card-muted p-3 text-sm">
        <input type="checkbox" name="useDefaultCategories" defaultChecked className="mt-0.5 h-5 w-5 accent-[var(--accent)]" />
        <span>
          <span className="font-medium">Start with suggested categories</span>
          <span className="block text-muted">
            Household, Food &amp; Groceries, Transport, Bills, Personal, Entertainment, Medical, Savings, Miscellaneous.
            You can rename or remove them later.
          </span>
        </span>
      </label>
      <p className="text-sm text-muted">Currency: PKR · Timezone: Asia/Karachi (changeable in Settings).</p>
      <button type="submit" disabled={pending} className={buttonClass("primary", "w-full")}>
        {pending ? "Creating…" : "Create household"}
      </button>
    </form>
  );
}
