import express from 'express';
import { healthRouter } from './routes/health';
import { usersRouter } from './routes/users';
import { householdsRouter } from './routes/households';
import { petsRouter } from './routes/pets';
import { careEventsRouter } from './routes/careEvents';

/** Build the Express app (no listen) - reused by the server entrypoint and tests. */
export function createApp() {
  const app = express();
  app.use(express.json());

  app.use(healthRouter);
  app.use(usersRouter);
  app.use(householdsRouter);
  app.use(petsRouter);
  app.use(careEventsRouter);

  // Centralized async error handler.
  app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('[care-log] error:', err);
    res.status(500).json({ error: 'internal error' });
  });

  return app;
}
