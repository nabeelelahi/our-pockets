"use client";

import { useState, useTransition, type KeyboardEvent } from "react";
import { createAllotmentAction, deleteOrArchiveAllotmentAction } from "@/actions/allotments";
import { copyPreviousBudgetAction, saveBudgetAction } from "@/actions/budget";
import { Alert } from "@/components/ui/Alert";
import { CloseIcon, PlusIcon, TrashIcon } from "@/components/ui/icons";
import { buttonClass, cardClass, cn, inputClass } from "@/components/ui/styles";
import { useServerForm } from "@/components/ui/useServerForm";
import { formatMonthLabel } from "@/lib/dates";
import { formatAmount, formatMoney, parseWholeAmount } from "@/lib/money";

export type BudgetAllotment = {
  id: string;
  name: string;
  isArchived: boolean;
  inBudget: boolean;
  allocated: number;
  spent: number;
};

type Row = { id: string; name: string; isArchived: boolean; amount: string };
type Notice = { ok: boolean; text: string };

const NEW_ALLOTMENT = "__new__";

/** Live preview only; the server recomputes and validates everything. */
const preview = (value: string) => parseWholeAmount(value.trim() === "" ? "0" : value) ?? 0;
const toText = (amount: number) => (amount ? formatAmount(amount) : "");
const snapshot = (rows: Row[]) => JSON.stringify(rows.map((r) => [r.id, preview(r.amount)]));

function toRow(a: Pick<BudgetAllotment, "id" | "name" | "isArchived">, amount = ""): Row {
  return { id: a.id, name: a.name, isArchived: a.isArchived, amount };
}

export function BudgetForm({
  month,
  currency,
  moneyIn,
  previousMonth,
  allotments,
}: {
  month: string;
  currency: string;
  /** Sum of this month's income entries (updates as entries are added). */
  moneyIn: number;
  previousMonth: string | null;
  /** Every allotment relevant to this month, in display order. */
  allotments: BudgetAllotment[];
}) {
  const [rows, setRows] = useState<Row[]>(() =>
    allotments.filter((a) => a.inBudget).map((a) => toRow(a, toText(a.allocated))),
  );
  const [savedSnapshot, setSavedSnapshot] = useState(() => snapshot(rows));

  // "Add an allotment" picker.
  const [pickId, setPickId] = useState("");
  const [pickAmount, setPickAmount] = useState("");
  const [newName, setNewName] = useState("");
  const [pickerNotice, setPickerNotice] = useState<Notice | null>(null);

  const [busy, startTransition] = useTransition();
  const [notice, setNotice] = useState<Notice | null>(null);

  const { result, pending, onSubmit } = useServerForm(saveBudgetAction, {
    onSuccess: () => setSavedSnapshot(snapshot(rows)),
  });

  const inRows = new Set(rows.map((r) => r.id));
  const available = allotments.filter((a) => !a.isArchived && !inRows.has(a.id));
  const spentById = new Map(allotments.map((a) => [a.id, a.spent]));

  const allotted = rows.reduce((sum, r) => sum + preview(r.amount), 0);
  const unallotted = moneyIn - allotted;
  const dirty = snapshot(rows) !== savedSnapshot;

  function addPicked() {
    setPickerNotice(null);
    if (pickAmount.trim() !== "" && parseWholeAmount(pickAmount) === null) {
      setPickerNotice({ ok: false, text: "Please enter a valid amount." });
      return;
    }
    if (pickId === NEW_ALLOTMENT) {
      if (!newName.trim()) {
        setPickerNotice({ ok: false, text: "Please enter a name for the allotment." });
        return;
      }
      const formData = new FormData();
      formData.set("name", newName);
      const amount = pickAmount;
      startTransition(async () => {
        const res = await createAllotmentAction(formData);
        if (!res.ok) {
          setPickerNotice({ ok: false, text: res.error });
          return;
        }
        setRows((prev) => [...prev, toRow(res.data, amount)]);
        setPickerNotice({ ok: true, text: `“${res.data.name}” created and added.` });
        setPickId("");
        setPickAmount("");
        setNewName("");
      });
      return;
    }
    const allotment = available.find((a) => a.id === pickId);
    if (!allotment) {
      setPickerNotice({ ok: false, text: "Choose an allotment, or create a new one." });
      return;
    }
    setRows((prev) => [...prev, toRow(allotment, pickAmount)]);
    setPickId("");
    setPickAmount("");
  }

  function onPickerKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    // Enter adds the allotment instead of submitting the whole budget.
    if (event.key === "Enter") {
      event.preventDefault();
      addPicked();
    }
  }

  function deleteAllotment(row: Row) {
    const ok = window.confirm(
      `Delete the allotment “${row.name}”?\n\nIt's removed from every month. If it already has expenses, it's archived instead so your history stays intact.`,
    );
    if (!ok) return;
    startTransition(async () => {
      const res = await deleteOrArchiveAllotmentAction(row.id);
      if (!res.ok) {
        setNotice({ ok: false, text: res.error });
        return;
      }
      if (res.data.outcome === "deleted") {
        setRows((prev) => prev.filter((r) => r.id !== row.id));
        // The server already dropped its amount; keep "unsaved" accurate.
        setSavedSnapshot((prev) =>
          JSON.stringify((JSON.parse(prev) as [string, number][]).filter(([id]) => id !== row.id)),
        );
      } else {
        setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, isArchived: true } : r)));
      }
      setNotice({ ok: true, text: res.message ?? "Done." });
    });
  }

  function copyPrevious() {
    if (!previousMonth) return;
    if (rows.length > 0 && !window.confirm(`Replace this month's allotments with ${formatMonthLabel(previousMonth)}'s?`)) {
      return;
    }
    startTransition(async () => {
      const res = await copyPreviousBudgetAction(month);
      if (!res.ok) {
        setNotice({ ok: false, text: res.error });
        return;
      }
      const byId = new Map(allotments.map((a) => [a.id, a]));
      const nextRows = Object.entries(res.data.allocations).flatMap(([id, amount]) => {
        const a = byId.get(id);
        return a ? [toRow(a, toText(amount))] : [];
      });
      setRows(nextRows);
      setSavedSnapshot(snapshot(nextRows));
      setNotice({ ok: true, text: res.message ?? "Copied." });
    });
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <input type="hidden" name="month" value={month} />

      <section aria-labelledby="alloc-heading" className={cn(cardClass, "divide-y divide-border")}>
        <div className="flex items-baseline justify-between px-4 py-3">
          <h2 id="alloc-heading" className="font-semibold">
            Allotments
          </h2>
          <span className="text-xs text-muted">{rows.length} this month</span>
        </div>

        {previousMonth && (
          <div className="flex flex-wrap items-center gap-3 px-4 py-3">
            <button type="button" onClick={copyPrevious} disabled={busy} className={buttonClass("secondary")}>
              Copy from {formatMonthLabel(previousMonth)}
            </button>
            <span className="text-xs text-muted">Copies allotted amounts only. Unspent money does not roll over.</span>
          </div>
        )}
        {notice && (
          <div className="px-4 py-3">
            <Alert tone={notice.ok ? "success" : "error"}>{notice.text}</Alert>
          </div>
        )}

        {rows.length === 0 && (
          <p className="px-4 py-6 text-center text-sm text-muted">
            No allotments yet. Create one below and give it an amount.
          </p>
        )}

        {rows.map((r) => {
          const spent = spentById.get(r.id) ?? 0;
          return (
            <div key={r.id} className="flex items-center gap-2 px-4 py-2.5">
              <label htmlFor={`alloc-${r.id}`} className="min-w-0 flex-1">
                <span className="block truncate font-medium">{r.name}</span>
                {(spent > 0 || r.isArchived) && (
                  <span className="tabular block text-xs text-muted">
                    {r.isArchived && "Archived · "}
                    {spent > 0 && `Spent ${formatMoney(spent, currency)}`}
                  </span>
                )}
              </label>
              {/* Fixed-width wrapper: inputClass is w-full, so width is set here. */}
              <div className="w-28 shrink-0 sm:w-36">
                <input
                  id={`alloc-${r.id}`}
                  name={`alloc:${r.id}`}
                  inputMode="numeric"
                  pattern="[0-9,]*"
                  autoComplete="off"
                  placeholder="0"
                  value={r.amount}
                  onChange={(e) => {
                    const value = e.target.value;
                    setRows((prev) => prev.map((x) => (x.id === r.id ? { ...x, amount: value } : x)));
                  }}
                  className={cn(inputClass, "tabular text-right font-medium")}
                />
              </div>
              <button
                type="button"
                onClick={() => setRows((prev) => prev.filter((x) => x.id !== r.id))}
                aria-label={`Remove ${r.name} from this month`}
                title="Remove from this month"
                className="flex h-11 w-10 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-card-muted hover:text-fg"
              >
                <CloseIcon width={18} height={18} />
              </button>
              <button
                type="button"
                onClick={() => deleteAllotment(r)}
                disabled={busy}
                aria-label={`Delete allotment ${r.name}`}
                title="Delete allotment"
                className="flex h-11 w-10 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-danger-soft hover:text-danger disabled:opacity-40"
              >
                <TrashIcon width={18} height={18} />
              </button>
            </div>
          );
        })}

        <div className="space-y-3 bg-card-muted/50 px-4 py-4">
          <p className="text-sm font-medium">Add an allotment</p>
          <div className="grid grid-cols-[1fr_7rem] gap-2 sm:grid-cols-[1fr_9rem_auto]">
            <label htmlFor="pick-allotment" className="sr-only">
              Allotment
            </label>
            <select
              id="pick-allotment"
              value={pickId}
              onChange={(e) => {
                setPickId(e.target.value);
                setPickerNotice(null);
              }}
              className={inputClass}
            >
              <option value="">{available.length ? "Choose an allotment…" : "Choose…"}</option>
              {available.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
              <option value={NEW_ALLOTMENT}>＋ Create a new allotment…</option>
            </select>
            <label htmlFor="pick-amount" className="sr-only">
              Amount
            </label>
            <input
              id="pick-amount"
              inputMode="numeric"
              pattern="[0-9,]*"
              autoComplete="off"
              placeholder="Amount"
              value={pickAmount}
              onChange={(e) => setPickAmount(e.target.value)}
              onKeyDown={onPickerKeyDown}
              className={cn(inputClass, "tabular text-right")}
            />
            {pickId === NEW_ALLOTMENT && (
              <div className="col-span-2 sm:order-last sm:col-span-3">
                <label htmlFor="new-name" className="sr-only">
                  New allotment name
                </label>
                <input
                  id="new-name"
                  maxLength={40}
                  placeholder="Name, e.g. School fees"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={onPickerKeyDown}
                  autoFocus
                  className={inputClass}
                />
              </div>
            )}
            <button
              type="button"
              onClick={addPicked}
              disabled={busy}
              className={buttonClass("secondary", "col-span-2 sm:col-span-1")}
            >
              <PlusIcon width={18} height={18} />
              {pickId === NEW_ALLOTMENT ? "Create & add" : "Add"}
            </button>
          </div>
          {pickerNotice && <Alert tone={pickerNotice.ok ? "success" : "error"}>{pickerNotice.text}</Alert>}
          {available.length > 1 && (
            <button
              type="button"
              onClick={() => setRows((prev) => [...prev, ...available.map((a) => toRow(a))])}
              className="text-sm font-medium text-accent"
            >
              Add all {available.length} remaining allotments
            </button>
          )}
        </div>
      </section>

      <section
        aria-label="Allotment totals"
        className={cn(
          cardClass,
          "tabular sticky bottom-[calc(4.5rem+env(safe-area-inset-bottom))] space-y-2 p-4 shadow-sm md:bottom-4",
        )}
      >
        <div className="flex justify-between text-sm">
          <span className="text-muted">Money in</span>
          <span className="font-semibold">{formatMoney(moneyIn, currency)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted">Allotted</span>
          <span className="font-semibold">{formatMoney(allotted, currency)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted">Not allotted</span>
          <span className={cn("font-semibold", unallotted < 0 && "text-danger")}>{formatMoney(unallotted, currency)}</span>
        </div>
        {unallotted < 0 && (
          <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm font-medium text-danger">
            ⚠ You have allotted {formatMoney(-unallotted, currency)} more than came in.
          </p>
        )}
        {result && !dirty && (
          <Alert tone={result.ok ? "success" : "error"}>{result.ok ? result.message : result.error}</Alert>
        )}
        {result && !result.ok && dirty && <Alert>{result.error}</Alert>}
        <button type="submit" disabled={pending} className={buttonClass("primary", "w-full")}>
          {pending ? "Saving…" : dirty ? "Save allotments · unsaved changes" : "Save allotments"}
        </button>
      </section>
    </form>
  );
}
