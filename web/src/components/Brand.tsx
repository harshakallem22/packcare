import { Activity } from 'lucide-react';

export default function Brand({ subtitle }: { subtitle?: string }) {
  return (
    <div className="brand">
      <span className="brand-mark">
        <Activity size={18} strokeWidth={2.4} />
      </span>
      <span>
        <span className="brand-name">PackCare</span>
        {subtitle && <span className="brand-sub"> · {subtitle}</span>}
      </span>
    </div>
  );
}
