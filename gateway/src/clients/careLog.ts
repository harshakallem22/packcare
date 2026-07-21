import { config } from '../config';

/**
 * Thin REST client to the Care-Log service. The gateway never touches MongoDB directly;
 * all durable state goes through here so the safety-critical logic stays in one service.
 */

export interface CareLogResponse<T = unknown> {
  status: number;
  body: T;
}

async function request<T = unknown>(
  method: string,
  path: string,
  body?: unknown,
): Promise<CareLogResponse<T>> {
  const res = await fetch(`${config.careLogUrl}${path}`, {
    method,
    headers: { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  const parsed = text ? JSON.parse(text) : null;
  return { status: res.status, body: parsed as T };
}

export const careLog = {
  upsertUser: (u: { googleSub?: string | null; email: string; displayName: string; avatarUrl?: string | null }) =>
    request('POST', '/users/upsert', u),
  getUser: (id: string) => request('GET', `/users/${id}`),
  seedDemo: () => request('POST', '/dev/seed'),

  listHouseholds: (userId: string) => request('GET', `/households?userId=${encodeURIComponent(userId)}`),
  createHousehold: (b: unknown) => request('POST', '/households', b),
  joinHousehold: (b: unknown) => request('POST', '/households/join', b),
  timeline: (householdId: string) => request('GET', `/households/${householdId}/events`),
  listPets: (householdId: string) => request('GET', `/households/${householdId}/pets`),
  listMembers: (householdId: string) => request('GET', `/households/${householdId}/members`),

  createPet: (b: unknown) => request('POST', '/pets', b),
  getPet: (id: string) => request('GET', `/pets/${id}`),

  createCareEvent: (b: unknown) => request('POST', '/care-events', b),
  voidCareEvent: (id: string) => request('PATCH', `/care-events/${id}/void`),
};
