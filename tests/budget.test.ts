import { describe, expect, it } from "vitest";
import { copyPreviousBudget, getMonthOverview, saveBudget } from "@/services/budget.service";
import { deleteCategory, setCategoryArchived } from "@/services/category.service";
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
  await saveBudget(h.owner.id, {
    month: MONTH,
    totalIncome: "300,000",
    allocations: [
      { categoryId: h.food.id, allocatedAmount: "40000" },
      { categoryId: h.household.id, allocatedAmount: "70000" },
    ],
  });
  const expense = (amount: number, categoryId = h.food.id, date = "2026-09-10", paidBy = h.owner.id) =>
    createTransaction(h.owner.id, {
      amount: String(amount),
      categoryId,
      description: "",
      paidByUserId: paidBy,
      transactionDate: date,
    });
  const row = async (categoryId: string, userId = h.owner.id) =>
    (await getMonthOverview(userId, MONTH)).categories.find((c) => c.id === categoryId)!;
  return { ...h, expense, row };
}

describe("budget calculations", () => {
  it("has full remaining balance with zero expenses", async () => {
    const { food, row, owner } = await setup();
    expect(await row(food.id)).toMatchObject({ allocated: 40000, spent: 0, remaining: 40000 });
    expect((await getMonthOverview(owner.id, MONTH)).totals).toEqual({
      income: 300000,
      allocated: 110000,
      spent: 0,
      unallocated: 190000,
      remaining: 300000,
    });
  });

  it("subtracts one expense and reports the new remaining balance", async () => {
    const { food, expense, row } = await setup();
    const saved = await expense(2500);
    expect(saved.category.remaining).toBe(37500);
    expect(await row(food.id)).toMatchObject({ spent: 2500, remaining: 37500 });
  });

  it("sums multiple expenses", async () => {
    const { food, expense, row, owner } = await setup();
    await expense(2500);
    await expense(4000);
    await expense(6000);
    expect(await row(food.id)).toMatchObject({ spent: 12500, remaining: 27500 });
    expect((await getMonthOverview(owner.id, MONTH)).totals.remaining).toBe(300000 - 12500);
  });

  it("handles spending equal to the allocation", async () => {
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
      categoryId: food.id,
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

  it("updates both categories when an expense moves category", async () => {
    const { food, household, owner, expense, row } = await setup();
    const saved = await expense(2500);
    await updateTransaction(owner.id, saved.id, {
      amount: "2500",
      categoryId: household.id,
      description: "",
      paidByUserId: owner.id,
      transactionDate: "2026-09-10",
    });
    expect(await row(food.id)).toMatchObject({ spent: 0, remaining: 40000 });
    expect(await row(household.id)).toMatchObject({ spent: 2500, remaining: 67500 });
  });

  it("moves an expense to another month's budget when its date changes month", async () => {
    const { food, owner, expense, row } = await setup();
    const saved = await expense(2500);
    await updateTransaction(owner.id, saved.id, {
      amount: "2500",
      categoryId: food.id,
      description: "",
      paidByUserId: owner.id,
      transactionDate: "2026-10-01",
    });
    expect(await row(food.id)).toMatchObject({ spent: 0 });
    const october = await getMonthOverview(owner.id, "2026-10");
    expect(october.categories.find((c) => c.id === food.id)).toMatchObject({ spent: 2500, remaining: -2500 });
  });

  it("is shared: the spouse sees the owner's expense", async () => {
    const { food, spouse, expense, row } = await setup();
    await expense(2500);
    expect(await row(food.id, spouse.id)).toMatchObject({ spent: 2500, remaining: 37500 });
  });

  it("reports over-allocation as negative unallocated", async () => {
    const { owner, food } = await setup();
    await saveBudget(owner.id, {
      month: MONTH,
      totalIncome: "30000",
      allocations: [{ categoryId: food.id, allocatedAmount: "50000" }],
    });
    expect((await getMonthOverview(owner.id, MONTH)).totals.unallocated).toBe(30000 - 50000 - 70000);
  });

  it("copies income and allocations from the previous month without rollover", async () => {
    const { owner, food, expense } = await setup();
    await expense(5000);
    const { fromMonth } = await copyPreviousBudget(owner.id, "2026-10");
    expect(fromMonth).toBe(MONTH);
    const october = await getMonthOverview(owner.id, "2026-10");
    expect(october.totals).toMatchObject({ income: 300000, allocated: 110000, spent: 0 });
    expect(october.categories.find((c) => c.id === food.id)).toMatchObject({ allocated: 40000, remaining: 40000 });
  });
});

describe("transactions", () => {
  it("filters by category, person, date and description", async () => {
    const { owner, spouse, food, household } = await setup();
    const add = (amount: string, categoryId: string, paidByUserId: string, date: string, description: string) =>
      createTransaction(owner.id, { amount, categoryId, paidByUserId, transactionDate: date, description });
    await add("2500", food.id, owner.id, "2026-09-10", "Dinner out");
    await add("4000", household.id, spouse.id, "2026-09-11", "Cleaning supplies");
    await add("100", food.id, spouse.id, "2026-08-31", "Snacks");

    expect(await listTransactions(owner.id, { month: MONTH })).toHaveLength(2);
    expect(await listTransactions(owner.id, { month: MONTH, categoryId: food.id })).toHaveLength(1);
    expect(await listTransactions(owner.id, { month: MONTH, paidByUserId: spouse.id })).toHaveLength(1);
    expect(await listTransactions(owner.id, { month: MONTH, date: "2026-09-11" })).toHaveLength(1);
    const [hit] = await listTransactions(owner.id, { month: MONTH, q: "dinner" });
    expect(hit).toMatchObject({ amount: 2500, categoryName: "Food", paidByName: owner.name });
    expect(await listTransactions(owner.id, { month: MONTH, q: ".*" })).toHaveLength(0);
  });

  it("rejects invalid amounts", async () => {
    const { expense } = await setup();
    await expect(expense(0)).rejects.toThrow();
    await expect(expense(-5)).rejects.toThrow();
    await expect(expense(2.5)).rejects.toThrow();
  });

  it("does not allow new expenses in archived categories, and keeps them in history", async () => {
    const { owner, food, expense } = await setup();
    await expense(2500);
    await setCategoryArchived(owner.id, food.id, true);
    await expect(expense(100)).rejects.toThrow("archived");
    const overview = await getMonthOverview(owner.id, MONTH);
    expect(overview.categories.find((c) => c.id === food.id)).toMatchObject({ isArchived: true, spent: 2500 });
  });

  it("does not delete categories that have expenses", async () => {
    const { owner, food, household, expense } = await setup();
    await expense(2500);
    await expect(deleteCategory(owner.id, food.id)).rejects.toThrow("Archive it instead");
    await expect(deleteCategory(owner.id, household.id)).resolves.toBeUndefined();
  });
});
