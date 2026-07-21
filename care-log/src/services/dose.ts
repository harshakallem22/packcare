import { Types } from 'mongoose';
import { CareEvent, Pet, Household } from '../models';
import { deriveDoseSlotKey } from '../lib/slotKey';

export interface CreateCareEventInput {
  householdId: string;
  petId: string;
  type: 'feeding' | 'medication' | 'insulin';
  medId?: string | null;
  amount?: number | null;
  unit?: string | null;
  injectionSite?: string | null;
  administeredByUserId: string;
  administeredAt?: Date;
  idempotencyKey?: string | null;
  note?: string | null;
  // When true, the caregiver has acknowledged the advisory "already given recently"
  // warning and wants to proceed (a genuinely-intended repeat / PRN dose).
  confirm?: boolean;
}

export interface RecentDoseInfo {
  eventId: string;
  administeredBy: string;
  administeredAt: Date;
  minutesAgo: number;
}

export type CreateCareEventResult =
  // Inserted; the authoritative event.
  | { outcome: 'created'; event: any; doseSlotKey: string | null }
  // Exact same button press already succeeded - return it, don't re-broadcast.
  | { outcome: 'duplicate-idempotency'; event: any }
  // A recent dose exists and confirm was not set - ask the caregiver.
  | { outcome: 'needs-confirmation'; recent: RecentDoseInfo }
  // Lost the race for this scheduled slot - already given by someone else.
  | { outcome: 'conflict'; alreadyGivenBy: string; administeredAt: Date; event: any };

function isDuplicateKeyError(err: unknown): err is { code: 11000; keyPattern?: Record<string, number> } {
  return typeof err === 'object' && err !== null && (err as { code?: number }).code === 11000;
}

/**
 * Create a care event behind the full layered defense (§5 of the spec):
 *
 *   1. Idempotency (unique index on idempotencyKey) - safe network retries.
 *   2. Advisory window check - soft "already given N min ago, give anyway?" warning.
 *   3. Slot-key derivation + partial unique index - the HARD guarantee that physically
 *      prevents two live doses for the same scheduled slot.
 *
 * The concurrency story: two caregivers fire at the same instant. Neither sees the
 * other's dose in the advisory check (nothing committed yet), so both attempt the insert.
 * MongoDB serializes writes to the unique index - one commits (201), one throws 11000.
 * The loser re-reads the winner and returns 409 with { alreadyGivenBy, administeredAt }.
 */
export async function createCareEvent(input: CreateCareEventInput): Promise<CreateCareEventResult> {
  const administeredAt = input.administeredAt ?? new Date();

  // (1) Fast idempotency pre-check: a retried button press returns the original event.
  if (input.idempotencyKey) {
    const prior = await CareEvent.findOne({ idempotencyKey: input.idempotencyKey });
    if (prior) return { outcome: 'duplicate-idempotency', event: prior };
  }

  // Derive the slot key from the pet's medication schedule + the household timezone.
  let doseSlotKey: string | null = null;
  if (input.medId && input.type !== 'feeding') {
    const pet = await Pet.findById(input.petId);
    const med = pet?.medications.find((m) => String((m as any).medId) === input.medId);
    if (pet && med && med.schedule.length > 0) {
      const household = await Household.findById(pet.householdId);
      doseSlotKey = deriveDoseSlotKey({
        petId: input.petId,
        medId: input.medId,
        administeredAt,
        schedule: med.schedule,
        windowMinutes: med.windowMinutes ?? 30,
        timeZone: household?.timezone ?? 'America/New_York',
      });

      // (2) Advisory window check: has a live dose for this pet+med landed recently?
      if (!input.confirm) {
        const windowMs = (med.windowMinutes ?? 30) * 60_000;
        const recent = await CareEvent.findOne({
          petId: new Types.ObjectId(input.petId),
          medId: new Types.ObjectId(input.medId),
          voided: false,
          administeredAt: {
            $gte: new Date(administeredAt.getTime() - windowMs),
            $lte: new Date(administeredAt.getTime() + windowMs),
          },
        }).sort({ administeredAt: -1 });

        if (recent) {
          const recentAt = recent.administeredAt as Date;
          return {
            outcome: 'needs-confirmation',
            recent: {
              eventId: String(recent._id),
              administeredBy: String(recent.administeredByUserId),
              administeredAt: recentAt,
              minutesAgo: Math.max(0, Math.round((administeredAt.getTime() - recentAt.getTime()) / 60_000)),
            },
          };
        }
      }
    }
  }

  // (3) Optimistic insert - the partial unique index on doseSlotKey is the hard backstop.
  try {
    const event = await CareEvent.create({
      householdId: new Types.ObjectId(input.householdId),
      petId: new Types.ObjectId(input.petId),
      type: input.type,
      medId: input.medId ? new Types.ObjectId(input.medId) : null,
      doseSlotKey,
      amount: input.amount ?? null,
      unit: input.unit ?? null,
      injectionSite: input.injectionSite ?? null,
      administeredByUserId: new Types.ObjectId(input.administeredByUserId),
      administeredAt,
      idempotencyKey: input.idempotencyKey ?? null,
      note: input.note ?? null,
      voided: false,
    });
    return { outcome: 'created', event, doseSlotKey };
  } catch (err) {
    if (!isDuplicateKeyError(err)) throw err;

    // Idempotency race (two retries of the same press arrived together).
    if (err.keyPattern?.idempotencyKey && input.idempotencyKey) {
      const existing = await CareEvent.findOne({ idempotencyKey: input.idempotencyKey });
      if (existing) return { outcome: 'duplicate-idempotency', event: existing };
    }

    // Lost the race for the scheduled slot → re-read the winner and report the conflict.
    if (err.keyPattern?.doseSlotKey && doseSlotKey) {
      const winner = await CareEvent.findOne({ doseSlotKey, voided: false });
      if (winner) {
        return {
          outcome: 'conflict',
          alreadyGivenBy: String(winner.administeredByUserId),
          administeredAt: winner.administeredAt as Date,
          event: winner,
        };
      }
    }

    throw err;
  }
}
