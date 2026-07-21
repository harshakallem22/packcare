import dotenv from 'dotenv';

dotenv.config();
dotenv.config({ path: '../.env' });

export const config = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  isDev: (process.env.NODE_ENV ?? 'development') === 'development',
  port: Number(process.env.GATEWAY_PORT ?? 4000),

  jwtSecret: process.env.JWT_SECRET ?? 'change-me',

  google: {
    clientId: process.env.GOOGLE_CLIENT_ID ?? '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
    redirectUri: process.env.GOOGLE_REDIRECT_URI ?? 'http://localhost:4000/auth/google/callback',
    // OAuth is enabled only when a client id is configured; otherwise dev-login is used.
    get enabled() {
      return Boolean(process.env.GOOGLE_CLIENT_ID);
    },
  },

  redisUrl: process.env.REDIS_URL ?? 'redis://localhost:6379',
  careLogUrl: process.env.CARE_LOG_URL ?? 'http://localhost:5000',
  internalEmitToken: process.env.INTERNAL_EMIT_TOKEN ?? 'change-me',
  webOrigin: process.env.WEB_ORIGIN ?? 'http://localhost:5173',
} as const;
