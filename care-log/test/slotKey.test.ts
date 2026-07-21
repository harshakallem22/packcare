import { describe, it, expect } from 'vitest';
import { deriveDoseSlotKey, getLocalParts } from '../src/lib/slotKey';

const tz = 'America/New_York';

describe('deriveDoseSlotKey', () => {
  it('maps a dose inside the window to its scheduled slot', () => {
    // 2026-06-26T22:05:00Z == 18:05 America/New_York (EDT) → within the 18:00 ±30 window.
    const key = deriveDoseSlotKey({
      petId: 'pet1',
      medId: 'med1',
      administeredAt: new Date('2026-06-26T22:05:00Z'),
      schedule: ['08:00', '18:00'],
      windowMinutes: 30,
      timeZone: tz,
    });
    expect(key).toBe('pet1:med1:2026-06-26:18:00');
  });

  it('is identical for two doses in the same slot/day (the dedupe guarantee)', () => {
    const make = (iso: string) =>
      deriveDoseSlotKey({
        petId: 'pet1',
        medId: 'med1',
        administeredAt: new Date(iso),
        schedule: ['18:00'],
        windowMinutes: 30,
        timeZone: tz,
      });
    expect(make('2026-06-26T22:01:00Z')).toBe(make('2026-06-26T22:20:00Z'));
  });

  it('returns null outside every window (PRN / advisory-only)', () => {
    const key = deriveDoseSlotKey({
      petId: 'pet1',
      medId: 'med1',
      administeredAt: new Date('2026-06-26T16:00:00Z'), // noon EDT - far from 08:00/18:00
      schedule: ['08:00', '18:00'],
      windowMinutes: 30,
      timeZone: tz,
    });
    expect(key).toBeNull();
  });

  it('returns null when the med has no schedule', () => {
    expect(
      deriveDoseSlotKey({ petId: 'p', medId: 'm', administeredAt: new Date(), schedule: [], windowMinutes: 30, timeZone: tz }),
    ).toBeNull();
  });

  it('picks the closest slot when two windows overlap', () => {
    // 12:10 EDT, slots 12:00 and 12:30 both within 30m → 12:00 is closer.
    const key = deriveDoseSlotKey({
      petId: 'p',
      medId: 'm',
      administeredAt: new Date('2026-06-26T16:10:00Z'),
      schedule: ['12:00', '12:30'],
      windowMinutes: 30,
      timeZone: tz,
    });
    expect(key).toBe('p:m:2026-06-26:12:00');
  });

  it('getLocalParts projects UTC into the target timezone', () => {
    const { localDate, minutesOfDay } = getLocalParts(new Date('2026-06-26T22:05:00Z'), tz);
    expect(localDate).toBe('2026-06-26');
    expect(minutesOfDay).toBe(18 * 60 + 5);
  });
});
