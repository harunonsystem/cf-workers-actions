# Contributing to Cloudflare Actions

Thank you for your interest in contributing to Cloudflare Actions! This document provides guidelines and information for contributors.

## 🚀 Getting Started

### Prerequisites

- Node.js 18 or higher
- pnpm
- Git

### Setup

1. Fork the repository
2. Clone your fork:

   ```bash
   git clone https://github.com/harunonsystem/cloudflare-actions.git
   cd cloudflare-actions
   ```

3. Install dependencies:

   ```bash
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
4. Ensure all tests pass:

   ```bash
   pnpm test      # Run Vitest (ultra-fast testing)
   pnpm run lint  # Run Oxlint (ultra-fast linting)
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

- We use Oxlint (ultra-fast linter) and Prettier for code formatting
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

### Writing Tests

- All new functionality should have corresponding tests
- Tests are located in `tests/` directory
- Use Vitest for testing (50-100x faster than Jest)
- Write tests in TypeScript (`.test.ts` files)
- Aim for >90% code coverage

### Test Structure

```javascript
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

## 📁 Project Structure

```
cloudflare-actions/
├── src/                   # TypeScript source code
│   ├── deploy/           # Deploy action source
│   ├── comment/          # Comment action source
│   ├── cleanup/          # Cleanup action source
│   └── shared/           # Shared libraries
│       ├── types.ts           # TypeScript type definitions
│       └── lib/               # Reusable modules
├── dist/                  # Compiled JavaScript (for GitHub Actions)
├── tests/                 # Test files (TypeScript)
├── deploy/                # Deploy action metadata
│   └── action.yml        # Action definition
├── comment/               # Comment action metadata
├── cleanup/               # Cleanup action metadata
└── .github/               # GitHub workflows
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

3. Create `index.js` following the existing pattern
4. Add comprehensive tests
5. Update documentation

### Best Practices

- **Error Handling**: Always provide meaningful error messages
- **Logging**: Use `core.info()`, `core.debug()`, `core.warning()`, and `core.error()`
- **Outputs**: Set all declared outputs, even on failure (empty strings)
- **Validation**: Validate all inputs early in the action
- **Documentation**: Document all parameters and use cases

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

### JSDoc Comments

Use JSDoc for function documentation:

```javascript
/**
 * Generate worker name from pattern and PR number
 * @param {string} pattern - Worker name pattern (e.g., "project-pr-{pr_number}")
 * @param {number} prNumber - Pull request number
 * @returns {string} Generated worker name
 */
function generateWorkerName(pattern, prNumber) {
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

Thank you for contributing to Cloudflare Actions! 🚀
