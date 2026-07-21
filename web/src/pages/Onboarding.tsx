import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { createHousehold, joinHousehold } from '../api/hooks';

export default function Onboarding() {
  const qc = useQueryClient();
  const [mode, setMode] = useState<'create' | 'join'>('create');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      if (mode === 'create') await createHousehold(name.trim());
      else await joinHousehold(code.trim().toUpperCase());
      await qc.invalidateQueries({ queryKey: ['households'] });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card pet" style={{ maxWidth: 520 }}>
      <h2>Set up your household</h2>
      <p className="muted small" style={{ marginTop: 6 }}>
        A household is the shared space where every caregiver sees the same care record.
      </p>

      <div className="tabs">
        <button className={mode === 'create' ? 'active' : ''} onClick={() => setMode('create')}>Create</button>
        <button className={mode === 'join' ? 'active' : ''} onClick={() => setMode('join')}>Join with code</button>
      </div>

      {mode === 'create' ? (
        <label className="field">
          <span>Household name</span>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="The Reddy Household" />
        </label>
      ) : (
        <label className="field">
          <span>Invite code</span>
          <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="K7Q2-9XPM" />
        </label>
      )}

      <button
        className="btn-primary"
        disabled={busy || (mode === 'create' ? !name.trim() : !code.trim())}
        onClick={submit}
      >
        {mode === 'create' ? 'Create household' : 'Join household'}
      </button>
      {error && <p className="error">{error}</p>}
    </div>
  );
}
