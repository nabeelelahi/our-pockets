"use client";

import { useRef, useState, useTransition, type FormEvent } from "react";
import type { ActionResult } from "@/lib/action-result";

/**
 * Submits a form to a server action while:
 * - blocking double submits (ref guard + pending flag for the button),
 * - keeping the user's input when the server returns an error,
 * - exposing the result for inline messages.
 */
export function useServerForm<T>(
  action: (formData: FormData) => Promise<ActionResult<T>>,
  opts: { onSuccess?: (result: Extract<ActionResult<T>, { ok: true }>, form: HTMLFormElement) => void } = {},
) {
  const [result, setResult] = useState<ActionResult<T> | null>(null);
  const [pending, startTransition] = useTransition();
  const busy = useRef(false);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy.current) return;
    busy.current = true;
    const form = event.currentTarget;
    const formData = new FormData(form);
    startTransition(async () => {
      try {
        const res = await action(formData);
        setResult(res);
        if (res.ok) opts.onSuccess?.(res, form);
      } catch {
        setResult({ ok: false, error: "Couldn't reach the server. Check your connection and try again." });
      } finally {
        busy.current = false;
      }
    });
  }

  const fieldErrors = result && !result.ok ? (result.fieldErrors ?? {}) : {};
  return { result, setResult, pending, onSubmit, fieldErrors };
}
