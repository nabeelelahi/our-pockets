import { describe, expect, it } from "vitest";
import {
  createAllotment,
  deleteOrArchiveAllotment,
  listAllotments,
  renameAllotment,
  setAllotmentArchived,
} from "@/services/allotment.service";
import { copyPreviousBudget, getMonthOverview, saveBudget } from "@/services/budget.service";
import { createIncome, deleteIncome, listIncomes, updateIncome } from "@/services/income.service";
import {
  createTransaction,
  deleteTransaction,
  listTransactions,
  updateTransaction,
} from "@/services/transaction.service";
import { makeHousehold } from "./helpers";

const MONTH = "2026-09";

async function setup() {
  const h = await makeHousehold();
  await createIncome(h.owner.id, {
    amount: "250,000",
    source: "Salary",
    receivedByUserId: h.owner.id,
    receivedDate: "2026-09-01",
  });
  await createIncome(h.owner.id, {
    amount: "50000",
    source: "Freelance",
    receivedByUserId: h.spouse.id,
    receivedDate: "2026-09-15",
  });
  await saveBudget(h.owner.id, {
    month: MONTH,
    allocations: [
      { allotmentId: h.food.id, allocatedAmount: "40000" },
      { allotmentId: h.household.id, allocatedAmount: "70000" },
    ],
  });
  const expense = (amount: number, allotmentId = h.food.id, date = "2026-09-10", paidBy = h.owner.id) =>
    createTransaction(h.owner.id, {
      amount: String(amount),
      allotmentId,
      description: "",
      paidByUserId: paidBy,
      transactionDate: date,
    });
  const row = async (allotmentId: string, userId = h.owner.id) =>
    (await getMonthOverview(userId, MONTH)).allotments.find((a) => a.id === allotmentId)!;
  const totals = async () => (await getMonthOverview(h.owner.id, MONTH)).totals;
  return { ...h, expense, row, totals };
}

describe("money in and money out", () => {
  it("sums income entries as money in", async () => {
    const { totals } = await setup();
    expect(await totals()).toEqual({
      moneyIn: 300000,
      moneyOut: 0,
      balance: 300000,
      allotted: 110000,
      unallotted: 190000,
    });
  });

  it("counts expenses as money out", async () => {
    const { expense, household, totals } = await setup();
    await expense(2500);
    await expense(18800, household.id);
    expect(await totals()).toMatchObject({ moneyOut: 21300, balance: 300000 - 21300 });
  });

  it("edits, moves and deletes income entries", async () => {
    const { owner, spouse, totals } = await setup();
    const [freelance] = await listIncomes(owner.id, MONTH);
    expect(freelance).toMatchObject({ source: "Freelance", amount: 50000, receivedByName: spouse.name });

    await updateIncome(owner.id, freelance.id, {
      amount: "60000",
      source: "Freelance",
      receivedByUserId: spouse.id,
      receivedDate: "2026-09-15",
    });
    expect((await totals()).moneyIn).toBe(310000);

    // Changing the date to another month moves it to that month's money in.
    await updateIncome(owner.id, freelance.id, {
      amount: "60000",
      source: "Freelance",
      receivedByUserId: spouse.id,
      receivedDate: "2026-10-02",
    });
    expect((await totals()).moneyIn).toBe(250000);
    expect((await getMonthOverview(owner.id, "2026-10")).totals.moneyIn).toBe(60000);

    await deleteIncome(owner.id, freelance.id);
    expect((await getMonthOverview(owner.id, "2026-10")).totals.moneyIn).toBe(0);
  });

  it("rejects invalid income", async () => {
    const { owner } = await setup();
    const base = { source: "", receivedByUserId: owner.id, receivedDate: "2026-09-01" };
    await expect(createIncome(owner.id, { ...base, amount: "0" })).rejects.toThrow();
    await expect(createIncome(owner.id, { ...base, amount: "2.5" })).rejects.toThrow();
    await expect(createIncome(owner.id, { ...base, amount: "100", receivedDate: "2026-02-30" })).rejects.toThrow();
  });

  it("reports allotting more than came in as negative unallotted", async () => {
    const { owner, food, totals } = await setup();
    await saveBudget(owner.id, { month: MONTH, allocations: [{ allotmentId: food.id, allocatedAmount: "350000" }] });
    expect((await totals()).unallotted).toBe(300000 - 350000);
  });
});

describe("allotment balances", () => {
  it("has the full allotted amount with zero expenses", async () => {
    const { food, row } = await setup();
    expect(await row(food.id)).toMatchObject({ allocated: 40000, spent: 0, remaining: 40000, inBudget: true });
  });

  it("subtracts one expense and reports what is left", async () => {
    const { food, expense, row } = await setup();
    const saved = await expense(2500);
    expect(saved).toMatchObject({ allotmentName: "Food", allotment: { remaining: 37500 } });
    expect(await row(food.id)).toMatchObject({ spent: 2500, remaining: 37500 });
  });

  it("sums multiple expenses", async () => {
    const { food, expense, row } = await setup();
    await expense(2500);
    await expense(4000);
    await expense(6000);
    expect(await row(food.id)).toMatchObject({ spent: 12500, remaining: 27500 });
  });

  it("handles spending equal to the allotted amount", async () => {
    const { food, expense, row } = await setup();
    await expense(40000);
    expect(await row(food.id)).toMatchObject({ remaining: 0, status: "full" });
  });

  it("allows and shows overspending", async () => {
    const { food, expense, row } = await setup();
    await expense(43000);
    expect(await row(food.id)).toMatchObject({ remaining: -3000, overBy: 3000, status: "over" });
  });

  it("recalculates when an expense amount is edited", async () => {
    const { food, owner, expense, row } = await setup();
    const saved = await expense(2500);
    await updateTransaction(owner.id, saved.id, {
      amount: "3000",
      allotmentId: food.id,
      description: "",
      paidByUserId: owner.id,
      transactionDate: "2026-09-10",
    });
    expect(await row(food.id)).toMatchObject({ spent: 3000, remaining: 37000 });
  });

  it("restores the balance when an expense is deleted", async () => {
    const { food, owner, expense, row } = await setup();
    await expense(10000);
    const saved = await expense(2500);
    await deleteTransaction(owner.id, saved.id);
    expect(await row(food.id)).toMatchObject({ spent: 10000, remaining: 30000 });
  });

  it("updates both allotments when an expense moves to another allotment", async () => {
    const { food, household, owner, expense, row } = await setup();
    const saved = await expense(2500);
    await updateTransaction(owner.id, saved.id, {
      amount: "2500",
      allotmentId: household.id,
      description: "",
      paidByUserId: owner.id,
      transactionDate: "2026-09-10",
    });
    expect(await row(food.id)).toMatchObject({ spent: 0, remaining: 40000 });
    expect(await row(household.id)).toMatchObject({ spent: 2500, remaining: 67500 });
  });

  it("moves an expense to another month when its date changes month", async () => {
    const { food, owner, expense, row } = await setup();
    const saved = await expense(2500);
    await updateTransaction(owner.id, saved.id, {
      amount: "2500",
      allotmentId: food.id,
      description: "",
      paidByUserId: owner.id,
      transactionDate: "2026-10-01",
    });
    expect(await row(food.id)).toMatchObject({ spent: 0 });
    const october = await getMonthOverview(owner.id, "2026-10");
    expect(october.allotments.find((a) => a.id === food.id)).toMatchObject({ spent: 2500, remaining: -2500 });
  });

  it("lists every expense recorded against an allotment", async () => {
    const { food, household, owner, expense } = await setup();
    await expense(2500);
    await expense(4000);
    await expense(9000, household.id);
    const foodExpenses = await listTransactions(owner.id, { month: MONTH, allotmentId: food.id });
    expect(foodExpenses.map((t) => t.amount).sort()).toEqual([2500, 4000]);
    expect(foodExpenses[0].allotmentName).toBe("Food");
  });

  it("is shared: the spouse sees the owner's expense", async () => {
    const { food, spouse, expense, row } = await setup();
    await expense(2500);
    expect(await row(food.id, spouse.id)).toMatchObject({ spent: 2500, remaining: 37500 });
  });
});

describe("monthly allotments", () => {
  it("reuses the same allotments across months with different amounts", async () => {
    const { owner, food } = await setup();
    await saveBudget(owner.id, { month: "2026-10", allocations: [{ allotmentId: food.id, allocatedAmount: "45000" }] });
    const [sep, oct] = await Promise.all([getMonthOverview(owner.id, MONTH), getMonthOverview(owner.id, "2026-10")]);
    expect(sep.allotments.find((a) => a.id === food.id)?.allocated).toBe(40000);
    expect(oct.allotments.find((a) => a.id === food.id)?.allocated).toBe(45000);

    // Renaming applies everywhere.
    await renameAllotment(owner.id, food.id, { name: "Groceries" });
    expect((await getMonthOverview(owner.id, MONTH)).allotments.find((a) => a.id === food.id)?.name).toBe("Groceries");
  });

  it("treats the saved list as the month's full plan", async () => {
    const { owner, food, household, row, totals } = await setup();
    await saveBudget(owner.id, { month: MONTH, allocations: [{ allotmentId: food.id, allocatedAmount: "40000" }] });
    expect(await row(household.id)).toMatchObject({ inBudget: false, allocated: 0 });
    expect((await totals()).allotted).toBe(40000);

    await saveBudget(owner.id, {
      month: MONTH,
      allocations: [
        { allotmentId: food.id, allocatedAmount: "40000" },
        { allotmentId: household.id, allocatedAmount: "" },
      ],
    });
    expect(await row(household.id)).toMatchObject({ inBudget: true, allocated: 0 });
  });

  it("copies allotted amounts from the previous month, but not income or spending", async () => {
    const { owner, food, expense } = await setup();
    await expense(5000);
    const { fromMonth } = await copyPreviousBudget(owner.id, "2026-10");
    expect(fromMonth).toBe(MONTH);
    const october = await getMonthOverview(owner.id, "2026-10");
    expect(october.totals).toMatchObject({ moneyIn: 0, allotted: 110000, moneyOut: 0 });
    expect(october.allotments.find((a) => a.id === food.id)).toMatchObject({ allocated: 40000, remaining: 40000 });
  });

  it("rejects duplicate allotment names", async () => {
    const { owner } = await setup();
    await expect(createAllotment(owner.id, { name: "food" })).rejects.toThrow("already exists");
    await expect(createAllotment(owner.id, { name: "  " })).rejects.toThrow();
  });
});

describe("archiving and deleting allotments", () => {
  it("does not allow new expenses in archived allotments, and keeps them in history", async () => {
    const { owner, food, expense } = await setup();
    await expense(2500);
    await setAllotmentArchived(owner.id, food.id, true);
    await expect(expense(100)).rejects.toThrow("archived");
    const overview = await getMonthOverview(owner.id, MONTH);
    expect(overview.allotments.find((a) => a.id === food.id)).toMatchObject({ isArchived: true, spent: 2500 });
    expect((await listAllotments(owner.id)).map((a) => a.name)).toEqual(["Household"]);
  });

  it("deletes unused allotments and archives ones with expenses", async () => {
    const { owner, food, household, expense, totals } = await setup();
    await expense(2500);
    expect(await deleteOrArchiveAllotment(owner.id, food.id)).toBe("archived");
    expect(await deleteOrArchiveAllotment(owner.id, household.id)).toBe("deleted");
    const overview = await getMonthOverview(owner.id, MONTH);
    expect(overview.allotments.map((a) => [a.name, a.isArchived, a.spent])).toEqual([["Food", true, 2500]]);
    expect((await totals()).allotted).toBe(40000);
  });

  it("rejects invalid expense amounts", async () => {
    const { expense } = await setup();
    await expect(expense(0)).rejects.toThrow();
    await expect(expense(-5)).rejects.toThrow();
    await expect(expense(2.5)).rejects.toThrow();
  });

  it("filters expenses by allotment, person, date and description", async () => {
    const { owner, spouse, food, household } = await setup();
    const add = (amount: string, allotmentId: string, paidByUserId: string, date: string, description: string) =>
      createTransaction(owner.id, { amount, allotmentId, paidByUserId, transactionDate: date, description });
    await add("2500", food.id, owner.id, "2026-09-10", "Dinner out");
    await add("4000", household.id, spouse.id, "2026-09-11", "Cleaning supplies");
    await add("100", food.id, spouse.id, "2026-08-31", "Snacks");

    expect(await listTransactions(owner.id, { month: MONTH })).toHaveLength(2);
    expect(await listTransactions(owner.id, { month: MONTH, paidByUserId: spouse.id })).toHaveLength(1);
    expect(await listTransactions(owner.id, { month: MONTH, date: "2026-09-11" })).toHaveLength(1);
    const [hit] = await listTransactions(owner.id, { month: MONTH, q: "dinner" });
    expect(hit).toMatchObject({ amount: 2500, allotmentName: "Food", paidByName: owner.name });
    expect(await listTransactions(owner.id, { month: MONTH, q: ".*" })).toHaveLength(0);
  });
});
