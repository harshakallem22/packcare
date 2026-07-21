import type { CareEventPayload, Medication, Pet } from '../types';

export type SlotStatus = 'done' | 'overdue' | 'due-soon' | 'upcoming';

export interface MedSlot {
  petId: string;
  med: Medication;
  slot: string; // "18:00"
  slotTime: Date; // today at slot (viewer-local)
  status: SlotStatus;
  doneEvent?: CareEventPayload;
}

const DUE_SOON_MIN = 30;

function slotTimeToday(slot: string, now: Date): Date {
  const [h, m] = slot.split(':').map(Number);
  const d = new Date(now);
  d.setHours(h, m, 0, 0);
  return d;
}

/** Status of every scheduled medication slot for today, derived from the care log. */
export function computeMedSlots(pets: Pet[], events: CareEventPayload[], now: Date = new Date()): MedSlot[] {
  const out: MedSlot[] = [];
  for (const pet of pets) {
    for (const med of pet.medications) {
      for (const slot of med.schedule) {
        const slotTime = slotTimeToday(slot, now);
        const windowMs = (med.windowMinutes ?? 30) * 60_000;
        const doneEvent = events.find(
          (e) =>
            !e.voided &&
            e.medId === med.medId &&
            Math.abs(new Date(e.administeredAt).getTime() - slotTime.getTime()) <= windowMs,
        );

        let status: SlotStatus;
        if (doneEvent) status = 'done';
        else if (now.getTime() > slotTime.getTime() + windowMs) status = 'overdue';
        else if (now.getTime() >= slotTime.getTime() - DUE_SOON_MIN * 60_000) status = 'due-soon';
        else status = 'upcoming';

        out.push({ petId: pet._id, med, slot, slotTime, status, doneEvent });
      }
    }
  }
  return out;
}

export function summarize(slots: MedSlot[]) {
  return {
    done: slots.filter((s) => s.status === 'done').length,
    dueSoon: slots.filter((s) => s.status === 'due-soon').length,
    overdue: slots.filter((s) => s.status === 'overdue').length,
  };
}

const PRIORITY: Record<SlotStatus, number> = { overdue: 0, 'due-soon': 1, upcoming: 2, done: 3 };

/** The most action-worthy slot to surface for a medication on its row. */
export function representativeSlot(slots: MedSlot[], medId: string): MedSlot | undefined {
  const mine = slots.filter((s) => s.med.medId === medId);
  if (mine.length === 0) return undefined;
  return [...mine].sort((a, b) => {
    if (PRIORITY[a.status] !== PRIORITY[b.status]) return PRIORITY[a.status] - PRIORITY[b.status];
    return a.slotTime.getTime() - b.slotTime.getTime();
  })[0];
}
