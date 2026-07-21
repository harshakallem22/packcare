import mongoose from 'mongoose';
import { config } from './config';

let connected = false;

export async function connectDb(uri: string = config.mongoUri): Promise<typeof mongoose> {
  if (connected) return mongoose;

  mongoose.set('strictQuery', true);

  await mongoose.connect(uri, {
    // Fail fast if the replica set isn't reachable rather than hanging forever.
    serverSelectionTimeoutMS: 10_000,
  });

  connected = true;
  // Index sync (the safety-critical partial unique indexes) is triggered separately
  // via syncAllIndexes() at boot, before any writes are accepted.
  return mongoose;
}

export async function disconnectDb(): Promise<void> {
  if (!connected) return;
  await mongoose.disconnect();
  connected = false;
}
