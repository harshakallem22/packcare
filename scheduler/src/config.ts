import dotenv from 'dotenv';

dotenv.config();
dotenv.config({ path: '../.env' });

export const config = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.SCHEDULER_PORT ?? 5100),
  mongoUri: process.env.MONGODB_URI ?? 'mongodb://localhost:27017/packcare?replicaSet=rs0',
  gatewayInternalUrl: process.env.GATEWAY_INTERNAL_URL ?? 'http://localhost:4000',
  internalEmitToken: process.env.INTERNAL_EMIT_TOKEN ?? 'change-me',
} as const;
