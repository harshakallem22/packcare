import { CheckCircle2, Clock, AlertTriangle } from 'lucide-react';

export default function TodayStatus({ done, dueSoon, overdue }: { done: number; dueSoon: number; overdue: number }) {
  return (
    <section className="summary">
      <div className="stat done">
        <div className="stat-head"><CheckCircle2 size={16} className="stat-icon" /> Done today</div>
        <div className="stat-num">{done}</div>
      </div>
      <div className="stat due-soon">
        <div className="stat-head"><Clock size={16} className="stat-icon" /> Due soon</div>
        <div className="stat-num">{dueSoon}</div>
      </div>
      <div className="stat overdue">
        <div className="stat-head"><AlertTriangle size={16} className="stat-icon" /> Overdue</div>
        <div className="stat-num">{overdue}</div>
      </div>
    </section>
  );
}
