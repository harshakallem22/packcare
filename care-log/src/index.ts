import { config } from './config';
import { connectDb } from './db';
import { syncAllIndexes } from './models';
import { createApp } from './app';

async function main() {
  await connectDb();
  // Critical: the safety guarantees depend on the partial unique indexes existing
  // before we accept any writes.
  await syncAllIndexes();
  console.log('[care-log] connected to MongoDB and indexes are in sync');

  const app = createApp();
  app.listen(config.port, () => {
    console.log(`[care-log] listening on :${config.port}`);
  });
}

main().catch((err) => {
  console.error('[care-log] fatal startup error:', err);
  process.exit(1);
});
