"use client";

import { useState, useTransition } from "react";
import {
  createCategoryAction,
  deleteCategoryAction,
  moveCategoryAction,
  setCategoryArchivedAction,
  updateCategoryAction,
} from "@/actions/categories";
import { Alert } from "@/components/ui/Alert";
import { Field, fieldAria } from "@/components/ui/Field";
import { ArrowDownIcon, ArrowUpIcon } from "@/components/ui/icons";
import { buttonClass, cardClass, cn, inputClass } from "@/components/ui/styles";
import { useServerForm } from "@/components/ui/useServerForm";
import type { ActionResult } from "@/lib/action-result";
import type { CategoryInfo } from "@/services/category.service";

function CategoryInputs({
  idPrefix,
  category,
  fieldErrors,
}: {
  idPrefix: string;
  category?: CategoryInfo;
  fieldErrors: Record<string, string[]>;
}) {
  return (
    <div className="grid grid-cols-[4.5rem_1fr] gap-3 sm:grid-cols-[4.5rem_1fr_9rem]">
      <Field id={`${idPrefix}-icon`} label="Icon" error={fieldErrors.icon}>
        <input
          {...fieldAria(`${idPrefix}-icon`, fieldErrors.icon)}
          name="icon"
          maxLength={8}
          placeholder="🛒"
          defaultValue={category?.icon}
          className={cn(inputClass, "text-center")}
        />
      </Field>
      <Field id={`${idPrefix}-name`} label="Name" error={fieldErrors.name}>
        <input
          {...fieldAria(`${idPrefix}-name`, fieldErrors.name)}
          name="name"
          maxLength={40}
          required
          defaultValue={category?.name}
          className={inputClass}
        />
      </Field>
      <div className="col-span-2 sm:col-span-1">
        <Field id={`${idPrefix}-type`} label="Type">
          <select id={`${idPrefix}-type`} name="type" defaultValue={category?.type ?? "EXPENSE"} className={inputClass}>
            <option value="EXPENSE">Expense</option>
            <option value="SAVING">Saving</option>
          </select>
        </Field>
      </div>
    </div>
  );
}

function AddCategoryForm() {
  const [formKey, setFormKey] = useState(0);
  const { result, pending, onSubmit, fieldErrors } = useServerForm(createCategoryAction, {
    onSuccess: () => setFormKey((k) => k + 1),
  });
  return (
    <form key={formKey} onSubmit={onSubmit} noValidate className={cn(cardClass, "space-y-3 p-4")}>
      <h2 className="font-semibold">Add a category</h2>
      <CategoryInputs idPrefix="new" fieldErrors={fieldErrors} />
      {result && <Alert tone={result.ok ? "success" : "error"}>{result.ok ? result.message : result.error}</Alert>}
      <button type="submit" disabled={pending} className={buttonClass("primary")}>
        {pending ? "Adding…" : "Add category"}
      </button>
    </form>
  );
}

function CategoryRow({
  category,
  isFirst,
  isLast,
}: {
  category: CategoryInfo;
  isFirst: boolean;
  isLast: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const form = useServerForm((fd) => updateCategoryAction(category.id, fd), {
    onSuccess: () => setEditing(false),
  });

  function run(action: () => Promise<ActionResult>, confirmText?: string) {
    if (confirmText && !window.confirm(confirmText)) return;
    startTransition(async () => {
      const res = await action();
      setError(res.ok ? null : res.error);
    });
  }

  if (editing) {
    return (
      <li className="p-4">
        <form onSubmit={form.onSubmit} noValidate className="space-y-3">
          <CategoryInputs idPrefix={`edit-${category.id}`} category={category} fieldErrors={form.fieldErrors} />
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
        {!category.isArchived && (
          <div className="flex flex-col">
            <button
              type="button"
              disabled={pending || isFirst}
              onClick={() => run(() => moveCategoryAction(category.id, "up"))}
              aria-label={`Move ${category.name} up`}
              className="flex h-8 w-10 items-center justify-center rounded-lg text-muted hover:bg-card-muted disabled:opacity-30"
            >
              <ArrowUpIcon width={18} height={18} />
            </button>
            <button
              type="button"
              disabled={pending || isLast}
              onClick={() => run(() => moveCategoryAction(category.id, "down"))}
              aria-label={`Move ${category.name} down`}
              className="flex h-8 w-10 items-center justify-center rounded-lg text-muted hover:bg-card-muted disabled:opacity-30"
            >
              <ArrowDownIcon width={18} height={18} />
            </button>
          </div>
        )}
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium">
            {category.icon && <span aria-hidden="true" className="mr-1.5">{category.icon}</span>}
            {category.name}
          </span>
          <span className="text-xs text-muted">{category.type === "SAVING" ? "Saving" : "Expense"}</span>
        </span>
        {category.isArchived ? (
          <>
            <button type="button" disabled={pending} onClick={() => run(() => setCategoryArchivedAction(category.id, false))} className={buttonClass("secondary")}>
              Restore
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                run(
                  () => deleteCategoryAction(category.id),
                  `Permanently delete “${category.name}”? This only works if it has no expenses.`,
                )
              }
              className={buttonClass("danger")}
            >
              Delete
            </button>
          </>
        ) : (
          <>
            <button type="button" onClick={() => setEditing(true)} className={buttonClass("ghost")}>
              Edit
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                run(
                  () => setCategoryArchivedAction(category.id, true),
                  `Archive “${category.name}”? It stays in past months and history, but you can't add new expenses to it.`,
                )
              }
              className={buttonClass("ghost")}
            >
              Archive
            </button>
          </>
        )}
      </div>
      {error && <Alert>{error}</Alert>}
    </li>
  );
}

export function CategoryManager({ categories }: { categories: CategoryInfo[] }) {
  const active = categories.filter((c) => !c.isArchived);
  const archived = categories.filter((c) => c.isArchived);

  return (
    <div className="space-y-4">
      {active.length === 0 ? (
        <div className={cn(cardClass, "p-6 text-center font-medium")}>Create your first budget category.</div>
      ) : (
        <ul className={cn(cardClass, "divide-y divide-border")} aria-label="Active categories">
          {active.map((c, i) => (
            <CategoryRow key={c.id} category={c} isFirst={i === 0} isLast={i === active.length - 1} />
          ))}
        </ul>
      )}

      <AddCategoryForm />

      {archived.length > 0 && (
        <section className="space-y-2">
          <h2 className="px-1 text-sm font-semibold text-muted">Archived</h2>
          <ul className={cn(cardClass, "divide-y divide-border")} aria-label="Archived categories">
            {archived.map((c) => (
              <CategoryRow key={c.id} category={c} isFirst isLast />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
