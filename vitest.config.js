import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['**/__tests__/**/*.test.js', '**/?(*.)+(spec|test).js'],
    coverage: {
      provider: 'v8',
      include: ['shared/lib/**/*.js', 'deploy/**/*.js', 'comment/**/*.js', 'cleanup/**/*.js'],
      exclude: ['**/node_modules/**', '**/__tests__/**'],
      reporter: ['text', 'lcov', 'html']
    },
    setupFiles: ['./vitest.setup.js']
  }
});
