import { describe, it, beforeAll, afterAll, beforeEach, expect } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import request from 'supertest';
import { createApp } from '../src/app';
import { syncAllIndexes, CareEvent, Pet, Household } from '../src/models';
import { getLocalParts } from '../src/lib/slotKey';

let replset: MongoMemoryReplSet;
let app: ReturnType<typeof createApp>;

beforeAll(async () => {
  // A single-node REPLICA SET - transactions, change streams, and (critically) the
  // serialized unique-index writes the safety design relies on all require one.
  replset = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  await mongoose.connect(replset.getUri('packcare_test'), { serverSelectionTimeoutMS: 30_000 });
  // The hard guarantee only exists once the partial unique indexes are built.
  await syncAllIndexes();
  app = createApp();
});

afterAll(async () => {
  await mongoose.disconnect();
  await replset.stop();
});

beforeEach(async () => {
  await Promise.all([CareEvent.deleteMany({}), Pet.deleteMany({}), Household.deleteMany({})]);
});

/** Seed a household + a diabetic cat whose insulin slot lines up with `administeredAt`. */
async function seedPetOnSlot(administeredAt: Date) {
  const tz = 'America/New_York';
  const { minutesOfDay } = getLocalParts(administeredAt, tz);
  const slot = `${String(Math.floor(minutesOfDay / 60)).padStart(2, '0')}:${String(minutesOfDay % 60).padStart(2, '0')}`;

  const household = await Household.create({ name: 'Test Household', timezone: tz, inviteCode: 'TEST-0001' });
  const pet = await Pet.create({
    householdId: household._id,
    name: 'Whiskers',
    species: 'cat',
    medications: [{ name: 'Insulin', isInsulin: true, schedule: [slot], windowMinutes: 30 }],
  });
  const medId = String((pet.medications[0] as any).medId);
  return { householdId: String(household._id), petId: String(pet._id), medId };
}

function dosePayload(ctx: { householdId: string; petId: string; medId: string }, administeredAt: Date, idempotencyKey: string) {
  return {
    householdId: ctx.householdId,
    petId: ctx.petId,
    type: 'insulin' as const,
    medId: ctx.medId,
    amount: 4,
    unit: 'units',
    administeredByUserId: new mongoose.Types.ObjectId().toString(),
    administeredAt: administeredAt.toISOString(),
    idempotencyKey,
    confirm: true, // bypass the soft advisory; we are testing the HARD layer
  };
}

describe('POST /care-events - double-dose prevention', () => {
  it('two concurrent doses for the same slot → exactly one 201, one 409, one document', async () => {
    const administeredAt = new Date('2026-06-26T22:05:00Z');
    const ctx = await seedPetOnSlot(administeredAt);

    // Fire both at once - different idempotency keys, identical scheduled slot.
    const [a, b] = await Promise.all([
      request(app).post('/care-events').send(dosePayload(ctx, administeredAt, 'press-A')),
      request(app).post('/care-events').send(dosePayload(ctx, administeredAt, 'press-B')),
    ]);

    const statuses = [a.status, b.status].sort();
    expect(statuses).toEqual([201, 409]);

    // Exactly one live document persisted for the slot.
    const count = await CareEvent.countDocuments({ doseSlotKey: { $type: 'string' }, voided: false });
    expect(count).toBe(1);

    // The 409 tells the loser who won and when.
    const loser = a.status === 409 ? a : b;
    expect(loser.body.error).toBe('already-given');
    expect(loser.body.alreadyGivenBy).toBeTruthy();
    expect(loser.body.administeredAt).toBeTruthy();
  });

  it('a retried button press (same idempotencyKey) never double-inserts', async () => {
    const administeredAt = new Date('2026-06-26T22:05:00Z');
    const ctx = await seedPetOnSlot(administeredAt);

    const first = await request(app).post('/care-events').send(dosePayload(ctx, administeredAt, 'same-key'));
    const retry = await request(app).post('/care-events').send(dosePayload(ctx, administeredAt, 'same-key'));

    expect(first.status).toBe(201);
    expect(retry.status).toBe(200); // returns the original, no new insert
    expect(retry.body._id).toBe(first.body._id);
    expect(await CareEvent.countDocuments({})).toBe(1);
  });

  it('a second dose without confirm gets the advisory warning, not a silent insert', async () => {
    const administeredAt = new Date('2026-06-26T22:05:00Z');
    const ctx = await seedPetOnSlot(administeredAt);

    await request(app).post('/care-events').send(dosePayload(ctx, administeredAt, 'first'));

    // Same slot, a few minutes later, WITHOUT confirm.
    const later = new Date(administeredAt.getTime() + 5 * 60_000);
    const second = await request(app)
      .post('/care-events')
      .send({ ...dosePayload(ctx, later, 'second'), confirm: false });

    expect(second.status).toBe(200);
    expect(second.body.status).toBe('needs-confirmation');
    expect(second.body.recent.minutesAgo).toBe(5);
    expect(await CareEvent.countDocuments({})).toBe(1); // nothing inserted yet
  });

  it('confirming a same-slot repeat still hits the hard 409 (cannot double a scheduled slot)', async () => {
    const administeredAt = new Date('2026-06-26T22:05:00Z');
    const ctx = await seedPetOnSlot(administeredAt);

    await request(app).post('/care-events').send(dosePayload(ctx, administeredAt, 'first'));

    const later = new Date(administeredAt.getTime() + 5 * 60_000);
    const confirmed = await request(app).post('/care-events').send(dosePayload(ctx, later, 'second')); // confirm:true

    expect(confirmed.status).toBe(409);
    expect(confirmed.body.error).toBe('already-given');
    expect(await CareEvent.countDocuments({ voided: false })).toBe(1);
  });

  it('voiding the winning dose frees the slot for a new live dose', async () => {
    const administeredAt = new Date('2026-06-26T22:05:00Z');
    const ctx = await seedPetOnSlot(administeredAt);

    const first = await request(app).post('/care-events').send(dosePayload(ctx, administeredAt, 'first'));
    expect(first.status).toBe(201);

    // Correct the mistake - soft-delete leaves the partial index, freeing the slot.
    await request(app).patch(`/care-events/${first.body._id}/void`);

    const redo = await request(app).post('/care-events').send(dosePayload(ctx, administeredAt, 'redo'));
    expect(redo.status).toBe(201);
    expect(await CareEvent.countDocuments({ voided: false })).toBe(1);
  });
});
