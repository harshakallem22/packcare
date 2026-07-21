import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // The integration tests share one in-memory replica set; run them in a single
    // process so they don't race over the same Mongoose connection.
    pool: 'forks',
    poolOptions: { forks: { singleFork: true } },
    // First run may download the mongod binary; give it room.
    testTimeout: 120_000,
    hookTimeout: 120_000,
  },
});
