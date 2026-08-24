import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.test.ts',
        'src/__tests__/**',
        'src/types.ts', // Interface-only file
      ],
      lines: 75,
      functions: 75,
      branches: 70,
      statements: 75,
    },
    testMatch: ['**/__tests__/**/*.test.ts', '**/*.test.ts'],
    setupFiles: ['./vitest.setup.ts'],
  },
});
