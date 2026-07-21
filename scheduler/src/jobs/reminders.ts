import { Household, Pet, CareEvent } from '../models';
import { getLocalParts, scheduledInstant, buildSlotKey } from '../lib/schedule';
import { emitToHousehold } from '../emit';

const DUE_SOON_MS = 15 * 60_000; // remind 15 min before a slot
const OVERDUE_LOOKBACK_MS = 6 * 60_000 * 60; // surface overdue slots from the last 6h

// Emit each reminder at most once (keys embed the local date, so they roll over daily).
const emitted = new Set<string>();

interface Candidate {
  householdId: string;
  petId: string;
  medId: string;
  medName: string;
  slot: string;
  slotKey: string;
  instant: Date;
  windowMinutes: number;
}

/** Scan every pet's schedule and emit due-soon / overdue reminders to household rooms. */
export async function scanReminders(now: Date = new Date()): Promise<void> {
  const households = await Household.find({});
  const tzByHousehold = new Map(households.map((h) => [String(h._id), (h as any).timezone ?? 'America/New_York']));

  const pets = await Pet.find({});
  const candidates: Candidate[] = [];

  for (const pet of pets) {
    const tz = tzByHousehold.get(String((pet as any).householdId)) ?? 'America/New_York';
    const { localDate } = getLocalParts(now, tz);
    for (const med of (pet as any).medications ?? []) {
      if (!med.schedule?.length) continue;
      for (const slot of med.schedule as string[]) {
        const petId = String(pet._id);
        const medId = String(med.medId);
        candidates.push({
          householdId: String((pet as any).householdId),
          petId,
          medId,
          medName: med.name,
          slot,
          slotKey: buildSlotKey(petId, medId, localDate, slot),
          instant: scheduledInstant(localDate, slot, tz),
          windowMinutes: med.windowMinutes ?? 30,
        });
      }
    }
  }

  if (candidates.length === 0) return;

  // One query: which candidate slots already have a live dose?
  const existing = await CareEvent.find({ doseSlotKey: { $in: candidates.map((c) => c.slotKey) }, voided: false });
  const filled = new Set(existing.map((e) => (e as any).doseSlotKey as string));

  for (const c of candidates) {
    if (filled.has(c.slotKey)) continue;

    const untilSlot = c.instant.getTime() - now.getTime();
    const pastWindowEnd = now.getTime() - (c.instant.getTime() + c.windowMinutes * 60_000);

    // Due soon: slot is within the next 15 min and not yet logged.
    if (untilSlot > 0 && untilSlot <= DUE_SOON_MS) {
      const key = `due:${c.slotKey}`;
      if (!emitted.has(key)) {
        emitted.add(key);
        await emitToHousehold('reminder:due', c.householdId, {
          petId: c.petId,
          medId: c.medId,
          doseSlotKey: c.slotKey,
          scheduledFor: c.instant.toISOString(),
          message: `💉 ${c.medName} due at ${c.slot}`,
        });
      }
    }

    // Overdue: the window has passed (within the lookback) and still nothing logged.
    if (pastWindowEnd > 0 && pastWindowEnd <= OVERDUE_LOOKBACK_MS) {
      const key = `overdue:${c.slotKey}`;
      if (!emitted.has(key)) {
        emitted.add(key);
        await emitToHousehold('dose:overdue', c.householdId, {
          petId: c.petId,
          medId: c.medId,
          doseSlotKey: c.slotKey,
          scheduledFor: c.instant.toISOString(),
          message: `⚠️ ${c.medName} (${c.slot}) is overdue - no one has logged it`,
        });
      }
    }
  }
}
