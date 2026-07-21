import { Pill, Syringe, Utensils } from 'lucide-react';
import type { CareEventPayload } from '../types';

/** Clinical line icon for a care-event / medication type. */
export default function MedIcon({ type, isInsulin, size = 18 }: { type: CareEventPayload['type']; isInsulin?: boolean; size?: number }) {
  if (type === 'feeding') return <Utensils size={size} />;
  if (type === 'insulin' || isInsulin) return <Syringe size={size} />;
  return <Pill size={size} />;
}
