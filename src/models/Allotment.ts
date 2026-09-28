import { Schema, model, models, type InferSchemaType, type Model, type Types } from "mongoose";

/**
 * A reusable budget bucket ("Groceries", "School fees"). Each month's budget
 * gives it an amount through a BudgetAllocation; expenses are recorded against it.
 */
const allotmentSchema = new Schema(
  {
    householdId: { type: Schema.Types.ObjectId, ref: "Household", required: true },
    name: { type: String, required: true, trim: true, maxlength: 40 },
    sortOrder: { type: Number, required: true, default: 0 },
    isArchived: { type: Boolean, required: true, default: false },
  },
  { timestamps: true },
);

allotmentSchema.index({ householdId: 1, sortOrder: 1 });

export type AllotmentDoc = InferSchemaType<typeof allotmentSchema> & { _id: Types.ObjectId };

export const Allotment: Model<AllotmentDoc> =
  (models.Allotment as Model<AllotmentDoc>) ?? model<AllotmentDoc>("Allotment", allotmentSchema);
