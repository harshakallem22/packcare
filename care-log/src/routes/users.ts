import { Router } from 'express';
import { z } from 'zod';
import { Types } from 'mongoose';
import { User, Household, Membership, Pet } from '../models';
import { generateInviteCode } from '../lib/ids';

export const usersRouter = Router();

const upsertSchema = z.object({
  googleSub: z.string().nullish(),
  email: z.string().email(),
  displayName: z.string().min(1),
  avatarUrl: z.string().url().nullish(),
});

// Called by the gateway after OAuth / dev-login to materialize the user record.
usersRouter.post('/users/upsert', async (req, res) => {
  const parsed = upsertSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { googleSub, email, displayName, avatarUrl } = parsed.data;
  const query = googleSub ? { googleSub } : { email };
  const user = await User.findOneAndUpdate(
    query,
    { $set: { email, displayName, avatarUrl: avatarUrl ?? null }, $setOnInsert: { googleSub: googleSub ?? null } },
    { new: true, upsert: true },
  );
  res.json(user);
});

usersRouter.get('/users/:id', async (req, res) => {
  if (!Types.ObjectId.isValid(req.params.id)) return res.status(400).json({ error: 'invalid id' });
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ error: 'not found' });
  res.json(user);
});

/**
 * Dev-only seed: a demo household with TWO caregivers and a diabetic cat on twice-daily
 * insulin - so the two-browser real-time / double-dose demo works out of the box.
 * Idempotent: re-seeding returns the existing demo data.
 */
usersRouter.post('/dev/seed', async (_req, res) => {
  const sarah = await User.findOneAndUpdate(
    { email: 'sarah@demo.packcare' },
    { $set: { displayName: 'Sarah', avatarUrl: null }, $setOnInsert: { googleSub: null } },
    { new: true, upsert: true },
  );
  const alex = await User.findOneAndUpdate(
    { email: 'alex@demo.packcare' },
    { $set: { displayName: 'Alex', avatarUrl: null }, $setOnInsert: { googleSub: null } },
    { new: true, upsert: true },
  );

  let household = await Household.findOne({ name: 'Demo Household' });
  if (!household) {
    household = await Household.create({
      name: 'Demo Household',
      timezone: 'America/New_York',
      inviteCode: generateInviteCode(),
    });
    await Membership.create({ householdId: household._id, userId: sarah._id, role: 'owner' });
    await Membership.create({ householdId: household._id, userId: alex._id, role: 'caregiver' });
  }

  let pet = await Pet.findOne({ householdId: household._id, name: 'Whiskers' });
  if (!pet) {
    pet = await Pet.create({
      householdId: household._id,
      name: 'Whiskers',
      species: 'cat',
      weightKg: 4.5,
      medications: [
        { name: 'Insulin (Vetsulin)', isInsulin: true, schedule: ['08:00', '18:00'], windowMinutes: 30 },
      ],
    });
  }

  res.json({ users: { sarah, alex }, household, pet });
});
