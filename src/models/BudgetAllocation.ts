import { Schema, model, models, type InferSchemaType, type Model, type Types } from "mongoose";
import { wholeAmountField } from "./Budget";

const budgetAllocationSchema = new Schema(
  {
    // householdId is denormalised so every query can be scoped to the household.
    householdId: { type: Schema.Types.ObjectId, ref: "Household", required: true },
    budgetId: { type: Schema.Types.ObjectId, ref: "Budget", required: true },
    allotmentId: { type: Schema.Types.ObjectId, ref: "Allotment", required: true },
    allocatedAmount: wholeAmountField,
  },
  { timestamps: true },
);

// The amount an allotment gets in one month's budget.
budgetAllocationSchema.index({ budgetId: 1, allotmentId: 1 }, { unique: true });

export type BudgetAllocationDoc = InferSchemaType<typeof budgetAllocationSchema> & {
  _id: Types.ObjectId;
};

export const BudgetAllocation: Model<BudgetAllocationDoc> =
  (models.BudgetAllocation as Model<BudgetAllocationDoc>) ??
  model<BudgetAllocationDoc>("BudgetAllocation", budgetAllocationSchema);
