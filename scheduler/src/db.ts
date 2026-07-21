import mongoose from 'mongoose';
import { config } from './config';

export async function connectDb(): Promise<typeof mongoose> {
  mongoose.set('strictQuery', true);
  await mongoose.connect(config.mongoUri, { serverSelectionTimeoutMS: 10_000 });
  return mongoose;
}
