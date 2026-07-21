import { Router } from 'express';
import { z } from 'zod';
import { Types } from 'mongoose';
import { Pet } from '../models';

export const petsRouter = Router();

const medicationSchema = z.object({
  name: z.string().min(1),
  isInsulin: z.boolean().optional(),
  schedule: z.array(z.string().regex(/^\d{2}:\d{2}$/)).optional(),
  windowMinutes: z.number().int().positive().optional(),
});

const createPetSchema = z.object({
  householdId: z.string().min(1),
  name: z.string().min(1),
  species: z.string().optional(),
  weightKg: z.number().positive().optional(),
  medications: z.array(medicationSchema).optional(),
});

petsRouter.post('/pets', async (req, res) => {
  const parsed = createPetSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { householdId, ...rest } = parsed.data;
  const pet = await Pet.create({ householdId: new Types.ObjectId(householdId), ...rest });
  res.status(201).json(pet);
});

petsRouter.get('/pets/:id', async (req, res) => {
  if (!Types.ObjectId.isValid(req.params.id)) return res.status(400).json({ error: 'invalid id' });
  const pet = await Pet.findById(req.params.id);
  if (!pet) return res.status(404).json({ error: 'not found' });
  res.json(pet);
});
