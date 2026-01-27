# Agent Guidelines for cf-workers-actions

## Commands

- **Build**: `pnpm build` (TypeScript compilation)
- **Lint**: `pnpm lint` (Biome)
- **Typecheck**: `pnpm typecheck` (tsc --noEmit)
- **Test all**: `pnpm test` (vitest run)
- **Test single file**: `pnpm exec vitest run tests/filename.test.ts`
- **Test coverage**: `pnpm test:coverage`
- **Test watch**: `pnpm test:watch`
- **Format**: `pnpm format` (Biome)
- **Full check**: `pnpm check` (typecheck + lint + test)
- **E2E tests**: Run via GitHub Actions (`.github/workflows/e2e.yml`)

## Code Style

- **Imports**: ES6 imports, external libs first, then internal (relative paths with `../`)
- **Formatting**: Biome (single quotes, semicolons, 100 width, 2 spaces)
- **Types**: Strict TypeScript, interfaces for data structures, explicit return types
- **Naming**: camelCase variables/functions, PascalCase classes/interfaces
- **Error handling**: `error instanceof Error ? error.message : 'Unknown error'`, use core.error/core.warning
- **Async**: async/await with try/catch, graceful error handling
- **Testing**: Vitest with describe/test, vi mocking, beforeEach setup
- **Linting**: Biome (recommended rules, no excessive complexity)
