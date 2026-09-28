import { Schema, model, models, type InferSchemaType, type Model, type Types } from "mongoose";
import { DATE_RE } from "@/lib/dates";
import { wholeAmountField } from "./Budget";

/** One incoming amount (salary, freelance, gift…). Money in = sum for the month. */
const incomeSchema = new Schema(
  {
    householdId: { type: Schema.Types.ObjectId, ref: "Household", required: true },
    budgetId: { type: Schema.Types.ObjectId, ref: "Budget", required: true },
    amount: { ...wholeAmountField, min: 1 },
    source: { type: String, trim: true, maxlength: 60, default: "" },
    receivedByUserId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    // Calendar date in the household's timezone, "YYYY-MM-DD" (see lib/dates.ts).
    receivedDate: { type: String, required: true, match: DATE_RE },
  },
  { timestamps: true },
);

incomeSchema.index({ householdId: 1, budgetId: 1 });

export type IncomeDoc = InferSchemaType<typeof incomeSchema> & { _id: Types.ObjectId };

export const Income: Model<IncomeDoc> =
  (models.Income as Model<IncomeDoc>) ?? model<IncomeDoc>("Income", incomeSchema);
