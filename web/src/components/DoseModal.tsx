import { useEffect, useState } from 'react';
import { AlertTriangle, ShieldCheck } from 'lucide-react';
import type { Medication, Pet } from '../types';
import { logDose, type DosePayload } from '../api/hooks';
import { clockTime } from '../lib/time';
import { socket } from '../socket';
import { useToast } from './Toasts';
import MedIcon from './MedIcon';

// Layered double-dose safety flow: confirm → advisory (recently logged, may override)
// → conflict (already given, blocked). The server decides which step comes next.
type Step = 'confirm' | 'advisory' | 'conflict';

export default function DoseModal({
  pet,
  med,
  householdId,
  meName,
  nameById,
  presenceBy,
  onClose,
}: {
  pet: Pet;
  med: Medication;
  householdId: string;
  meName: string;
  nameById: Record<string, string>;
  presenceBy: string | null;
  onClose: () => void;
}) {
  const toast = useToast();
  const [step, setStep] = useState<Step>('confirm');
  const [busy, setBusy] = useState(false);
  const [recent, setRecent] = useState<{ by: string; minutesAgo: number } | null>(null);
  const [conflict, setConflict] = useState<{ by: string; at: string } | null>(null);

  // Tell the room this caregiver is about to log - drives the presence indicator.
  useEffect(() => {
    socket.emit('dose:intent', { householdId, petId: pet._id, medId: med.medId });
  }, [householdId, pet._id, med.medId]);

  const doseLabel = med.isInsulin ? '4 units' : '1 dose';

  async function submit(confirm: boolean) {
    setBusy(true);
    const base: DosePayload = {
      householdId,
      petId: pet._id,
      type: med.isInsulin ? 'insulin' : 'medication',
      medId: med.medId,
      amount: med.isInsulin ? 4 : null,
      unit: med.isInsulin ? 'units' : null,
      idempotencyKey: crypto.randomUUID(),
      confirm,
    };
    try {
      // confirm=false is the normal first attempt; confirm=true from the advisory step
      // signals an intentional repeat dose.
      const res = await logDose(base);
      if (res.kind === 'created') {
        toast('ok', `${med.name} logged for ${pet.name}`);
        onClose();
      } else if (res.kind === 'needs-confirmation') {
        setRecent({ by: nameById[res.recent.administeredBy] ?? 'a caregiver', minutesAgo: res.recent.minutesAgo });
        setStep('advisory');
      } else {
        setConflict({ by: nameById[res.alreadyGivenBy] ?? 'a caregiver', at: res.administeredAt });
        setStep('conflict');
      }
    } catch (e) {
      toast('warn', (e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <div className="modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        {step === 'confirm' && (
          <>
            <div className="modal-icon accent"><MedIcon type={med.isInsulin ? 'insulin' : 'medication'} size={22} /></div>
            <h3>Log {med.name}</h3>
            <p>Confirm the details below before recording this dose.</p>

            {presenceBy && (
              <div className="modal-banner" style={{ marginTop: 14 }}>
                <span className="pulse-dot" /> {presenceBy} is currently logging this dose.
              </div>
            )}

            <div className="modal-detail">
              <div className="kv"><span>Pet</span><span>{pet.name}</span></div>
              <div className="kv"><span>Medication</span><span>{med.name}</span></div>
              <div className="kv"><span>Dose</span><span>{doseLabel}</span></div>
              <div className="kv"><span>Administered by</span><span>{meName}</span></div>
              <div className="kv"><span>Time</span><span>{clockTime(new Date().toISOString())}</span></div>
            </div>

            <div className="modal-actions">
              <button className="btn-secondary" disabled={busy} onClick={onClose}>Cancel</button>
              <button className="btn-primary" disabled={busy} onClick={() => submit(false)}>Confirm dose</button>
            </div>
          </>
        )}

        {step === 'advisory' && recent && (
          <>
            <div className="modal-icon due"><AlertTriangle size={22} /></div>
            <h3>Already logged recently</h3>
            <p>
              This dose was already logged by <strong>{recent.by}</strong> {recent.minutesAgo} minute
              {recent.minutesAgo === 1 ? '' : 's'} ago. You can still log it if this is a separate, intended dose.
            </p>
            <div className="modal-actions">
              <button className="btn-secondary" disabled={busy} onClick={() => submit(true)}>Log anyway</button>
              <button className="btn-primary" disabled={busy} onClick={onClose}>Keep as is</button>
            </div>
          </>
        )}

        {step === 'conflict' && conflict && (
          <>
            <div className="modal-icon ok"><ShieldCheck size={22} /></div>
            <h3>Already taken care of</h3>
            <p>
              This dose was logged by <strong>{conflict.by}</strong> at {clockTime(conflict.at)}. No additional dose
              was given - {pet.name} is safe.
            </p>
            <div className="modal-actions">
              <button className="btn-primary" onClick={onClose}>Done</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
