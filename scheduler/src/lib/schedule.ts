// Timezone-aware schedule math (no date library). Must produce the SAME doseSlotKey
// format Care-Log derives: `${petId}:${medId}:${localDate}:${slot}`.

interface LocalParts {
  localDate: string; // YYYY-MM-DD in the target tz
  minutesOfDay: number;
}

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
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '00';
  const localDate = `${get('year')}-${get('month')}-${get('day')}`;
  const rawHour = get('hour');
  const hour = rawHour === '24' ? 0 : Number(rawHour);
  return { localDate, minutesOfDay: hour * 60 + Number(get('minute')) };
}

/** Offset (ms) of a timezone relative to UTC at a given instant. */
function tzOffsetMs(date: Date, timeZone: string): number {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const m: Record<string, number> = {};
  for (const p of dtf.formatToParts(date)) if (p.type !== 'literal') m[p.type] = Number(p.value);
  const asUtc = Date.UTC(m.year, m.month - 1, m.day, m.hour % 24, m.minute, m.second);
  return asUtc - date.getTime();
}

/** The UTC instant for a wall-clock `slot` (e.g. "18:00") on `localDate` in `timeZone`. */
export function scheduledInstant(localDate: string, slot: string, timeZone: string): Date {
  const [y, mo, d] = localDate.split('-').map(Number);
  const [hh, mm] = slot.split(':').map(Number);
  const utcGuess = Date.UTC(y, mo - 1, d, hh, mm);
  const offset = tzOffsetMs(new Date(utcGuess), timeZone);
  return new Date(utcGuess - offset);
}

export function buildSlotKey(petId: string, medId: string, localDate: string, slot: string): string {
  return `${petId}:${medId}:${localDate}:${slot}`;
}
