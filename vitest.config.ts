import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    root: './server',
    include: ['tests/**/*.test.ts'],
    env: {
      NODE_ENV: 'test',
    },
    globals: true,
    setupFiles: [],
    teardownTimeout: 5000,
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
  },
});