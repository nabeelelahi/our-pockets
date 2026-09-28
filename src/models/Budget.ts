import { Schema, model, models, type InferSchemaType, type Model, type Types } from "mongoose";
import { MONTH_RE } from "@/lib/dates";
import { MAX_AMOUNT } from "@/lib/money";

export const wholeAmountField = {
  type: Number,
  required: true,
  min: 0,
  max: MAX_AMOUNT,
  validate: { validator: Number.isInteger, message: "Amount must be a whole number." },
} as const;

/**
 * One household's budget for one month. Money in comes from Income entries,
 * allotted amounts from BudgetAllocations, money out from Transactions.
 */
const budgetSchema = new Schema(
  {
    householdId: { type: Schema.Types.ObjectId, ref: "Household", required: true },
    month: { type: String, required: true, match: MONTH_RE },
  },
  { timestamps: true },
);

budgetSchema.index({ householdId: 1, month: 1 }, { unique: true });

export type BudgetDoc = InferSchemaType<typeof budgetSchema> & { _id: Types.ObjectId };

export const Budget: Model<BudgetDoc> =
  (models.Budget as Model<BudgetDoc>) ?? model<BudgetDoc>("Budget", budgetSchema);
