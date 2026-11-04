# Contributing to cf-workers-actions

Thank you for your interest in contributing to cf-workers-actions! This document provides guidelines and information for contributors.

## 🚀 Getting Started

### Prerequisites

- mise
- Node.js 24.22.1 or higher (managed by mise)
- pnpm 12.15.0 or higher (managed by mise)
- Git

### Setup

1. Fork the repository
2. Clone your fork:

   ```bash
   git clone https://github.com/harunonsystem/cf-workers-actions.git
   cd cf-workers-actions
   ```

3. Install the pinned toolchain and dependencies:

   ```bash
   mise install
   pnpm install
   ```

4. Run tests to ensure everything works:
   ```bash
   pnpm test
   ```

## 🏗️ Development Workflow

### Making Changes

1. Create a feature branch:

   ```bash
   git checkout -b feature/your-feature-name
   ```

2. Make your changes
3. Add tests for new functionality
4. Ensure all checks pass:

   ```bash
   pnpm run typecheck     # TypeScript type checking
   pnpm run format:check  # Check code formatting (oxfmt)
   pnpm run lint          # Run linter (oxlint)
   pnpm test              # Run Vitest (ultra-fast testing)
   pnpm build             # Bundle TypeScript actions to dist/
   ```

5. Commit your changes:

   ```bash
   git commit -m "feat: add amazing new feature"
   ```

6. Push to your fork:

   ```bash
   git push origin feature/your-feature-name
   ```

7. Create a Pull Request

### Commit Message Convention

We use [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` - New features
- `fix:` - Bug fixes
- `docs:` - Documentation changes
- `test:` - Test-related changes
- `refactor:` - Code refactoring
- `chore:` - Maintenance tasks

### Code Style

- We use `oxlint` for linting and `oxfmt` for code formatting
- Run `pnpm run lint` to check code quality
- Run `pnpm run format` to format code (`pnpm run format:check` to verify)

## 🧪 Testing

### Running Tests

```bash
# Run all tests
pnpm test

# Run tests with coverage
pnpm run test:coverage

# Run tests in watch mode
pnpm run test:watch

# Run tests with UI
pnpm run test:ui
```

### E2E Tests

E2E tests run in GitHub Actions and test the actual deployment workflow against Cloudflare.

**Note:** E2E tests use the maintainer's 1Password vault. If you want to run E2E tests on your fork, update `.github/actions/load-secrets/action.yml` with your own 1Password references:

```yaml
CLOUDFLARE_ACCOUNT_ID: op://your-vault/your-item/account-id
CLOUDFLARE_API_TOKEN: op://your-vault/your-item/api-token
```

And set `OP_SERVICE_ACCOUNT_TOKEN` in your repository secrets.

E2E tests are automatically skipped for PRs from forks (no access to secrets).

### Writing Tests

- All new functionality should have corresponding tests
- Tests are located in `tests/` and `src/**/__tests__/`
- Use Vitest for testing (50-100x faster than Jest)
- Write tests in TypeScript (`.test.ts` files)
- Aim for >90% code coverage

### Test Structure

```typescript
describe("feature-name", () => {
  describe("specific-function", () => {
    test("should do something specific", () => {
      // Test implementation
    });

    test("should handle error cases", () => {
      // Error handling test
    });
  });
});
```

## 🔧 TypeScript Development

### Type Checking

Run TypeScript type checking to ensure type safety:

```bash
pnpm run typecheck  # Check types without emitting files
```

### Building

Bundle TypeScript actions into standalone JavaScript for GitHub Actions:

```bash
pnpm build  # Bundle src/<action>/index.ts into dist/<action>/index.js via @vercel/ncc
```

The build process:

1. Bundles each action entry point from `src/<action>/index.ts` into a single `dist/<action>/index.js` using `@vercel/ncc`
2. Removes intermediate `.d.ts` and chunk byproducts so `dist/` contains only the runtime bundles
3. Supports Node.js 24+ during development and CI; published Actions run on the `node24` runtime

### TypeScript Best Practices

- **Schema & Type Definitions**: Define Zod schemas and shared interfaces in `src/shared/schemas.ts` and per-action `schemas.ts`
- **Strict Mode**: All TypeScript code uses strict type checking
- **Import/Export**: Use ES6 imports/exports consistently
- **Error Types**: Use proper error typing with union types for error handling
- **Generic Types**: Leverage TypeScript generics for reusable utilities

## 📁 Project Structure

```
cf-workers-actions/
├── src/                        # TypeScript source code (development)
│   ├── prepare-preview-deploy/ # Prepare preview deploy action source
│   │   ├── index.ts
│   │   └── schemas.ts
│   ├── preview-deploy/         # All-in-one preview deploy action source
│   │   ├── index.ts
│   │   └── schemas.ts
│   ├── pr-comment/             # PR comment action source
│   │   ├── index.ts
│   │   └── schemas.ts
│   ├── cleanup/                # Cleanup action source
│   │   ├── index.ts
│   │   ├── cleanup-policy.ts
│   │   ├── schemas.ts
│   │   └── utils.ts
│   └── shared/                 # Shared TypeScript libraries
│       ├── schemas.ts          # Shared Zod schemas and types
│       ├── validation.ts       # Action input/output validation helpers
│       └── lib/                # Reusable TypeScript modules
├── dist/                       # Bundled JavaScript (auto-generated for GitHub Actions)
│   ├── prepare-preview-deploy/
│   │   └── index.js
│   ├── preview-deploy/
│   │   └── index.js
│   ├── pr-comment/
│   │   └── index.js
│   └── cleanup/
│       └── index.js
├── tests/                      # Test files (TypeScript)
├── prepare-preview-deploy/     # Prepare preview deploy action metadata (action.yml)
├── preview-deploy/             # Preview deploy action metadata (action.yml)
├── pr-comment/                 # PR comment action metadata (action.yml)
├── cleanup/                    # Cleanup action metadata (action.yml)
└── .github/                    # GitHub workflows and CI/CD
```

## 🔧 Action Development Guidelines

### Creating New Actions

1. Create a new directory with the action name
2. Add `action.yml` with proper metadata:

   ```yaml
   name: "Action Name"
   description: "Clear description of what the action does"
   author: "harunonsystem"

   branding:
     icon: "appropriate-icon"
     color: "color-name"

   inputs:
     required-input:
       description: "Description"
       required: true

   outputs:
     output-name:
       description: "Description"

   runs:
     using: "node24"
     main: "../dist/action-name/index.js"
   ```

3. Create `src/action-name/index.ts` and `src/action-name/schemas.ts` following the existing TypeScript pattern
4. Add the action to `scripts/build.mjs` and run `pnpm build`
5. Add comprehensive tests
6. Update documentation

### Best Practices

- **Type Safety**: Use TypeScript interfaces and Zod schemas for all data structures and action inputs/outputs
- **Error Handling**: Always provide meaningful error messages with `handleActionError`
- **Logging**: Use `info()`, `debug()`, `warning()`, and `error()` from `src/shared/lib/logger.ts`
- **Outputs**: Set all declared outputs, even on failure (empty strings)
- **Validation**: Validate all inputs early in the action with `getActionInputs` and `TypedInputConfig`
- **Documentation**: Document all parameters and use cases with TSDoc comments

### Shared Libraries

When adding functionality that could be reused:

1. Add it to `src/shared/lib/`
2. Export functions clearly
3. Add comprehensive tests
4. Document the API

## 📚 Documentation

### README Updates

When adding new features:

1. Update the main README.md
2. Add usage examples
3. Update the feature list
4. Document any new inputs/outputs

### TSDoc Comments

Use TSDoc for function documentation in TypeScript:

```typescript
/**
 * Process template variables in worker name
 * @param template - Worker name template (e.g., "myapp-{branch-name}")
 * @param variables - Template variables ({ branchName, commitHash })
 * @returns Sanitized worker name
 */
function processTemplate(template: string, variables: TemplateVariables): string {
  // Implementation
}
```

## 🐛 Bug Reports

When reporting bugs:

1. Use the issue template
2. Provide reproduction steps
3. Include relevant logs
4. Specify action version
5. Describe expected vs actual behavior

## 💡 Feature Requests

For new features:

1. Check existing issues first
2. Describe the use case
3. Explain the proposed solution
4. Consider backward compatibility

## 🔍 Code Review

### Review Checklist

- [ ] Code follows project conventions
- [ ] Tests cover new functionality
- [ ] Documentation is updated
- [ ] No breaking changes (or properly documented)
- [ ] Performance considerations addressed
- [ ] Security implications considered

### Review Process

1. All PRs require at least one review
2. CI must pass before merging
3. Maintainers will provide feedback
4. Address review comments promptly

## 📄 License

By contributing, you agree that your contributions will be licensed under the MIT License.

## 🆘 Getting Help

- Open an issue for bugs or feature requests
- Join discussions in existing issues
- Review the documentation thoroughly

## 🙏 Recognition

Contributors will be:

- Listed in the CHANGELOG for their contributions
- Mentioned in release notes for significant features
- Added to the contributors section (if desired)

Thank you for contributing to cf-workers-actions! 🚀
