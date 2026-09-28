import { sumAmounts } from "./money";

/** Share of the allocation used at which a category is flagged as running low. */
export const LOW_BALANCE_THRESHOLD = 0.85;

export type CategoryStatus = "ok" | "low" | "full" | "over";

export type CategorySummary = {
  allocated: number;
  spent: number;
  remaining: number;
  /** Amount spent beyond the allocation (0 when not over budget). */
  overBy: number;
  /** Whole-number percentage of the allocation used, capped at 100 for display. */
  percentUsed: number;
  status: CategoryStatus;
};

export function summarizeCategory(allocated: number, spent: number): CategorySummary {
  const remaining = allocated - spent;
  const overBy = remaining < 0 ? -remaining : 0;
  const ratio = allocated > 0 ? spent / allocated : spent > 0 ? Infinity : 0;

  let status: CategoryStatus = "ok";
  if (spent > allocated) status = "over";
  else if (allocated > 0 && spent === allocated) status = "full";
  else if (ratio >= LOW_BALANCE_THRESHOLD) status = "low";

  return {
    allocated,
    spent,
    remaining,
    overBy,
    percentUsed: Math.min(100, Math.floor(Number.isFinite(ratio) ? ratio * 100 : 100)),
    status,
  };
}

export type MonthTotals = {
  income: number;
  allocated: number;
  spent: number;
  /** income - allocated; negative means over-allocated. */
  unallocated: number;
  /** income - spent */
  remaining: number;
};

export function summarizeMonth(
  income: number,
  allocations: readonly number[],
  expenses: readonly number[],
): MonthTotals {
  const allocated = sumAmounts(allocations);
  const spent = sumAmounts(expenses);
  return {
    income,
    allocated,
    spent,
    unallocated: income - allocated,
    remaining: income - spent,
  };
}
