import { describe, expect, it } from "vitest";
import { Invitation } from "@/models/Invitation";
import { getMonthOverview, saveBudget } from "@/services/budget.service";
import {
  deleteOrArchiveAllotment,
  getAllotment,
  listAllotments,
  renameAllotment,
} from "@/services/allotment.service";
import { createIncome, deleteIncome, listIncomes, updateIncome } from "@/services/income.service";
import { createHousehold, getMembership, removeMember } from "@/services/household.service";
import {
  acceptInvitation,
  createInvitation,
  hashInvitationToken,
  INVITATION_TTL_MS,
  previewInvitation,
} from "@/services/invitation.service";
import {
  createTransaction,
  deleteTransaction,
  getTransaction,
  listTransactions,
  updateTransaction,
} from "@/services/transaction.service";
import { makeHousehold, makeUser } from "./helpers";

const MONTH = "2026-09";

async function twoHouseholds() {
  const a = await makeHousehold("A");
  const b = await makeHousehold("B");
  await saveBudget(a.owner.id, {
    month: MONTH,
    allocations: [{ allotmentId: a.food.id, allocatedAmount: "40000" }],
  });
  const aTx = await createTransaction(a.owner.id, {
    amount: "2500",
    allotmentId: a.food.id,
    description: "Private dinner",
    paidByUserId: a.owner.id,
    transactionDate: "2026-09-10",
  });
  await createIncome(a.owner.id, {
    amount: "300000",
    source: "Salary",
    receivedByUserId: a.owner.id,
    receivedDate: "2026-09-01",
  });
  const [aIncome] = await listIncomes(a.owner.id, MONTH);
  return { a, b, aTx, aIncome };
}

describe("household isolation", () => {
  it("lets members access their own household", async () => {
    const { a } = await twoHouseholds();
    const overview = await getMonthOverview(a.spouse.id, MONTH);
    expect(overview.totals.moneyOut).toBe(2500);
    expect(overview.household.name).toBe("Household A");
  });

  it("never shows another household's data", async () => {
    const { b } = await twoHouseholds();
    const overview = await getMonthOverview(b.owner.id, MONTH);
    expect(overview.household.name).toBe("Household B");
    expect(overview.totals).toMatchObject({ moneyIn: 0, moneyOut: 0 });
    expect(await listTransactions(b.owner.id, { month: MONTH })).toHaveLength(0);
    expect((await listAllotments(b.owner.id)).map((c) => c.name)).toEqual(["Food", "Household"]);
    expect(await listIncomes(b.owner.id, MONTH)).toHaveLength(0);
  });

  it("denies access to users without a household", async () => {
    await twoHouseholds();
    const loner = await makeUser("Loner");
    await expect(getMonthOverview(loner.id, MONTH)).rejects.toThrow("Create or join a household first.");
    await expect(listTransactions(loner.id, { month: MONTH })).rejects.toThrow();
  });

  it("cannot read another household's transaction", async () => {
    const { b, aTx } = await twoHouseholds();
    await expect(getTransaction(b.owner.id, aTx.id)).rejects.toThrow("This expense no longer exists.");
  });

  it("cannot edit or delete another household's transaction", async () => {
    const { a, b, aTx } = await twoHouseholds();
    await expect(
      updateTransaction(b.owner.id, aTx.id, {
        amount: "1",
        allotmentId: b.food.id,
        description: "",
        paidByUserId: b.owner.id,
        transactionDate: "2026-09-10",
      }),
    ).rejects.toThrow("This expense no longer exists.");
    await expect(deleteTransaction(b.owner.id, aTx.id)).rejects.toThrow("This expense no longer exists.");
    expect(await getTransaction(a.owner.id, aTx.id)).toMatchObject({ amount: 2500 });
  });

  it("cannot create an expense in another household's allotment or for its members", async () => {
    const { a, b } = await twoHouseholds();
    await expect(
      createTransaction(b.owner.id, {
        amount: "100",
        allotmentId: a.food.id,
        description: "",
        paidByUserId: b.owner.id,
        transactionDate: "2026-09-10",
      }),
    ).rejects.toThrow("This allotment no longer exists.");
    await expect(
      createTransaction(b.owner.id, {
        amount: "100",
        allotmentId: b.food.id,
        description: "",
        paidByUserId: a.owner.id,
        transactionDate: "2026-09-10",
      }),
    ).rejects.toThrow("Choose a member of your household.");
  });

  it("cannot modify another household's budget or allotments", async () => {
    const { a, b } = await twoHouseholds();
    await expect(
      saveBudget(b.owner.id, {
        month: MONTH,
        allocations: [{ allotmentId: a.food.id, allocatedAmount: "1" }],
      }),
    ).rejects.toThrow("This allotment no longer exists.");
    await expect(renameAllotment(b.owner.id, a.food.id, { name: "Hacked" })).rejects.toThrow();
    await expect(getAllotment(b.owner.id, a.food.id)).rejects.toThrow("This allotment no longer exists.");
    await expect(deleteOrArchiveAllotment(b.owner.id, a.food.id)).rejects.toThrow("This allotment no longer exists.");
    const overview = await getMonthOverview(a.owner.id, MONTH);
    expect(overview.allotments.find((c) => c.id === a.food.id)).toMatchObject({ name: "Food", allocated: 40000 });
  });

  it("cannot read, change or delete another household's income", async () => {
    const { a, b, aIncome } = await twoHouseholds();
    const input = { amount: "1", source: "x", receivedByUserId: b.owner.id, receivedDate: "2026-09-01" };
    await expect(updateIncome(b.owner.id, aIncome.id, input)).rejects.toThrow("This income entry no longer exists.");
    await expect(deleteIncome(b.owner.id, aIncome.id)).rejects.toThrow("This income entry no longer exists.");
    await expect(
      createIncome(b.owner.id, { ...input, receivedByUserId: a.owner.id }),
    ).rejects.toThrow("Choose a member of your household.");
    expect((await getMonthOverview(a.owner.id, MONTH)).totals.moneyIn).toBe(300000);
  });

  it("only lets the owner remove members", async () => {
    const { a } = await twoHouseholds();
    await expect(removeMember(a.spouse.id, a.owner.id)).rejects.toThrow("Only the household owner");
    await removeMember(a.owner.id, a.spouse.id);
    expect(await getMembership(a.spouse.id)).toBeNull();
    // Their past expenses stay in the household history.
    expect((await listTransactions(a.owner.id, { month: MONTH }))[0].paidByName).toBe(a.owner.name);
  });
});

describe("invitations", () => {
  async function ownerWithHousehold() {
    const owner = await makeUser("Owner");
    await createHousehold(owner.id, { name: "Home", useDefaultAllotments: true });
    return owner;
  }

  it("stores only a hash of the token", async () => {
    const owner = await ownerWithHousehold();
    const { token } = await createInvitation(owner.id);
    expect(await Invitation.exists({ tokenHash: token })).toBeNull();
    expect(await Invitation.exists({ tokenHash: hashInvitationToken(token) })).not.toBeNull();
  });

  it("previews without exposing financial data", async () => {
    const owner = await ownerWithHousehold();
    const { token } = await createInvitation(owner.id);
    const preview = await previewInvitation(token);
    expect(preview).toMatchObject({ status: "valid", householdName: "Home", invitedByName: owner.name });
    expect(Object.keys(preview).sort()).toEqual(["expiresAt", "householdName", "invitedByName", "status"]);
  });

  it("lets the spouse join and share the household", async () => {
    const owner = await ownerWithHousehold();
    const spouse = await makeUser("Spouse");
    const { token } = await createInvitation(owner.id);
    await acceptInvitation(spouse.id, token);
    const [a, b] = await Promise.all([getMembership(owner.id), getMembership(spouse.id)]);
    expect(b?.household.id).toBe(a?.household.id);
    expect(b?.role).toBe("MEMBER");
    expect(await listAllotments(spouse.id)).toHaveLength(10);
  });

  it("cannot be reused", async () => {
    const owner = await ownerWithHousehold();
    const spouse = await makeUser("Spouse");
    const third = await makeUser("Third");
    const { token } = await createInvitation(owner.id);
    await acceptInvitation(spouse.id, token);
    await expect(acceptInvitation(third.id, token)).rejects.toThrow("already been used");
    expect(await getMembership(third.id)).toBeNull();
    expect((await previewInvitation(token)).status).toBe("used");
  });

  it("cannot be accepted after expiry", async () => {
    const owner = await ownerWithHousehold();
    const spouse = await makeUser("Spouse");
    const { token } = await createInvitation(owner.id);
    const later = new Date(Date.now() + INVITATION_TTL_MS + 1000);
    await expect(acceptInvitation(spouse.id, token, later)).rejects.toThrow("This invitation has expired.");
    expect(await getMembership(spouse.id)).toBeNull();
  });

  it("rejects invalid tokens", async () => {
    const spouse = await makeUser("Spouse");
    await expect(acceptInvitation(spouse.id, "x".repeat(43))).rejects.toThrow("invalid");
    await expect(acceptInvitation(spouse.id, "short")).rejects.toThrow("invalid");
    expect((await previewInvitation("x".repeat(43))).status).toBe("invalid");
  });

  it("cannot add a third member", async () => {
    const { owner } = await makeHousehold("Full");
    await expect(createInvitation(owner.id)).rejects.toThrow("already has two members");
  });

  it("cannot be accepted by someone already in a household", async () => {
    const owner = await ownerWithHousehold();
    const other = await ownerWithHousehold();
    const { token } = await createInvitation(owner.id);
    await expect(acceptInvitation(other.id, token)).rejects.toThrow("You already belong to a household.");
    // The failed attempt must not consume the invitation.
    expect((await previewInvitation(token)).status).toBe("valid");
  });

  it("can only be created by the owner", async () => {
    const { spouse } = await makeHousehold("M");
    await expect(createInvitation(spouse.id)).rejects.toThrow("Only the household owner");
  });

  it("invalidates older links when a new one is created", async () => {
    const owner = await ownerWithHousehold();
    const first = await createInvitation(owner.id);
    await createInvitation(owner.id);
    expect((await previewInvitation(first.token)).status).toBe("invalid");
  });
});
