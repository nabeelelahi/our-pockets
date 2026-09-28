import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { afterAll, afterEach, beforeAll } from "vitest";
import { dbConnect } from "@/lib/db";
import "@/models/Budget";
import "@/models/BudgetAllocation";
import "@/models/Allotment";
import "@/models/Income";
import "@/models/Household";
import "@/models/Invitation";
import "@/models/Transaction";
import "@/models/User";

let server: MongoMemoryServer;

process.env.JWT_SECRET ??= "test-secret-that-is-at-least-32-characters-long";

beforeAll(async () => {
  server = await MongoMemoryServer.create();
  process.env.MONGODB_URI = server.getUri("our-pockets-test");
  await dbConnect();
  // Unique indexes must exist before the tests that rely on them.
  await Promise.all(Object.values(mongoose.models).map((m) => m.init()));
});

afterEach(async () => {
  await Promise.all(Object.values(mongoose.connection.collections).map((c) => c.deleteMany({})));
});

afterAll(async () => {
  await mongoose.disconnect();
  await server?.stop();
});
