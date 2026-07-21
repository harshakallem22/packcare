import { Schema, model, InferSchemaType } from 'mongoose';

/**
 * The append-only care log: feedings + medications + insulin doses.
 * This collection carries the three indexes that make double-dosing physically
 * impossible (see the partial unique indexes below).
 */
const careEventSchema = new Schema(
  {
    householdId: { type: Schema.Types.ObjectId, ref: 'Household', required: true }, // room scoping + tenant isolation
    petId: { type: Schema.Types.ObjectId, ref: 'Pet', required: true },
    type: { type: String, enum: ['feeding', 'medication', 'insulin'], required: true },
    medId: { type: Schema.Types.ObjectId, default: null }, // null for feedings

    // Dedupe key - `${petId}:${medId}:${localDate}:${scheduledSlot}`.
    // Null for PRN / unscheduled doses (which fall back to the advisory window only).
    doseSlotKey: { type: String, default: null },

    amount: { type: Number, default: null },
    unit: { type: String, default: null }, // e.g. "units", "cup"
    injectionSite: { type: String, default: null }, // insulin only

    administeredByUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    administeredAt: { type: Date, required: true }, // server timestamp

    // Client-supplied UUID, one per button press - makes retries idempotent.
    idempotencyKey: { type: String, default: null },

    note: { type: String, default: null },
    voided: { type: Boolean, default: false }, // soft-delete for corrections
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

// (1) HARD guarantee: at most one *live* administered dose per scheduled slot.
//     When an event is voided it drops out of the partial filter, freeing the slot.
careEventSchema.index(
  { doseSlotKey: 1 },
  {
    unique: true,
    partialFilterExpression: { doseSlotKey: { $type: 'string' }, voided: false },
  },
);

// (2) Idempotent retries of the same button press never double-insert.
careEventSchema.index(
  { idempotencyKey: 1 },
  {
    unique: true,
    partialFilterExpression: { idempotencyKey: { $type: 'string' } },
  },
);

// (3) Fast timeline reads, newest first.
careEventSchema.index({ householdId: 1, administeredAt: -1 });

export type CareEventDoc = InferSchemaType<typeof careEventSchema>;
export const CareEvent = model('CareEvent', careEventSchema);
