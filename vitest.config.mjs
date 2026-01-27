import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts', 'src/**/__tests__/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/**/__tests__/**/*.test.ts', 'src/shared/types.ts'],
      reporter: ['text', 'lcov', 'html']
    },
    setupFiles: ['./vitest.setup.ts']
  }
});
