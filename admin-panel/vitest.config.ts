import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    include: ['tests/unit/**/*.test.ts'],
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: [
        'src/lib/api/api-keys.ts',
        'src/lib/api/pagination.ts',
        'src/lib/api/types.ts',
        'src/lib/validations/**/*.ts',
        'src/lib/constants.ts',
        'src/lib/timezone.ts',
        'src/lib/videoUtils.ts',
        'src/lib/license/**/*.ts',
        'src/lib/cors.ts',
      ],
      exclude: ['**/*.d.ts', '**/types.ts'],
      thresholds: {
        lines: 90,
        functions: 90,
        branches: 85,
        statements: 90,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
