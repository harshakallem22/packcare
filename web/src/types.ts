// Mirror of the Gateway's event contracts (gateway/src/events.ts) for end-to-end type
// safety on the client. Keep in sync with the server.

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
  'dose:intent': (payload: { householdId: string; petId: string; medId: string }) => void;
}

// ─── REST domain types ─────────────────────────────────────
export interface Me {
  userId: string;
  email: string;
  displayName: string;
}

export interface Household {
  _id: string;
  name: string;
  timezone: string;
  inviteCode: string;
}

export interface Medication {
  medId: string;
  name: string;
  isInsulin: boolean;
  schedule: string[];
  windowMinutes: number;
}

export interface Pet {
  _id: string;
  householdId: string;
  name: string;
  species: string;
  weightKg: number | null;
  medications: Medication[];
}

export interface Member {
  userId: string;
  displayName: string;
  email: string;
  avatarUrl: string | null;
  role: 'owner' | 'caregiver';
}
