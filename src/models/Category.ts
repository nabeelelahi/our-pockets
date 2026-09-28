import { Schema, model, models, type InferSchemaType, type Model, type Types } from "mongoose";
import { CATEGORY_TYPES } from "@/lib/validation";

const categorySchema = new Schema(
  {
    householdId: { type: Schema.Types.ObjectId, ref: "Household", required: true },
    name: { type: String, required: true, trim: true, maxlength: 40 },
    type: { type: String, enum: CATEGORY_TYPES, required: true, default: "EXPENSE" },
    icon: { type: String, default: "", maxlength: 8 },
    sortOrder: { type: Number, required: true, default: 0 },
    isArchived: { type: Boolean, required: true, default: false },
  },
  { timestamps: true },
);

categorySchema.index({ householdId: 1, sortOrder: 1 });

export type CategoryDoc = InferSchemaType<typeof categorySchema> & { _id: Types.ObjectId };

export const Category: Model<CategoryDoc> =
  (models.Category as Model<CategoryDoc>) ?? model<CategoryDoc>("Category", categorySchema);
