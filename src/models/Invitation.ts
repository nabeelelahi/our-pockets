import { Schema, model, models, type InferSchemaType, type Model, type Types } from "mongoose";

const invitationSchema = new Schema(
  {
    householdId: { type: Schema.Types.ObjectId, ref: "Household", required: true },
    invitedByUserId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    // Only a SHA-256 hash of the token is stored; the raw token lives in the link.
    tokenHash: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    acceptedAt: { type: Date, default: null },
    acceptedByUserId: { type: Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

invitationSchema.index({ tokenHash: 1 }, { unique: true });
invitationSchema.index({ householdId: 1 });

export type InvitationDoc = InferSchemaType<typeof invitationSchema> & { _id: Types.ObjectId };

export const Invitation: Model<InvitationDoc> =
  (models.Invitation as Model<InvitationDoc>) ??
  model<InvitationDoc>("Invitation", invitationSchema);
