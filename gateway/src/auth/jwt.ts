import jwt from 'jsonwebtoken';
import { Response } from 'express';
import { config } from '../config';

export interface SessionClaims {
  userId: string;
  email: string;
  displayName: string;
}

const COOKIE_NAME = 'packcare_session';
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export function signSession(claims: SessionClaims): string {
  return jwt.sign(claims, config.jwtSecret, { expiresIn: '7d' });
}

export function verifySession(token: string): SessionClaims | null {
  try {
    return jwt.verify(token, config.jwtSecret) as SessionClaims;
  } catch {
    return null;
  }
}

// Session JWT is stored in an HttpOnly cookie (not accessible to JS) so a compromised
// web bundle can't exfiltrate the token; sameSite=lax + secure-in-prod guard CSRF.
export function setSessionCookie(res: Response, token: string): void {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: !config.isDev,
    maxAge: MAX_AGE_MS,
  });
}

export function clearSessionCookie(res: Response): void {
  res.clearCookie(COOKIE_NAME);
}

export { COOKIE_NAME };
