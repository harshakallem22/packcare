import { Router } from 'express';
import { z } from 'zod';
import { config } from '../config';
import type { AppServer } from '../socket';
import type { ServerToClientEvents } from '../events';

const emitSchema = z.object({
  event: z.string().min(1),
  householdId: z.string().min(1),
  payload: z.unknown(),
});

/**
 * Cross-service push: Care-Log and Scheduler POST here (with the shared internal token)
 * and the gateway fans the event out to the household room over Socket.IO. Single-gateway
 * path - scaling to multiple gateways would swap this for the Socket.IO Redis adapter.
 */
export function createInternalRouter(io: AppServer): Router {
  const router = Router();

  router.post('/internal/emit', (req, res) => {
    if (req.header('x-internal-token') !== config.internalEmitToken) {
      return res.status(401).json({ error: 'bad internal token' });
    }
    const parsed = emitSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const { event, householdId, payload } = parsed.data;
    io.to(`household:${householdId}`).emit(event as keyof ServerToClientEvents, payload as never);
    res.json({ ok: true });
  });

  return router;
}
