import { useQuery } from '@tanstack/react-query';
import { api, ApiError } from './client';
import type { CareEventPayload, Household, Me, Medication, Member, Pet } from '../types';

// ─── Queries ───────────────────────────────────────────────
export function useMe() {
  return useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      try {
        return await api.get<Me>('/auth/me');
      } catch (e) {
        if ((e as ApiError).status === 401) return null;
        throw e;
      }
    },
    retry: false,
  });
}

export function useHouseholds(enabled: boolean) {
  return useQuery({ queryKey: ['households'], queryFn: () => api.get<Household[]>('/households'), enabled });
}

export function usePets(householdId?: string) {
  return useQuery({
    queryKey: ['pets', householdId],
    queryFn: () => api.get<Pet[]>(`/households/${householdId}/pets`),
    enabled: Boolean(householdId),
  });
}

export function useMembers(householdId?: string) {
  return useQuery({
    queryKey: ['members', householdId],
    queryFn: () => api.get<Member[]>(`/households/${householdId}/members`),
    enabled: Boolean(householdId),
  });
}

export function useTimeline(householdId?: string) {
  return useQuery({
    queryKey: ['timeline', householdId],
    queryFn: () => api.get<CareEventPayload[]>(`/households/${householdId}/timeline`),
    enabled: Boolean(householdId),
  });
}

// ─── Auth helpers ──────────────────────────────────────────
export function devLogin(as: 'sarah' | 'alex') {
  return api.post('/auth/dev-login', { as });
}
export function logout() {
  return api.post('/auth/logout');
}

// ─── Care-event writes ─────────────────────────────────────
export interface DosePayload {
  householdId: string;
  petId: string;
  type: 'medication' | 'insulin';
  medId: string;
  amount?: number | null;
  unit?: string | null;
  injectionSite?: string | null;
  idempotencyKey: string;
  confirm?: boolean;
}

export type DoseResult =
  | { kind: 'created'; event: CareEventPayload }
  | { kind: 'needs-confirmation'; recent: { administeredBy: string; minutesAgo: number; administeredAt: string } }
  | { kind: 'conflict'; alreadyGivenBy: string; administeredAt: string };

/** POST a dose and normalize the layered-safety responses into a discriminated result. */
export async function logDose(input: DosePayload): Promise<DoseResult> {
  try {
    const body = await api.post<any>('/doses', input);
    if (body && body.status === 'needs-confirmation') return { kind: 'needs-confirmation', recent: body.recent };
    return { kind: 'created', event: body as CareEventPayload };
  } catch (e) {
    const err = e as ApiError;
    if (err.status === 409) {
      return { kind: 'conflict', alreadyGivenBy: err.body.alreadyGivenBy, administeredAt: err.body.administeredAt };
    }
    throw err;
  }
}

export function logFeeding(input: { householdId: string; petId: string; amount?: number | null; unit?: string | null; idempotencyKey: string }) {
  return api.post<CareEventPayload>('/feedings', input);
}

export function voidEvent(id: string) {
  return api.patch<CareEventPayload>(`/care-events/${id}/void`);
}

// ─── Onboarding ────────────────────────────────────────────
export function createHousehold(name: string) {
  return api.post<Household>('/households', { name });
}
export function joinHousehold(inviteCode: string) {
  return api.post<Household>('/households/join', { inviteCode });
}

export interface NewPet {
  householdId: string;
  name: string;
  species?: string;
  weightKg?: number;
  medications?: Array<Omit<Medication, 'medId'>>;
}
export function createPet(input: NewPet) {
  return api.post<Pet>('/pets', input);
}
