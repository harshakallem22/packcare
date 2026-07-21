import { Schema, model, InferSchemaType, Types } from 'mongoose';

const medicationSchema = new Schema(
  {
    medId: { type: Schema.Types.ObjectId, default: () => new Types.ObjectId() },
    name: { type: String, required: true },
    isInsulin: { type: Boolean, default: false },
    // Fixed daily slots, e.g. ["08:00", "18:00"]. Empty for PRN-only meds.
    schedule: { type: [String], default: [] },
    // Minutes around a scheduled slot used for the advisory duplicate-window check.
    windowMinutes: { type: Number, default: 30 },
  },
  { _id: false },
);

const petSchema = new Schema(
  {
    householdId: { type: Schema.Types.ObjectId, ref: 'Household', required: true },
    name: { type: String, required: true },
    species: { type: String, default: 'cat' },
    weightKg: { type: Number, default: null },
    medications: { type: [medicationSchema], default: [] },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

petSchema.index({ householdId: 1 });

export type PetDoc = InferSchemaType<typeof petSchema>;
export const Pet = model('Pet', petSchema);
