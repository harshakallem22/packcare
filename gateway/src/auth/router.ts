import { Router } from 'express';
import { randomBytes } from 'crypto';
import { z } from 'zod';
import { config } from '../config';
import { careLog } from '../clients/careLog';
import { getAuthUrl, exchangeCodeForProfile } from './google';
import { signSession, setSessionCookie, clearSessionCookie } from './jwt';
import { requireAuth } from '../middleware/auth';
import { validateBody } from '../middleware/validate';

export const authRouter = Router();

const STATE_COOKIE = 'packcare_oauth_state';

// ─── Google OAuth ──────────────────────────────────────────
authRouter.get('/auth/google/login', (req, res) => {
  if (!config.google.enabled) {
    return res.status(404).json({ error: 'Google OAuth not configured; use POST /auth/dev-login' });
  }
  const state = randomBytes(16).toString('hex');
  res.cookie(STATE_COOKIE, state, { httpOnly: true, sameSite: 'lax', secure: !config.isDev, maxAge: 600_000 });
  res.redirect(getAuthUrl(state));
});

authRouter.get('/auth/google/callback', async (req, res) => {
  if (!config.google.enabled) return res.status(404).json({ error: 'Google OAuth not configured' });

  const { code, state } = req.query as { code?: string; state?: string };
  if (!code || !state || state !== req.cookies?.[STATE_COOKIE]) {
    return res.status(400).json({ error: 'invalid oauth state' });
  }
  res.clearCookie(STATE_COOKIE);

  const profile = await exchangeCodeForProfile(code);
  const { body: user } = await careLog.upsertUser({
    googleSub: profile.sub,
    email: profile.email,
    displayName: profile.name,
    avatarUrl: profile.picture ?? null,
  });

  const u = user as { _id: string; email: string; displayName: string };
  setSessionCookie(res, signSession({ userId: u._id, email: u.email, displayName: u.displayName }));
  res.redirect(config.webOrigin);
});

// ─── Dev-login fallback (development only) ─────────────────
const devLoginSchema = z.object({ as: z.enum(['sarah', 'alex']).optional() });

authRouter.post('/auth/dev-login', validateBody(devLoginSchema), async (req, res) => {
  if (!config.isDev) return res.status(404).json({ error: 'dev-login disabled outside development' });

  // Seed the demo household + two caregivers + diabetic cat (idempotent).
  const { body: seed } = await careLog.seedDemo();
  const data = seed as { users: { sarah: any; alex: any }; household: any; pet: any };
  const who = (req.body.as as 'sarah' | 'alex') ?? 'sarah';
  const user = data.users[who];

  setSessionCookie(res, signSession({ userId: user._id, email: user.email, displayName: user.displayName }));
  res.json({ user, household: data.household, pet: data.pet });
});

// ─── Session ──────────────────────────────────────────────
authRouter.get('/auth/me', requireAuth, (req, res) => {
  res.json(req.session);
});

authRouter.post('/auth/logout', (_req, res) => {
  clearSessionCookie(res);
  res.json({ ok: true });
});
