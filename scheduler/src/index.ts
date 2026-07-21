import express from 'express';
import cron from 'node-cron';
import { config } from './config';
import { connectDb } from './db';
import { scanReminders } from './jobs/reminders';

async function main() {
  await connectDb();
  console.log('[scheduler] connected to MongoDB');

  // Every minute: scan all schedules and emit due-soon / overdue reminders to rooms.
  cron.schedule('* * * * *', () => {
    scanReminders().catch((err) => console.error('[scheduler] scan error:', err));
  });
  console.log('[scheduler] reminder scan registered (every minute)');

  const app = express();
  app.get('/health', (_req, res) => res.json({ service: 'scheduler', status: 'ok' }));
  app.listen(config.port, () => console.log(`[scheduler] health on :${config.port}`));
}

main().catch((err) => {
  console.error('[scheduler] fatal startup error:', err);
  process.exit(1);
});
