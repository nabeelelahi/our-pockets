import { currentMonthInTimeZone, isValidMonth } from "./dates";

/** A `?m=YYYY-MM` search param, falling back to the household's current month. */
export function resolveMonth(value: string | string[] | undefined, timeZone: string): string {
  return typeof value === "string" && isValidMonth(value) ? value : currentMonthInTimeZone(timeZone);
}
