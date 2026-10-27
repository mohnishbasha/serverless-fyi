import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/unit/**/*.test.ts'],
    environment: 'node',
    coverage: {
      provider: 'v8',
      include: ['src/lib/**', 'migration/**/*.ts', 'integrations/**', 'scripts/lib/**'],
      reporter: ['text-summary', 'lcov'],
    },
  },
});
