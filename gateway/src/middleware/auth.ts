import { Request, Response, NextFunction } from 'express';
import { verifySession, COOKIE_NAME, SessionClaims } from '../auth/jwt';

// Augment Express's Request with the authenticated session.
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      session?: SessionClaims;
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const token = req.cookies?.[COOKIE_NAME];
  const claims = token ? verifySession(token) : null;
  if (!claims) {
    res.status(401).json({ error: 'unauthenticated' });
    return;
  }
  req.session = claims;
  next();
}
