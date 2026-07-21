import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { devLogin } from '../api/hooks';
import { GATEWAY_URL } from '../config';
import Brand from '../components/Brand';

export default function Login() {
  const qc = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function loginAs(as: 'sarah' | 'alex') {
    setBusy(true);
    setError(null);
    try {
      await devLogin(as);
      await qc.invalidateQueries({ queryKey: ['me'] });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="center">
      <div className="card auth">
        <Brand />
        <h1>Shared pet care, without the double dose</h1>
        <p className="lead">
          Everyone caring for your pet sees the same live record of what's been fed and
          medicated - so a dose is never accidentally given twice.
        </p>

        <div className="actions">
          <button className="btn-primary" disabled={busy} onClick={() => loginAs('sarah')}>Continue as Sarah</button>
          <button className="btn-secondary" disabled={busy} onClick={() => loginAs('alex')}>Continue as Alex</button>
        </div>

        <p className="muted small" style={{ marginTop: 12 }}>
          Demo caregivers in a shared household. Open a second window as the other caregiver
          to see the live timeline and double-dose prevention.
        </p>

        <div className="divider">or</div>
        <a className="small" href={`${GATEWAY_URL}/auth/google/login`}>Sign in with Google</a>

        {error && <p className="error">{error}</p>}
      </div>
    </main>
  );
}
