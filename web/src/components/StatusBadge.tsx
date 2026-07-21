import type { SlotStatus } from '../lib/status';

const LABEL: Record<SlotStatus, string> = {
  done: 'Done',
  'due-soon': 'Due soon',
  overdue: 'Overdue',
  upcoming: 'Scheduled',
};

export default function StatusBadge({ status, text }: { status: SlotStatus; text?: string }) {
  return (
    <span className={`badge ${status}`}>
      <span className="dot" />
      {text ?? LABEL[status]}
    </span>
  );
}
