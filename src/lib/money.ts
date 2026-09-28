/**
 * Money is stored and calculated as integers of whole currency units
 * (e.g. PKR 2,500 is stored as 2500). Never use floats for money.
 */

/** Upper bound for any single amount; keeps sums far below Number.MAX_SAFE_INTEGER. */
export const MAX_AMOUNT = 1_000_000_000_000;

/**
 * Parses user input into a whole, non-negative amount.
 * Accepts integers or digit strings with optional thousands separators ("2,500").
 * Returns null for anything else ("2.5", "-10", "2500abc", "").
 */
export function parseWholeAmount(raw: unknown): number | null {
  let value: number;
  if (typeof raw === "number") {
    value = raw;
  } else if (typeof raw === "string") {
    const cleaned = raw.trim().replace(/[,\s]/g, "");
    if (!/^\d+$/.test(cleaned)) return null;
    value = Number(cleaned);
  } else {
    return null;
  }
  if (!Number.isSafeInteger(value) || value < 0 || value > MAX_AMOUNT) return null;
  return value;
}

export function formatAmount(amount: number): string {
  return Math.abs(amount).toLocaleString("en-US");
}

/** "PKR 2,500", "-PKR 3,000" */
export function formatMoney(amount: number, currency: string): string {
  return `${amount < 0 ? "-" : ""}${currency} ${formatAmount(amount)}`;
}

export function sumAmounts(values: readonly number[]): number {
  return values.reduce((total, v) => total + v, 0);
}
