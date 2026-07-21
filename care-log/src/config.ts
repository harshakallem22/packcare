import dotenv from 'dotenv';

// In Docker, env comes from env_file. For local dev, load the repo-root .env.
dotenv.config();
dotenv.config({ path: '../.env' });

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

export const config = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.CARE_LOG_PORT ?? 5000),
  mongoUri: required('MONGODB_URI', 'mongodb://localhost:27017/packcare?replicaSet=rs0'),
  // Care-Log pushes real-time events back to the Gateway's internal /emit route.
  gatewayInternalUrl: process.env.GATEWAY_INTERNAL_URL ?? 'http://localhost:4000',
  internalEmitToken: process.env.INTERNAL_EMIT_TOKEN ?? 'change-me',
} as const;
