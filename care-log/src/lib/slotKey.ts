/**
 * Dose slot key derivation - the deterministic bucket that makes a scheduled dose
 * dedupable. Two caregivers giving "the 6pm insulin" on the same local day produce the
 * SAME key, which the partial unique index then rejects as a duplicate.
 *
 *   doseSlotKey = `${petId}:${medId}:${localDate}:${scheduledSlot}`
 *   e.g. "pet123:med456:2026-06-26:18:00"
 *
 * Returns null when the administration doesn't map to a scheduled slot (PRN / unscheduled
 * meds, feedings, or a dose given well outside any window) - those fall back to the
 * advisory window warning only, intentionally permissive.
 */

export interface SlotKeyInput {
  petId: string;
  medId: string;
  administeredAt: Date;
  schedule: string[]; // ["08:00", "18:00"]
  windowMinutes: number;
  timeZone: string; // IANA, e.g. "America/New_York"
}

interface LocalParts {
  localDate: string; // YYYY-MM-DD in the target timezone
  minutesOfDay: number; // 0..1439 in the target timezone
}

/** Project a UTC instant into wall-clock parts for a given IANA timezone (no deps). */
export function getLocalParts(date: Date, timeZone: string): LocalParts {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const parts = fmt.formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '00';

  const localDate = `${get('year')}-${get('month')}-${get('day')}`;
  // Intl can emit "24" for midnight depending on the runtime - normalize to "00".
  const rawHour = get('hour');
  const hour = rawHour === '24' ? 0 : Number(rawHour);
  const minutesOfDay = hour * 60 + Number(get('minute'));
  return { localDate, minutesOfDay };
}

function slotToMinutes(slot: string): number {
  const [h, m] = slot.split(':').map(Number);
  return h * 60 + m;
}

/**
 * Find the scheduled slot this administration falls within (closest match if it is in
 * range of more than one), or null if it's outside every window.
 */
export function deriveDoseSlotKey(input: SlotKeyInput): string | null {
  const { petId, medId, administeredAt, schedule, windowMinutes, timeZone } = input;
  if (!medId || schedule.length === 0) return null;

  const { localDate, minutesOfDay } = getLocalParts(administeredAt, timeZone);

  let best: { slot: string; distance: number } | null = null;
  for (const slot of schedule) {
    const distance = Math.abs(minutesOfDay - slotToMinutes(slot));
    if (distance <= windowMinutes && (best === null || distance < best.distance)) {
      best = { slot, distance };
    }
  }
  if (!best) return null;

  return `${petId}:${medId}:${localDate}:${best.slot}`;
}
