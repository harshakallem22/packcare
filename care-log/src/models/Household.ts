import { Schema, model, InferSchemaType } from 'mongoose';

const householdSchema = new Schema(
  {
    name: { type: String, required: true },
    // IANA timezone, used to compute the localDate component of a dose slot key.
    timezone: { type: String, default: 'America/New_York' },
    // Short shareable code so a caregiver can join an existing household.
    inviteCode: { type: String, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

householdSchema.index({ inviteCode: 1 }, { unique: true });

export type HouseholdDoc = InferSchemaType<typeof householdSchema>;
export const Household = model('Household', householdSchema);
