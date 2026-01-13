import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    name: 'config',
    include: ['tests/config/**/*.test.ts'],
    environment: 'node',
    setupFiles: ['dotenv/config'],
    testTimeout: 10000,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
