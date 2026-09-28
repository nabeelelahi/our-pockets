import type { ReactNode } from "react";

/** Label + control + error/hint, wired up for screen readers. */
export function Field({
  id,
  label,
  error,
  hint,
  children,
}: {
  id: string;
  label: ReactNode;
  error?: string[] | string;
  hint?: ReactNode;
  children: ReactNode;
}) {
  const message = Array.isArray(error) ? error[0] : error;
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium text-fg">
        {label}
      </label>
      {children}
      {message ? (
        <p id={`${id}-error`} className="text-sm text-danger">
          {message}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-sm text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

/** Props to spread on an input so it reflects the Field's error state. */
export function fieldAria(id: string, error?: string[] | string) {
  const has = Array.isArray(error) ? error.length > 0 : Boolean(error);
  return {
    id,
    "aria-invalid": has || undefined,
    "aria-describedby": has ? `${id}-error` : undefined,
  };
}
