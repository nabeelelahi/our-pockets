import { describe, expect, it } from "vitest";
import { summarizeAllotment, summarizeMonth } from "@/lib/budget-math";
import {
  addDays,
  formatDateLabel,
  formatMonthLabel,
  isValidDate,
  shiftMonth,
  todayInTimeZone,
} from "@/lib/dates";
import { formatMoney, parseWholeAmount } from "@/lib/money";
import { amountSchema, budgetAmountSchema } from "@/lib/validation";

describe("money", () => {
  it("parses whole amounts", () => {
    expect(parseWholeAmount("2500")).toBe(2500);
    expect(parseWholeAmount("2,500")).toBe(2500);
    expect(parseWholeAmount(" 300000 ")).toBe(300000);
    expect(parseWholeAmount(40)).toBe(40);
  });

  it("rejects negatives, decimals and junk", () => {
    for (const bad of ["-2500", "2.5", "2500abc", "", "1e5", 2.5, -1, NaN, null, undefined, "99999999999999999"]) {
      expect(parseWholeAmount(bad)).toBeNull();
    }
  });

  it("validates expense vs budget amounts", () => {
    expect(amountSchema.safeParse("0").success).toBe(false);
    expect(amountSchema.safeParse("").success).toBe(false);
    expect(amountSchema.parse("1")).toBe(1);
    expect(budgetAmountSchema.parse("")).toBe(0);
    expect(budgetAmountSchema.parse("0")).toBe(0);
    expect(budgetAmountSchema.safeParse("-5").success).toBe(false);
  });

  it("formats money", () => {
    expect(formatMoney(2500, "PKR")).toBe("PKR 2,500");
    expect(formatMoney(-3000, "PKR")).toBe("-PKR 3,000");
  });
});

describe("dates", () => {
  it("computes today in the household timezone, not UTC", () => {
    // 2026-09-30 21:30 UTC is already 1 October in Karachi (UTC+5).
    const instant = new Date("2026-09-30T21:30:00Z");
    expect(todayInTimeZone("Asia/Karachi", instant)).toBe("2026-10-01");
    expect(todayInTimeZone("UTC", instant)).toBe("2026-09-30");
  });

  it("shifts months across years", () => {
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
    expect(shiftMonth("2026-12", 1)).toBe("2027-01");
    expect(formatMonthLabel("2026-09")).toBe("September 2026");
  });

  it("validates calendar dates", () => {
    expect(isValidDate("2026-02-28")).toBe(true);
    expect(isValidDate("2026-02-30")).toBe(false);
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
    expect(formatDateLabel("2026-09-28", "2026-09-28")).toBe("Today");
    expect(formatDateLabel("2026-09-27", "2026-09-28")).toBe("Yesterday");
  });
});

describe("budget math", () => {
  it("handles zero expenses", () => {
    expect(summarizeAllotment(40000, 0)).toMatchObject({ remaining: 40000, overBy: 0, status: "ok", percentUsed: 0 });
  });

  it("handles one expense", () => {
    expect(summarizeAllotment(40000, 2500)).toMatchObject({ spent: 2500, remaining: 37500, status: "ok" });
  });

  it("flags spending equal to allocation as full", () => {
    expect(summarizeAllotment(40000, 40000)).toMatchObject({ remaining: 0, status: "full", percentUsed: 100 });
  });

  it("flags overspending without hiding it", () => {
    expect(summarizeAllotment(40000, 43000)).toMatchObject({ remaining: -3000, overBy: 3000, status: "over" });
    expect(summarizeAllotment(0, 500)).toMatchObject({ remaining: -500, overBy: 500, status: "over" });
  });

  it("flags low balance", () => {
    expect(summarizeAllotment(10000, 9000).status).toBe("low");
  });

  it("computes money in, money out and allotted totals", () => {
    expect(summarizeMonth([250000, 50000], [70000, 40000, 190000], [12500, 18800, 61150])).toEqual({
      moneyIn: 300000,
      moneyOut: 92450,
      balance: 207550,
      allotted: 300000,
      unallotted: 0,
    });
    expect(summarizeMonth([100000], [120000], []).unallotted).toBe(-20000);
    expect(summarizeMonth([], [], [500])).toMatchObject({ moneyIn: 0, moneyOut: 500, balance: -500 });
  });
});
