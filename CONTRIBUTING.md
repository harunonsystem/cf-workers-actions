# Contributing to cf-workers-actions

Thank you for your interest in contributing to cf-workers-actions! This document provides guidelines and information for contributors.

## 🚀 Getting Started

### Prerequisites

- mise
- Node.js 22.12.0 or higher (managed by mise)
- pnpm 11.22.0 or higher (managed by mise)
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
   pnpm run typecheck  # TypeScript type checking
   pnpm run lint       # Run Biome (linting and checking)
   pnpm test           # Run Vitest (ultra-fast testing)
   pnpm build          # Build TypeScript to JavaScript
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

- We use Biome for both linting and code formatting
- Run `pnpm run lint` to check code quality (10-100x faster than ESLint)
- Run `pnpm run format` to format code

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
- Tests are located in `tests/` directory
- Use Vitest for testing (50-100x faster than Jest)
- Write tests in TypeScript (`.test.ts` files)
- Aim for >90% code coverage

### Test Structure

```typescript
describe('feature-name', () => {
  describe('specific-function', () => {
    test('should do something specific', () => {
      // Test implementation
    });

    test('should handle error cases', () => {
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

Compile TypeScript to JavaScript for GitHub Actions:

```bash
pnpm build  # Compile src/ to dist/
```

The build process:

1. Compiles TypeScript files from `src/` to JavaScript in `dist/`
2. Generates type declaration files (`.d.ts`)
3. Supports Node.js 22.12+ during development and CI; published Actions run on the `node24` runtime
4. Maintains source maps for debugging

### TypeScript Best Practices

- **Interface Definitions**: Define interfaces for all input/output data structures in `shared/types.ts`
- **Strict Mode**: All TypeScript code uses strict type checking
- **Import/Export**: Use ES6 imports/exports consistently
- **Error Types**: Use proper error typing with union types for error handling
- **Generic Types**: Leverage TypeScript generics for reusable utilities

## 📁 Project Structure

```
cf-workers-actions/
├── src/                   # TypeScript source code (development)
│   ├── deploy/           # Deploy action TypeScript source
│   │   └── index.ts      # Deploy action entry point
│   ├── comment/          # Comment action TypeScript source
│   │   └── index.ts      # Comment action entry point
│   ├── cleanup/          # Cleanup action TypeScript source
│   │   └── index.ts      # Cleanup action entry point
│   └── shared/           # Shared TypeScript libraries
│       ├── types.ts           # TypeScript type definitions
│       └── lib/               # Reusable TypeScript modules
├── dist/                  # Compiled JavaScript (auto-generated for GitHub Actions)
│   ├── deploy/
│   │   └── index.js      # Compiled deploy action
│   ├── comment/
│   │   └── index.js      # Compiled comment action
│   ├── cleanup/
│   │   └── index.js      # Compiled cleanup action
│   └── shared/           # Compiled shared libraries
├── tests/                 # Test files (TypeScript)
├── deploy/                # Deploy action metadata
│   └── action.yml        # Action definition (references dist/deploy/index.js)
├── comment/               # Comment action metadata
├── cleanup/               # Cleanup action metadata
└── .github/               # GitHub workflows and CI/CD
```

## 🔧 Action Development Guidelines

### Creating New Actions

1. Create a new directory with the action name
2. Add `action.yml` with proper metadata:

   ```yaml
   name: 'Action Name'
   description: 'Clear description of what the action does'
   author: 'harunonsystem'

   branding:
     icon: 'appropriate-icon'
     color: 'color-name'

   inputs:
     required-input:
       description: 'Description'
       required: true

   outputs:
     output-name:
       description: 'Description'

   runs:
     using: 'node20'
     main: 'index.js'
   ```

3. Create `src/action-name/index.ts` following the existing TypeScript pattern
4. Run `pnpm build` to compile TypeScript to JavaScript
5. Add comprehensive tests
6. Update documentation

### Best Practices

- **Type Safety**: Use TypeScript interfaces for all data structures and function parameters
- **Error Handling**: Always provide meaningful error messages with proper typing
- **Logging**: Use `core.info()`, `core.debug()`, `core.warning()`, and `core.error()`
- **Outputs**: Set all declared outputs, even on failure (empty strings)
- **Validation**: Validate all inputs early in the action with type guards
- **Documentation**: Document all parameters and use cases with TSDoc comments

### Shared Libraries

When adding functionality that could be reused:

1. Add it to `shared/lib/`
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
 * Generate worker name from pattern and PR number
 * @param pattern - Worker name pattern (e.g., "project-pr-{pr_number}")
 * @param prNumber - Pull request number
 * @returns Generated worker name
 */
function generateWorkerName(pattern: string, prNumber: number): string {
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
