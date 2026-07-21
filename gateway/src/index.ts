import { createServer } from 'http';
import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import { config } from './config';
import { authRouter } from './auth/router';
import { apiRouter } from './routes/api';
import { createInternalRouter } from './routes/internal';
import { createSocketServer } from './socket';
import { initRedis } from './redis';

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use(cors({ origin: config.webOrigin, credentials: true }));

app.get('/health', (_req, res) => {
  res.json({ service: 'gateway', status: 'ok', oauth: config.google.enabled ? 'google' : 'dev-login' });
});

// Socket.IO must attach to the SAME http server Express listens on - so we create the
// http server explicitly and use httpServer.listen (NOT app.listen).
const httpServer = createServer(app);
const io = createSocketServer(httpServer);

app.use(authRouter);
// The internal emit route (token-auth) MUST be mounted before apiRouter - apiRouter
// applies requireAuth to every path, which would otherwise 401 the cross-service POST.
app.use(createInternalRouter(io));
app.use(apiRouter);

// Centralized error handler (Express 5 forwards async errors here automatically).
app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[gateway] error:', err);
  res.status(500).json({ error: 'internal error' });
});

// Connect Redis (best-effort) before accepting connections, then start the server.
void initRedis().finally(() => {
  httpServer.listen(config.port, () => {
    console.log(`[gateway] listening on :${config.port} (auth: ${config.google.enabled ? 'google' : 'dev-login'})`);
  });
});
