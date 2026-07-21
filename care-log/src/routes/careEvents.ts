import { Router } from 'express';
import { z } from 'zod';
import { Types } from 'mongoose';
import { CareEvent } from '../models';
import { createCareEvent } from '../services/dose';
import { emitToHousehold } from '../emit';

export const careEventsRouter = Router();

const createSchema = z.object({
  householdId: z.string().min(1),
  petId: z.string().min(1),
  type: z.enum(['feeding', 'medication', 'insulin']),
  medId: z.string().nullish(),
  amount: z.number().nullish(),
  unit: z.string().nullish(),
  injectionSite: z.string().nullish(),
  administeredByUserId: z.string().min(1),
  administeredAt: z.coerce.date().optional(),
  idempotencyKey: z.string().nullish(),
  note: z.string().nullish(),
  // The server derives doseSlotKey; the client never supplies it. `confirm` acknowledges
  // the advisory "already given recently" warning.
  confirm: z.boolean().optional(),
});

// The safety-critical write. Runs the full layered defense (see services/dose.ts).
careEventsRouter.post('/care-events', async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const result = await createCareEvent(parsed.data);

  switch (result.outcome) {
    case 'created':
      await emitToHousehold('careEvent:created', parsed.data.householdId, result.event);
      return res.status(201).json(result.event);

    case 'conflict':
      // Hard duplicate of a scheduled slot - reassuring, not an error in the UI.
      return res.status(409).json({
        error: 'already-given',
        alreadyGivenBy: result.alreadyGivenBy,
        administeredAt: result.administeredAt,
      });

    case 'needs-confirmation':
      // Soft advisory: a recent dose exists. Client re-POSTs with confirm:true to proceed.
      return res.status(200).json({ status: 'needs-confirmation', recent: result.recent });

    case 'duplicate-idempotency':
      // Same button press already succeeded - return it, no re-broadcast.
      return res.status(200).json(result.event);
  }
});

// Soft-delete a mistaken entry. Voiding frees the dose slot (it leaves the partial index).
careEventsRouter.patch('/care-events/:id/void', async (req, res) => {
  if (!Types.ObjectId.isValid(req.params.id)) return res.status(400).json({ error: 'invalid id' });

  const event = await CareEvent.findByIdAndUpdate(req.params.id, { voided: true }, { new: true });
  if (!event) return res.status(404).json({ error: 'not found' });

  await emitToHousehold('careEvent:voided', String(event.householdId), event);
  res.json(event);
});
