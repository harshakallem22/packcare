import { Schema, model, InferSchemaType, Types } from 'mongoose';

const membershipSchema = new Schema(
  {
    householdId: { type: Schema.Types.ObjectId, ref: 'Household', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    role: { type: String, enum: ['owner', 'caregiver'], default: 'caregiver' },
  },
  { timestamps: { createdAt: 'joinedAt', updatedAt: false } },
);

// A user can belong to a household at most once.
membershipSchema.index({ householdId: 1, userId: 1 }, { unique: true });

export type MembershipDoc = InferSchemaType<typeof membershipSchema> & {
  householdId: Types.ObjectId;
  userId: Types.ObjectId;
};
export const Membership = model('Membership', membershipSchema);
