import { useState } from 'react';
import { Utensils } from 'lucide-react';
import type { Medication, Pet } from '../types';
import { logFeeding } from '../api/hooks';
import { type MedSlot, representativeSlot, type SlotStatus } from '../lib/status';
import { clockTime } from '../lib/time';
import { useToast } from './Toasts';
import StatusBadge from './StatusBadge';
import MedIcon from './MedIcon';
import DoseModal from './DoseModal';

function badgeText(slot: MedSlot): { status: SlotStatus; text: string } {
  if (slot.status === 'done' && slot.doneEvent) return { status: 'done', text: `Done · ${clockTime(slot.doneEvent.administeredAt)}` };
  if (slot.status === 'overdue') return { status: 'overdue', text: `Overdue · ${slot.slot}` };
  if (slot.status === 'due-soon') return { status: 'due-soon', text: `Due soon · ${slot.slot}` };
  return { status: 'upcoming', text: slot.slot };
}

export default function PetCard({
  pet,
  householdId,
  meId,
  meName,
  nameById,
  presence,
  slots,
}: {
  pet: Pet;
  householdId: string;
  meId: string;
  meName: string;
  nameById: Record<string, string>;
  presence: Record<string, { userId: string; displayName: string }>;
  slots: MedSlot[];
}) {
  const toast = useToast();
  const [activeMed, setActiveMed] = useState<Medication | null>(null);
  const [feeding, setFeeding] = useState(false);

  async function feed() {
    setFeeding(true);
    try {
      await logFeeding({ householdId, petId: pet._id, amount: 1, unit: 'meal', idempotencyKey: crypto.randomUUID() });
      toast('ok', `Feeding logged for ${pet.name}`);
    } catch (e) {
      toast('warn', (e as Error).message);
    } finally {
      setFeeding(false);
    }
  }

  return (
    <div className="card pet">
      <div className="pet-head">
        <div className="pet-title">
          <h3>{pet.name}</h3>
          <span className="species">{pet.species}</span>
        </div>
      </div>

      {pet.medications.length === 0 && <p className="muted small">No medications on file.</p>}

      {pet.medications.map((med) => {
        const rep = representativeSlot(slots, med.medId);
        const p = presence[`${pet._id}:${med.medId}`];
        const presenceBy = p && p.userId !== meId ? p.displayName : null;
        const badge = rep ? badgeText(rep) : null;

        return (
          <div className="med-row" key={med.medId}>
            <span className="med-ico"><MedIcon type={med.isInsulin ? 'insulin' : 'medication'} /></span>
            <div className="med-main">
              <div className="med-name">{med.name}</div>
              <div className="med-meta">{med.schedule.length ? med.schedule.join(' · ') : 'As needed'}</div>
            </div>
            <div className="med-right">
              {presenceBy && (
                <span className="presence-hint"><span className="pulse-dot" />{presenceBy} logging…</span>
              )}
              {badge && <StatusBadge status={badge.status} text={badge.text} />}
              <button className="btn-secondary btn-sm" onClick={() => setActiveMed(med)}>Log dose</button>
            </div>
          </div>
        );
      })}

      <div className="pet-foot">
        <button className="btn-ghost btn-sm" disabled={feeding} onClick={feed}>
          <Utensils size={15} /> Log feeding
        </button>
      </div>

      {activeMed && (
        <DoseModal
          pet={pet}
          med={activeMed}
          householdId={householdId}
          meName={meName}
          nameById={nameById}
          presenceBy={(() => {
            const p = presence[`${pet._id}:${activeMed.medId}`];
            return p && p.userId !== meId ? p.displayName : null;
          })()}
          onClose={() => setActiveMed(null)}
        />
      )}
    </div>
  );
}
