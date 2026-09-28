"use client";

import { updateHouseholdAction } from "@/actions/household";
import { Alert } from "@/components/ui/Alert";
import { Field, fieldAria } from "@/components/ui/Field";
import { buttonClass, inputClass } from "@/components/ui/styles";
import { useServerForm } from "@/components/ui/useServerForm";

const COMMON_CURRENCIES = ["PKR", "USD", "AED", "SAR", "GBP", "EUR"];

export function HouseholdSettingsForm({
  name,
  currency,
  timezone,
  timezones,
}: {
  name: string;
  currency: string;
  timezone: string;
  timezones: string[];
}) {
  const { result, pending, onSubmit, fieldErrors } = useServerForm(updateHouseholdAction);
  const currencies = COMMON_CURRENCIES.includes(currency) ? COMMON_CURRENCIES : [currency, ...COMMON_CURRENCIES];

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <Field id="hh-name" label="Household name" error={fieldErrors.name}>
        <input {...fieldAria("hh-name", fieldErrors.name)} name="name" defaultValue={name} required className={inputClass} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          id="hh-currency"
          label="Currency"
          error={fieldErrors.currency}
          hint="Display only. Amounts are never converted."
        >
          <select {...fieldAria("hh-currency", fieldErrors.currency)} name="currency" defaultValue={currency} className={inputClass}>
            {currencies.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </Field>
        <Field id="hh-timezone" label="Timezone" error={fieldErrors.timezone} hint="Decides what “today” and “this month” mean.">
          <select {...fieldAria("hh-timezone", fieldErrors.timezone)} name="timezone" defaultValue={timezone} className={inputClass}>
            {timezones.map((tz) => (
              <option key={tz} value={tz}>{tz}</option>
            ))}
          </select>
        </Field>
      </div>
      {result && <Alert tone={result.ok ? "success" : "error"}>{result.ok ? result.message : result.error}</Alert>}
      <button type="submit" disabled={pending} className={buttonClass("secondary")}>
        {pending ? "Saving…" : "Save household"}
      </button>
    </form>
  );
}
