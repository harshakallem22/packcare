import { createClient, RedisClientType } from 'redis';
import { config } from './config';

// Presence locks are best-effort: if Redis is unavailable, presence simply degrades to
// "broadcast without a TTL lock" rather than taking the gateway down.
let client: RedisClientType | null = null;
let ready = false;

export async function initRedis(): Promise<void> {
  try {
    client = createClient({ url: config.redisUrl });
    client.on('error', (err) => {
      if (ready) console.error('[gateway] redis error:', err.message);
    });
    await client.connect();
    ready = true;
    console.log('[gateway] connected to Redis (presence locks enabled)');
  } catch (err) {
    ready = false;
    client = null;
    console.warn('[gateway] Redis unavailable - presence runs without TTL locks:', (err as Error).message);
  }
}

/**
 * Try to claim a presence lock for a dose-intent target.
 * Returns true if acquired (or if Redis is absent, so presence still broadcasts).
 * SET key value NX EX 30 - auto-expires if the caregiver abandons the action.
 */
export async function claimPresence(key: string, userId: string, ttlSeconds = 30): Promise<boolean> {
  if (!ready || !client) return true;
  try {
    const res = await client.set(`presence:${key}`, userId, { NX: true, EX: ttlSeconds });
    return res === 'OK';
  } catch {
    return true;
  }
}
