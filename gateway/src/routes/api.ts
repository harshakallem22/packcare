import { Router } from 'express';
import { z } from 'zod';
import { careLog } from '../clients/careLog';
import { requireAuth } from '../middleware/auth';
import { validateBody } from '../middleware/validate';

export const apiRouter = Router();
apiRouter.use(requireAuth);

// ─── Households ────────────────────────────────────────────
apiRouter.post('/households', validateBody(z.object({ name: z.string().min(1), timezone: z.string().optional() })), async (req, res) => {
  const { status, body } = await careLog.createHousehold({ ...req.body, ownerUserId: req.session!.userId });
  res.status(status).json(body);
});

apiRouter.get('/households', async (req, res) => {
  const { status, body } = await careLog.listHouseholds(req.session!.userId);
  res.status(status).json(body);
});

apiRouter.post('/households/join', validateBody(z.object({ inviteCode: z.string().min(1) })), async (req, res) => {
  const { status, body } = await careLog.joinHousehold({ inviteCode: req.body.inviteCode, userId: req.session!.userId });
  res.status(status).json(body);
});

apiRouter.get('/households/:id/timeline', async (req, res) => {
  const { status, body } = await careLog.timeline(req.params.id);
  res.status(status).json(body);
});

apiRouter.get('/households/:id/pets', async (req, res) => {
  const { status, body } = await careLog.listPets(req.params.id);
  res.status(status).json(body);
});

apiRouter.get('/households/:id/members', async (req, res) => {
  const { status, body } = await careLog.listMembers(req.params.id);
  res.status(status).json(body);
});

// ─── Pets ──────────────────────────────────────────────────
const medSchema = z.object({
  name: z.string().min(1),
  isInsulin: z.boolean().optional(),
  schedule: z.array(z.string().regex(/^\d{2}:\d{2}$/)).optional(),
  windowMinutes: z.number().int().positive().optional(),
});
apiRouter.post('/pets', validateBody(z.object({
  householdId: z.string().min(1),
  name: z.string().min(1),
  species: z.string().optional(),
  weightKg: z.number().positive().optional(),
  medications: z.array(medSchema).optional(),
})), async (req, res) => {
  const { status, body } = await careLog.createPet(req.body);
  res.status(status).json(body);
});

apiRouter.get('/pets/:id', async (req, res) => {
  const { status, body } = await careLog.getPet(req.params.id);
  res.status(status).json(body);
});

// ─── Care events: doses + feedings (the safety-critical writes) ──
const doseSchema = z.object({
  householdId: z.string().min(1),
  petId: z.string().min(1),
  type: z.enum(['medication', 'insulin']),
  medId: z.string().min(1), // doses always reference a medication; the server derives the slot key
  amount: z.number().nullish(),
  unit: z.string().nullish(),
  injectionSite: z.string().nullish(),
  administeredAt: z.string().datetime().optional(),
  idempotencyKey: z.string().min(1),
  note: z.string().nullish(),
  confirm: z.boolean().optional(), // acknowledges the advisory "already given recently" warning
});
apiRouter.post('/doses', validateBody(doseSchema), async (req, res) => {
  const { status, body } = await careLog.createCareEvent({ ...req.body, administeredByUserId: req.session!.userId });
  res.status(status).json(body);
});

const feedingSchema = z.object({
  householdId: z.string().min(1),
  petId: z.string().min(1),
  amount: z.number().nullish(),
  unit: z.string().nullish(),
  administeredAt: z.string().datetime().optional(),
  idempotencyKey: z.string().min(1),
  note: z.string().nullish(),
});
apiRouter.post('/feedings', validateBody(feedingSchema), async (req, res) => {
  const { status, body } = await careLog.createCareEvent({ ...req.body, type: 'feeding', administeredByUserId: req.session!.userId });
  res.status(status).json(body);
});

apiRouter.patch('/care-events/:id/void', async (req, res) => {
  const { status, body } = await careLog.voidCareEvent(req.params.id);
  res.status(status).json(body);
});
