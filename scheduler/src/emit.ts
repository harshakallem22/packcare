import { config } from './config';

/** Push a reminder to a household room via the Gateway's internal /emit (best-effort). */
export async function emitToHousehold(event: string, householdId: string, payload: unknown): Promise<void> {
  try {
    await fetch(`${config.gatewayInternalUrl}/internal/emit`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-internal-token': config.internalEmitToken },
      body: JSON.stringify({ event, householdId, payload }),
    });
  } catch (err) {
    console.error('[scheduler] emit failed (non-fatal):', (err as Error).message);
  }
}
