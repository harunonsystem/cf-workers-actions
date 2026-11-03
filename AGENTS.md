# Agent Guidelines for cf-workers-actions

## Commands

- **Build**: `pnpm build` (Bundles actions with `@vercel/ncc` via `scripts/build.mjs`)
- **Lint**: `pnpm lint` (oxlint) / `pnpm lint:fix`
- **Typecheck**: `pnpm typecheck` (`tsc --noEmit`)
- **Test all**: `pnpm test` (`vitest run`)
- **Test single file**: `pnpm exec vitest run tests/filename.test.ts`
- **Test coverage**: `pnpm test:coverage`
- **Test watch**: `pnpm test:watch`
- **Format**: `pnpm format` (oxfmt) / `pnpm format:check`
- **Full check**: `pnpm check` (typecheck + format:check + lint + test)
- **E2E tests**: Run via GitHub Actions (`.github/workflows/e2e.yml`)

## Code Style

- **Imports**: ES6 imports, external libs first, then internal (relative paths with `../`)
- **Formatting**: oxfmt (double quotes, semicolons, 100 width, 2 spaces, no trailing commas)
- **Types**: Strict TypeScript, interfaces for data structures, explicit return types
- **Naming**: camelCase variables/functions, PascalCase classes/interfaces
- **Error handling**: `getErrorMessage(error)` / `handleActionError(error, context)`, use `logger` (`info`, `warning`, `error`, `debug`)
- **Async**: async/await with try/catch, graceful error handling
- **Testing**: Vitest with describe/test, vi mocking, beforeEach setup
- **Linting**: oxlint (`typescript`, `unicorn`, `oxc` plugins)
