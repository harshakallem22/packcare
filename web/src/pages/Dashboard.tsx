import { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { LogOut } from 'lucide-react';
import { socket } from '../socket';
import { logout, useHouseholds, useMembers, usePets, useTimeline } from '../api/hooks';
import type { CareEventPayload, Me, PresenceUpdate, ReminderPayload } from '../types';
import { computeMedSlots, summarize } from '../lib/status';
import Brand from '../components/Brand';
import Avatar from '../components/Avatar';
import ThemeToggle from '../components/ThemeToggle';
import TodayStatus from '../components/TodayStatus';
import PetCard from '../components/PetCard';
import Timeline from '../components/Timeline';
import AddPet from '../components/AddPet';
import Onboarding from './Onboarding';
import { useToast } from '../components/Toasts';

export default function Dashboard({ me }: { me: Me }) {
  const qc = useQueryClient();
  const toast = useToast();
  const { data: households, isLoading: loadingHh } = useHouseholds(true);
  const household = households?.[0];
  const householdId = household?._id;

  const { data: pets } = usePets(householdId);
  const { data: members } = useMembers(householdId);
  const { data: events } = useTimeline(householdId);

  const [presence, setPresence] = useState<Record<string, { userId: string; displayName: string }>>({});

  const nameById = useMemo(() => {
    const map: Record<string, string> = {};
    for (const m of members ?? []) map[m.userId] = m.displayName;
    return map;
  }, [members]);

  const slots = useMemo(() => computeMedSlots(pets ?? [], events ?? []), [pets, events]);
  const totals = summarize(slots);

  // Live socket wiring: keeps the react-query timeline cache, presence map, and toasts
  // in sync with the household's real-time events. Runs once per active household.
  useEffect(() => {
    if (!householdId) return;
    socket.connect();

    // careEvent:created/voided → merge into the cached timeline (de-dupe by _id,
    // newest first) and clear any stale presence for that med.
    const upsert = (event: CareEventPayload) => {
      if (event.householdId !== householdId) return;
      qc.setQueryData<CareEventPayload[]>(['timeline', householdId], (old) => {
        const rest = (old ?? []).filter((e) => e._id !== event._id);
        return [event, ...rest].sort((a, b) => +new Date(b.administeredAt) - +new Date(a.administeredAt));
      });
      if (event.medId) setPresence((p) => ({ ...p, [`${event.petId}:${event.medId}`]: undefined as any }));
    };

    // Another caregiver is about to log this dose; show it, then expire after 30s
    // in case the corresponding careEvent never lands to clear it.
    const onPresence = (u: PresenceUpdate) => {
      if (u.householdId !== householdId || !u.active) return;
      const key = `${u.petId}:${u.medId}`;
      setPresence((p) => ({ ...p, [key]: { userId: u.userId, displayName: u.displayName } }));
      setTimeout(() => setPresence((p) => ({ ...p, [key]: undefined as any })), 30_000);
    };

    // Server-driven reminders (upcoming) and overdue alerts surface as toasts.
    const onReminder = (r: ReminderPayload) => toast('reminder', r.message);
    const onOverdue = (r: ReminderPayload) => toast('warn', r.message);

    socket.on('careEvent:created', upsert);
    socket.on('careEvent:voided', upsert);
    socket.on('presence:update', onPresence);
    socket.on('reminder:due', onReminder);
    socket.on('dose:overdue', onOverdue);
    return () => {
      socket.off('careEvent:created', upsert);
      socket.off('careEvent:voided', upsert);
      socket.off('presence:update', onPresence);
      socket.off('reminder:due', onReminder);
      socket.off('dose:overdue', onOverdue);
    };
  }, [householdId, qc, toast]);

  async function handleLogout() {
    await logout();
    socket.disconnect();
    await qc.invalidateQueries({ queryKey: ['me'] });
  }

  return (
    <div className="app">
      <header className="topbar">
        <Brand subtitle={household?.name} />
        <div className="topbar-right">
          {household && (
            <span className="invite">Invite&nbsp;code <code>{household.inviteCode}</code></span>
          )}
          <ThemeToggle />
          <Avatar name={me.displayName} />
          <button className="btn-ghost btn-sm" onClick={handleLogout}><LogOut size={15} /> Sign out</button>
        </div>
      </header>

      <main className="shell">
        {loadingHh && <div className="card skeleton" style={{ padding: 0 }}><div className="skel card-h" /></div>}

        {!loadingHh && !household && <Onboarding />}

        {household && (
          <>
            <TodayStatus done={totals.done} dueSoon={totals.dueSoon} overdue={totals.overdue} />

            <section className="stack">
              <div className="section-title"><h2>Pets &amp; medications</h2></div>
              {!pets && <div className="card" style={{ padding: 0 }}><div className="skel card-h" /></div>}
              {pets?.map((pet) => (
                <PetCard
                  key={pet._id}
                  pet={pet}
                  householdId={household._id}
                  meId={me.userId}
                  meName={me.displayName}
                  nameById={nameById}
                  presence={presence}
                  slots={slots.filter((s) => s.petId === pet._id)}
                />
              ))}
              {pets && <AddPet householdId={household._id} />}
            </section>

            <section>
              <div className="section-title"><h2>Care timeline</h2></div>
              <Timeline events={events ?? []} nameById={nameById} householdId={household._id} />
            </section>
          </>
        )}
      </main>
    </div>
  );
}
