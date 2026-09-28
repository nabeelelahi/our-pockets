"use client";

import { useState, useTransition } from "react";
import {
  createAllotmentAction,
  deleteOrArchiveAllotmentAction,
  moveAllotmentAction,
  renameAllotmentAction,
  setAllotmentArchivedAction,
} from "@/actions/allotments";
import { Alert } from "@/components/ui/Alert";
import { Field, fieldAria } from "@/components/ui/Field";
import { ArrowDownIcon, ArrowUpIcon } from "@/components/ui/icons";
import { buttonClass, cardClass, cn, inputClass } from "@/components/ui/styles";
import { useServerForm } from "@/components/ui/useServerForm";
import type { AllotmentInfo } from "@/services/allotment.service";

function AddAllotmentForm() {
  const [formKey, setFormKey] = useState(0);
  const { result, pending, onSubmit, fieldErrors } = useServerForm(createAllotmentAction, {
    onSuccess: () => setFormKey((k) => k + 1),
  });
  return (
    <form key={formKey} onSubmit={onSubmit} noValidate className={cn(cardClass, "space-y-3 p-4")}>
      <Field id="new-allotment" label="New allotment" error={fieldErrors.name}>
        <input
          {...fieldAria("new-allotment", fieldErrors.name)}
          name="name"
          maxLength={40}
          placeholder="e.g. School fees"
          required
          className={inputClass}
        />
      </Field>
      {result && <Alert tone={result.ok ? "success" : "error"}>{result.ok ? result.message : result.error}</Alert>}
      <button type="submit" disabled={pending} className={buttonClass("primary")}>
        {pending ? "Adding…" : "Add allotment"}
      </button>
    </form>
  );
}

function AllotmentRow({ allotment, isFirst, isLast }: { allotment: AllotmentInfo; isFirst: boolean; isLast: boolean }) {
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const form = useServerForm((fd) => renameAllotmentAction(allotment.id, fd), {
    onSuccess: () => setEditing(false),
  });

  function run(
    action: () => Promise<{ ok: true; message?: string } | { ok: false; error: string }>,
    confirmText?: string,
  ) {
    if (confirmText && !window.confirm(confirmText)) return;
    startTransition(async () => {
      const res = await action();
      setNotice(res.ok ? (res.message ? { ok: true, text: res.message } : null) : { ok: false, text: res.error });
    });
  }

  const deletePrompt = `Delete “${allotment.name}”? If it has expenses it's archived instead, so your history stays intact.`;
  const iconButton =
    "flex h-8 w-10 items-center justify-center rounded-lg text-muted hover:bg-card-muted disabled:opacity-30";

  if (editing) {
    return (
      <li className="p-4">
        <form onSubmit={form.onSubmit} noValidate className="space-y-3">
          <Field id={`rename-${allotment.id}`} label="Name" error={form.fieldErrors.name}>
            <input
              {...fieldAria(`rename-${allotment.id}`, form.fieldErrors.name)}
              name="name"
              maxLength={40}
              defaultValue={allotment.name}
              required
              className={inputClass}
            />
          </Field>
          {form.result && !form.result.ok && <Alert>{form.result.error}</Alert>}
          <div className="flex gap-2">
            <button type="submit" disabled={form.pending} className={buttonClass("primary")}>
              {form.pending ? "Saving…" : "Save"}
            </button>
            <button type="button" onClick={() => setEditing(false)} className={buttonClass("ghost")}>
              Cancel
            </button>
          </div>
        </form>
      </li>
    );
  }

  return (
    <li className="space-y-2 p-3">
      <div className="flex items-center gap-2">
        {!allotment.isArchived && (
          <div className="flex flex-col">
            <button
              type="button"
              disabled={pending || isFirst}
              onClick={() => run(() => moveAllotmentAction(allotment.id, "up"))}
              aria-label={`Move ${allotment.name} up`}
              className={iconButton}
            >
              <ArrowUpIcon width={18} height={18} />
            </button>
            <button
              type="button"
              disabled={pending || isLast}
              onClick={() => run(() => moveAllotmentAction(allotment.id, "down"))}
              aria-label={`Move ${allotment.name} down`}
              className={iconButton}
            >
              <ArrowDownIcon width={18} height={18} />
            </button>
          </div>
        )}
        <span className="min-w-0 flex-1 truncate font-medium">{allotment.name}</span>
        {allotment.isArchived ? (
          <button
            type="button"
            disabled={pending}
            onClick={() => run(() => setAllotmentArchivedAction(allotment.id, false))}
            className={buttonClass("secondary")}
          >
            Restore
          </button>
        ) : (
          <>
            <button type="button" onClick={() => setEditing(true)} className={buttonClass("ghost", "px-3")}>
              Rename
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                run(
                  () => setAllotmentArchivedAction(allotment.id, true),
                  `Archive “${allotment.name}”? It stays in past months, but you can't record new expenses against it.`,
                )
              }
              className={buttonClass("ghost", "px-3")}
            >
              Archive
            </button>
          </>
        )}
        <button
          type="button"
          disabled={pending}
          onClick={() => run(() => deleteOrArchiveAllotmentAction(allotment.id), deletePrompt)}
          className={buttonClass("danger", "px-3")}
        >
          Delete
        </button>
      </div>
      {notice && <Alert tone={notice.ok ? "success" : "error"}>{notice.text}</Alert>}
    </li>
  );
}

export function AllotmentManager({ allotments }: { allotments: AllotmentInfo[] }) {
  const active = allotments.filter((a) => !a.isArchived);
  const archived = allotments.filter((a) => a.isArchived);

  return (
    <div className="space-y-4">
      {active.length === 0 ? (
        <div className={cn(cardClass, "p-6 text-center font-medium")}>Create your first allotment.</div>
      ) : (
        <ul className={cn(cardClass, "divide-y divide-border")} aria-label="Active allotments">
          {active.map((a, i) => (
            <AllotmentRow key={a.id} allotment={a} isFirst={i === 0} isLast={i === active.length - 1} />
          ))}
        </ul>
      )}

      <AddAllotmentForm />

      {archived.length > 0 && (
        <section className="space-y-2">
          <h2 className="px-1 text-sm font-semibold text-muted">Archived</h2>
          <ul className={cn(cardClass, "divide-y divide-border")} aria-label="Archived allotments">
            {archived.map((a) => (
              <AllotmentRow key={a.id} allotment={a} isFirst isLast />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
