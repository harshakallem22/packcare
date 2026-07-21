import { Router } from 'express';
import mongoose from 'mongoose';

export const healthRouter = Router();

healthRouter.get('/health', (_req, res) => {
  const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  res.json({
    service: 'care-log',
    status: 'ok',
    db: states[mongoose.connection.readyState] ?? 'unknown',
  });
});
