import { config } from './config';

/**
 * MVP cross-service real-time: Care-Log POSTs the committed event to the Gateway's
 * token-protected /internal/emit route, which fans it out to the household room over
 * Socket.IO. (Scale path: swap this for @socket.io/redis-emitter - see README.)
 * Best-effort: a failed broadcast must never fail the write that already committed.
 */
export async function emitToHousehold(
  event: string,
  householdId: string,
  payload: unknown,
): Promise<void> {
  try {
    const res = await fetch(`${config.gatewayInternalUrl}/internal/emit`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-internal-token': config.internalEmitToken,
      },
      body: JSON.stringify({ event, householdId, payload }),
    });
    if (!res.ok) {
      console.error(`[care-log] emit non-OK (non-fatal): ${res.status} for ${event}`);
    }
  } catch (err) {
    console.error('[care-log] emit failed (non-fatal):', (err as Error).message);
  }
}
