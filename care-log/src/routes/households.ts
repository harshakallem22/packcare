import { Router } from 'express';
import { z } from 'zod';
import { Types } from 'mongoose';
import { Household, Membership, CareEvent, Pet } from '../models';
import { generateInviteCode } from '../lib/ids';

export const householdsRouter = Router();

const createSchema = z.object({
  name: z.string().min(1),
  timezone: z.string().optional(),
  ownerUserId: z.string().min(1),
});

householdsRouter.post('/households', async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { name, timezone, ownerUserId } = parsed.data;
  const household = await Household.create({
    name,
    timezone: timezone ?? 'America/New_York',
    inviteCode: generateInviteCode(),
  });
  await Membership.create({ householdId: household._id, userId: new Types.ObjectId(ownerUserId), role: 'owner' });

  res.status(201).json(household);
});

const joinSchema = z.object({
  inviteCode: z.string().min(1),
  userId: z.string().min(1),
});

householdsRouter.post('/households/join', async (req, res) => {
  const parsed = joinSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { inviteCode, userId } = parsed.data;
  const household = await Household.findOne({ inviteCode: inviteCode.toUpperCase() });
  if (!household) return res.status(404).json({ error: 'invalid invite code' });

  try {
    await Membership.create({ householdId: household._id, userId: new Types.ObjectId(userId), role: 'caregiver' });
  } catch (err) {
    if ((err as { code?: number }).code !== 11000) throw err; // already a member → idempotent
  }
  res.status(200).json(household);
});

// Households a given user belongs to.
householdsRouter.get('/households', async (req, res) => {
  const userId = String(req.query.userId ?? '');
  if (!userId) return res.status(400).json({ error: 'userId query param required' });

  const memberships = await Membership.find({ userId: new Types.ObjectId(userId) });
  const households = await Household.find({ _id: { $in: memberships.map((m) => m.householdId) } });
  res.json(households);
});

// Timeline: the household's recent care events, newest first (uses the compound index).
householdsRouter.get('/households/:id/events', async (req, res) => {
  const limit = Math.min(Number(req.query.limit ?? 100), 500);
  const events = await CareEvent.find({ householdId: new Types.ObjectId(req.params.id) })
    .sort({ administeredAt: -1 })
    .limit(limit);
  res.json(events);
});

// Pets in a household (with their medication schedules, so the UI can offer dose actions).
householdsRouter.get('/households/:id/pets', async (req, res) => {
  const pets = await Pet.find({ householdId: new Types.ObjectId(req.params.id) });
  res.json(pets);
});

// Members of a household, with display names - so the timeline can show "given by Sarah".
householdsRouter.get('/households/:id/members', async (req, res) => {
  const members = await Membership.find({ householdId: new Types.ObjectId(req.params.id) }).populate(
    'userId',
    'displayName email avatarUrl',
  );
  res.json(
    members.map((m) => {
      const u = m.userId as unknown as { _id: unknown; displayName: string; email: string; avatarUrl: string | null };
      return { userId: String(u._id), displayName: u.displayName, email: u.email, avatarUrl: u.avatarUrl, role: m.role };
    }),
  );
});
