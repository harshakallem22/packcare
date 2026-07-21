/**
 * Typed Socket.IO event contracts. These interfaces are the source of truth for the
 * real-time API and are intended to be copied to the web client for end-to-end type
 * safety (see web/src/socket.ts).
 */

export interface CareEventPayload {
  _id: string;
  householdId: string;
  petId: string;
  type: 'feeding' | 'medication' | 'insulin';
  medId: string | null;
  doseSlotKey: string | null;
  amount: number | null;
  unit: string | null;
  injectionSite: string | null;
  administeredByUserId: string;
  administeredAt: string;
  note: string | null;
  voided: boolean;
}

export interface PresenceUpdate {
  householdId: string;
  petId: string;
  medId: string;
  userId: string;
  displayName: string;
  active: boolean;
}

export interface ReminderPayload {
  petId: string;
  medId: string;
  doseSlotKey: string;
  scheduledFor: string;
  message: string;
}

export interface ServerToClientEvents {
  'careEvent:created': (event: CareEventPayload) => void;
  'careEvent:voided': (event: CareEventPayload) => void;
  'presence:update': (update: PresenceUpdate) => void;
  'reminder:due': (reminder: ReminderPayload) => void;
  'dose:overdue': (reminder: ReminderPayload) => void;
}

export interface ClientToServerEvents {
  // A caregiver signals "about to log this dose" → presence lock + room broadcast.
  'dose:intent': (payload: { householdId: string; petId: string; medId: string }) => void;
}

export interface InterServerEvents {
  ping: () => void;
}

export interface SocketData {
  userId: string;
  email: string;
  displayName: string;
}
