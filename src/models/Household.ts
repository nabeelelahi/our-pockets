import { Schema, model, models, type InferSchemaType, type Model, type Types } from "mongoose";

export const HOUSEHOLD_ROLES = ["OWNER", "MEMBER"] as const;
export type HouseholdRole = (typeof HOUSEHOLD_ROLES)[number];
export const MAX_HOUSEHOLD_MEMBERS = 2;

const memberSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    role: { type: String, enum: HOUSEHOLD_ROLES, required: true },
    joinedAt: { type: Date, required: true, default: Date.now },
  },
  { _id: false },
);

const householdSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 60 },
    currency: { type: String, required: true, default: "PKR" },
    timezone: { type: String, required: true, default: "Asia/Karachi" },
    ownerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    // Membership is embedded: a household has at most two members, and
    // membership checks become a single indexed lookup.
    members: {
      type: [memberSchema],
      required: true,
      validate: {
        validator: (v: unknown[]) => v.length >= 1 && v.length <= MAX_HOUSEHOLD_MEMBERS,
        message: "A household has one or two members.",
      },
    },
  },
  { timestamps: true },
);

// Unique across documents: a user can belong to only one household.
householdSchema.index({ "members.userId": 1 }, { unique: true });

export type HouseholdDoc = InferSchemaType<typeof householdSchema> & { _id: Types.ObjectId };

export const Household: Model<HouseholdDoc> =
  (models.Household as Model<HouseholdDoc>) ?? model<HouseholdDoc>("Household", householdSchema);
