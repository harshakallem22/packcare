import { useState } from 'react';
import { Plus } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { createPet } from '../api/hooks';
import { useToast } from './Toasts';

export default function AddPet({ householdId }: { householdId: string }) {
  const qc = useQueryClient();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const [name, setName] = useState('');
  const [species, setSpecies] = useState('cat');
  const [medName, setMedName] = useState('');
  const [isInsulin, setIsInsulin] = useState(false);
  const [schedule, setSchedule] = useState('');
  const [windowMinutes, setWindowMinutes] = useState(30);

  async function submit() {
    setBusy(true);
    try {
      const slots = schedule.split(',').map((s) => s.trim()).filter((s) => /^\d{2}:\d{2}$/.test(s));
      const medications = medName.trim() ? [{ name: medName.trim(), isInsulin, schedule: slots, windowMinutes }] : [];
      await createPet({ householdId, name: name.trim(), species, medications });
      await qc.invalidateQueries({ queryKey: ['pets', householdId] });
      toast('ok', `${name.trim()} added`);
      setOpen(false);
      setName(''); setMedName(''); setSchedule(''); setIsInsulin(false);
    } catch (e) {
      toast('warn', (e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button className="btn-secondary" onClick={() => setOpen(true)}>
        <Plus size={16} /> Add a pet
      </button>
    );
  }

  return (
    <div className="card pet" style={{ maxWidth: 560 }}>
      <h3>Add a pet</h3>
      <div className="grid2" style={{ marginTop: 12 }}>
        <label className="field"><span>Name</span><input value={name} onChange={(e) => setName(e.target.value)} placeholder="Whiskers" /></label>
        <label className="field"><span>Species</span><input value={species} onChange={(e) => setSpecies(e.target.value)} /></label>
      </div>
      <p className="muted small">Optional medication schedule - this is what powers double-dose prevention.</p>
      <div className="grid2" style={{ marginTop: 8 }}>
        <label className="field"><span>Medication</span><input value={medName} onChange={(e) => setMedName(e.target.value)} placeholder="Insulin (Vetsulin)" /></label>
        <label className="field"><span>Times (comma-separated)</span><input value={schedule} onChange={(e) => setSchedule(e.target.value)} placeholder="08:00, 18:00" /></label>
      </div>
      <div className="grid2">
        <label className="field row-check"><input type="checkbox" checked={isInsulin} onChange={(e) => setIsInsulin(e.target.checked)} /> <span>This is insulin</span></label>
        <label className="field"><span>Window (minutes)</span><input type="number" value={windowMinutes} onChange={(e) => setWindowMinutes(Number(e.target.value))} /></label>
      </div>
      <div className="row end">
        <button className="btn-secondary" onClick={() => setOpen(false)}>Cancel</button>
        <button className="btn-primary" disabled={busy || !name.trim()} onClick={submit}>Add pet</button>
      </div>
    </div>
  );
}
