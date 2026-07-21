import type { CareEventPayload } from '../types';
import CareEventCard from './CareEventCard';

export default function Timeline({
  events,
  nameById,
  householdId,
}: {
  events: CareEventPayload[];
  nameById: Record<string, string>;
  householdId: string;
}) {
  const visible = events.filter((e) => e.householdId === householdId);

  if (visible.length === 0) {
    return <div className="empty">No care logged yet today. Log a dose or feeding and it will appear here in real time.</div>;
  }

  return (
    <div className="timeline">
      {visible.map((e) => (
        <CareEventCard key={e._id} event={e} by={nameById[e.administeredByUserId] ?? 'A caregiver'} />
      ))}
    </div>
  );
}
