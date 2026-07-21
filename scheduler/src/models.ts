import { Schema, model, InferSchemaType } from 'mongoose';

// Read-only mirrors of the collections Care-Log owns; the scheduler reads schedules and
// the care log straight from MongoDB. Model names must match Care-Log's so Mongoose
// resolves the same collection names (households, pets, careevents).

const householdSchema = new Schema({ name: String, timezone: String }, { strict: false });
export const Household = model('Household', householdSchema);

const medicationSchema = new Schema(
  {
    medId: Schema.Types.ObjectId,
    name: String,
    isInsulin: Boolean,
    schedule: [String],
    windowMinutes: Number,
  },
  { _id: false },
);
const petSchema = new Schema(
  { householdId: Schema.Types.ObjectId, name: String, medications: [medicationSchema] },
  { strict: false },
);
export const Pet = model('Pet', petSchema);
export type PetDoc = InferSchemaType<typeof petSchema>;

const careEventSchema = new Schema({ doseSlotKey: String, voided: Boolean }, { strict: false });
export const CareEvent = model('CareEvent', careEventSchema);
