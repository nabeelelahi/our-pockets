import { Schema, model, models, type InferSchemaType, type Model, type Types } from "mongoose";
import { DATE_RE } from "@/lib/dates";
import { wholeAmountField } from "./Budget";

const transactionSchema = new Schema(
  {
    householdId: { type: Schema.Types.ObjectId, ref: "Household", required: true },
    budgetId: { type: Schema.Types.ObjectId, ref: "Budget", required: true },
    allotmentId: { type: Schema.Types.ObjectId, ref: "Allotment", required: true },
    amount: { ...wholeAmountField, min: 1 },
    description: { type: String, trim: true, maxlength: 140, default: "" },
    paidByUserId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    // Calendar date in the household's timezone, "YYYY-MM-DD" (see lib/dates.ts).
    transactionDate: { type: String, required: true, match: DATE_RE },
  },
  { timestamps: true },
);

transactionSchema.index({ householdId: 1, budgetId: 1 });
transactionSchema.index({ householdId: 1, transactionDate: -1, createdAt: -1 });
transactionSchema.index({ allotmentId: 1 });

export type TransactionDoc = InferSchemaType<typeof transactionSchema> & { _id: Types.ObjectId };

export const Transaction: Model<TransactionDoc> =
  (models.Transaction as Model<TransactionDoc>) ??
  model<TransactionDoc>("Transaction", transactionSchema);
