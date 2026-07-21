import { ShieldCheck } from 'lucide-react';
import type { CareEventPayload } from '../types';
import { relativeTime, clockTime } from '../lib/time';
import { voidEvent } from '../api/hooks';
import Avatar from './Avatar';
import MedIcon from './MedIcon';

const LABEL: Record<CareEventPayload['type'], string> = {
  feeding: 'Fed',
  insulin: 'Insulin dose',
  medication: 'Medication',
};

export default function CareEventCard({ event, by }: { event: CareEventPayload; by: string }) {
  const amount = event.amount != null ? `${event.amount} ${event.unit ?? ''}`.trim() : null;
  const isDose = event.type === 'insulin' || event.type === 'medication';

  return (
    <div className={`tl-item ${event.type} ${event.voided ? 'voided' : ''}`}>
      <span className="tl-node"><MedIcon type={event.type} size={16} /></span>
      <div className="tl-card">
        <div className="tl-line1">
          <span className="tl-action">{LABEL[event.type]}</span>
          {amount && <span className="tl-amount">· {amount}</span>}
          {event.injectionSite && <span className="muted small">· {event.injectionSite}</span>}
          {event.voided && <span className="badge neutral">Voided</span>}
          {!event.voided && isDose && (
            <span className="safe-tag" title="No duplicate dose was possible"><ShieldCheck size={13} /> Logged safely</span>
          )}
        </div>
        <div className="tl-line2">
          <Avatar name={by} size="sm" />
          <span>{by}</span>
          <span className="tl-time">· {clockTime(event.administeredAt)} · {relativeTime(event.administeredAt)}</span>
          {!event.voided && (
            <button className="btn-ghost btn-sm tl-void" onClick={() => voidEvent(event._id)} title="Correct a mistaken entry">
              Void
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
