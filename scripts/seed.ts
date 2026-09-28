/**
 * Development seed data. NEVER run against production.
 *
 *   npm run seed
 *
 * Creates (or recreates) two demo users sharing one household:
 *   nabeel@example.com / password123
 *   wife@example.com   / password123
 */
import { existsSync } from "node:fs";
import mongoose from "mongoose";

if (existsSync(".env.local")) process.loadEnvFile(".env.local");
else if (existsSync(".env")) process.loadEnvFile(".env");

const DEMO_PASSWORD = "password123";
const MONTH = "2026-09";

async function main() {
  if (process.env.NODE_ENV === "production" && !process.argv.includes("--force")) {
    throw new Error("Refusing to seed with NODE_ENV=production.");
  }

  const { dbConnect } = await import("@/lib/db");
  const { User } = await import("@/models/User");
  const { Household } = await import("@/models/Household");
  const { Allotment } = await import("@/models/Allotment");
  const { Income } = await import("@/models/Income");
  const { Budget } = await import("@/models/Budget");
  const { BudgetAllocation } = await import("@/models/BudgetAllocation");
  const { Transaction } = await import("@/models/Transaction");
  const { Invitation } = await import("@/models/Invitation");
  const { registerUser } = await import("@/services/auth.service");
  const { createHousehold } = await import("@/services/household.service");
  const { acceptInvitation, createInvitation } = await import("@/services/invitation.service");
  const { createAllotment } = await import("@/services/allotment.service");
  const { createIncome } = await import("@/services/income.service");
  const { saveBudget } = await import("@/services/budget.service");
  const { createTransaction } = await import("@/services/transaction.service");

  await dbConnect();
  await Promise.all(Object.values(mongoose.models).map((m) => m.init()));

  // Remove previous demo data.
  const emails = ["nabeel@example.com", "wife@example.com"];
  const oldUsers = await User.find({ email: { $in: emails } }).lean();
  const oldHouseholds = await Household.find({ "members.userId": { $in: oldUsers.map((u) => u._id) } }).lean();
  const householdIds = oldHouseholds.map((h) => h._id);
  await Promise.all([
    Transaction.deleteMany({ householdId: { $in: householdIds } }),
    BudgetAllocation.deleteMany({ householdId: { $in: householdIds } }),
    Budget.deleteMany({ householdId: { $in: householdIds } }),
    Allotment.deleteMany({ householdId: { $in: householdIds } }),
    Income.deleteMany({ householdId: { $in: householdIds } }),
    Invitation.deleteMany({ householdId: { $in: householdIds } }),
  ]);
  await Household.deleteMany({ _id: { $in: householdIds } });
  await User.deleteMany({ email: { $in: emails } });

  const reg = (name: string, email: string) =>
    registerUser({ name, email, password: DEMO_PASSWORD, confirmPassword: DEMO_PASSWORD });
  const nabeel = await reg("Nabeel", emails[0]);
  const wife = await reg("Wife", emails[1]);

  await createHousehold(nabeel.id, { name: "Nabeel & Wife", useDefaultAllotments: false });
  const { token } = await createInvitation(nabeel.id);
  await acceptInvitation(wife.id, token);

  const plan = [
    ["Household", 70000],
    ["Food & Groceries", 40000],
    ["Transport", 25000],
    ["Bills", 30000],
    ["Personal - Nabeel", 15000],
    ["Personal - Wife", 15000],
    ["Savings", 100000],
    ["Miscellaneous", 5000],
  ] as const;
  const ids: Record<string, string> = {};
  for (const [name] of plan) {
    ids[name] = (await createAllotment(nabeel.id, { name })).id;
  }

  // Money in: PKR 300,000 across two entries.
  await createIncome(nabeel.id, {
    amount: 250000,
    source: "Salary",
    receivedByUserId: nabeel.id,
    receivedDate: "2026-09-01",
  });
  await createIncome(nabeel.id, {
    amount: 50000,
    source: "Freelance",
    receivedByUserId: wife.id,
    receivedDate: "2026-09-10",
  });

  await saveBudget(nabeel.id, {
    month: MONTH,
    allocations: plan.map(([name, amount]) => ({ allotmentId: ids[name], allocatedAmount: amount })),
  });

  const expenses: [number, string, string, typeof nabeel, string][] = [
    [8500, "Groceries", "Food & Groceries", nabeel, "2026-09-02"],
    [4000, "Fuel", "Transport", wife, "2026-09-03"],
    [12000, "Electricity bill", "Bills", nabeel, "2026-09-05"],
    [2500, "Dinner", "Food & Groceries", nabeel, "2026-09-12"],
    [18800, "Cleaning & repairs", "Household", wife, "2026-09-15"],
    [3000, "Ride share", "Transport", wife, "2026-09-20"],
    [1500, "Snacks", "Food & Groceries", wife, "2026-09-26"],
    [4200, "Books", "Personal - Nabeel", nabeel, "2026-09-27"],
  ];
  for (const [amount, description, allotment, who, date] of expenses) {
    await createTransaction(nabeel.id, {
      amount,
      description,
      allotmentId: ids[allotment],
      paidByUserId: who.id,
      transactionDate: date,
    });
  }

  console.log("Seeded demo household 'Nabeel & Wife' for", MONTH);
  console.log(`  ${emails[0]} / ${DEMO_PASSWORD}`);
  console.log(`  ${emails[1]} / ${DEMO_PASSWORD}`);
  console.log("Development credentials only. Never use them in production.");
}

main()
  .then(() => mongoose.disconnect())
  .catch(async (err) => {
    console.error(err instanceof Error ? err.message : err);
    await mongoose.disconnect();
    process.exit(1);
  });
