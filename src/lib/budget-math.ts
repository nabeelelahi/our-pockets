import { sumAmounts } from "./money";

/** Share of the allotted amount used at which an allotment is flagged as running low. */
export const LOW_BALANCE_THRESHOLD = 0.85;

export type AllotmentStatus = "ok" | "low" | "full" | "over";

export type AllotmentSummary = {
  allocated: number;
  spent: number;
  remaining: number;
  /** Amount spent beyond the allocation (0 when not over budget). */
  overBy: number;
  /** Whole-number percentage of the allocation used, capped at 100 for display. */
  percentUsed: number;
  status: AllotmentStatus;
};

export function summarizeAllotment(allocated: number, spent: number): AllotmentSummary {
  const remaining = allocated - spent;
  const overBy = remaining < 0 ? -remaining : 0;
  const ratio = allocated > 0 ? spent / allocated : spent > 0 ? Infinity : 0;

  let status: AllotmentStatus = "ok";
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
  /** Sum of income entries. */
  moneyIn: number;
  /** Sum of expenses. */
  moneyOut: number;
  /** moneyIn - moneyOut */
  balance: number;
  /** Sum of amounts given to allotments. */
  allotted: number;
  /** moneyIn - allotted; negative means more was allotted than came in. */
  unallotted: number;
};

export function summarizeMonth(
  incomes: readonly number[],
  allocations: readonly number[],
  expenses: readonly number[],
): MonthTotals {
  const moneyIn = sumAmounts(incomes);
  const moneyOut = sumAmounts(expenses);
  const allotted = sumAmounts(allocations);
  return { moneyIn, moneyOut, balance: moneyIn - moneyOut, allotted, unallotted: moneyIn - allotted };
}
