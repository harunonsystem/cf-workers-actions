# Testing Guide

This document describes the testing strategy and how to run tests for cloudflare-actions.

## Test Structure

All actions in this project are implemented in TypeScript and tested with Vitest:

```
cloudflare-actions/
├── tests/                              # All Vitest tests
│   ├── cloudflare-api.test.ts         # Cloudflare API client tests
│   ├── url-generator.test.ts          # URL generator tests
│   ├── wrangler.test.ts               # Wrangler wrapper tests
│   ├── integration.test.ts            # Integration tests
│   ├── preview-setup.test.ts          # Preview setup tests (12 tests)
│   └── workers-cleanup.test.ts        # Workers cleanup tests (24 tests)
│
├── src/                                # Node.js actions source
│   ├── deploy/
│   ├── comment/
│   ├── cleanup/
│   └── shared/
│
├── preview-setup/src/                  # Preview setup action
│   ├── setup.ts                       # Business logic
│   └── index.ts                       # Action entry point
│
└── workers-cleanup/src/                # Workers cleanup action
    ├── cleanup.ts                      # Business logic
    └── index.ts                        # Action entry point
```

## Running Tests

### Run All Tests

```bash
pnpm test
```

### Run Specific Test Files

```bash
# Preview setup tests
pnpm test preview-setup

# Workers cleanup tests
pnpm test workers-cleanup

# All shared library tests
pnpm test cloudflare-api
pnpm test url-generator
pnpm test wrangler
```

### Run Tests with Coverage

```bash
pnpm run test:coverage
```

## Test Strategy

All actions use TypeScript + Vitest with comprehensive test coverage.

### Current Test Results

```
✓ tests/cloudflare-api.test.ts (14 tests)
✓ tests/url-generator.test.ts (23 tests)
✓ tests/wrangler.test.ts (15 tests)
✓ tests/integration.test.ts (0 tests)
✓ tests/preview-setup.test.ts (12 tests)
✓ tests/workers-cleanup.test.ts (24 tests)

Test Files  6 passed (6)
Tests  88 passed (88)
```

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [GitHub Actions Testing](https://docs.github.com/en/actions/creating-actions/creating-a-javascript-action)
