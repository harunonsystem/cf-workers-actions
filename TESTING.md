# Testing Guide

This document describes the testing strategy and how to run tests for cloudflare-actions.

## Test Structure

This project includes tests for both Node.js actions and composite (shell-based) actions:

```
cloudflare-actions/
├── tests/                           # Node.js action tests (Vitest)
│   ├── cloudflare-api.test.ts
│   ├── url-generator.test.ts
│   ├── wrangler.test.ts
│   └── integration.test.ts
│
├── preview-setup/
│   ├── scripts/setup.sh            # Testable shell functions
│   └── tests/setup.test.sh         # Shell script tests
│
├── workers-cleanup/
│   ├── scripts/cleanup.sh          # Testable shell functions
│   └── tests/cleanup.test.sh       # Shell script tests
│
└── run-tests.sh                     # Main test runner
```

## Running Tests

### Run All Tests

To run all tests (Node.js + composite actions):

```bash
./run-tests.sh
```

### Run Individual Test Suites

#### Node.js Tests

```bash
# Install dependencies first
pnpm install

# Run all Node.js tests
pnpm test

# Run tests with coverage
pnpm run test:coverage

# Run tests in watch mode
pnpm run test:watch
```

#### Composite Action Tests

```bash
# Run preview-setup tests
bash preview-setup/tests/setup.test.sh

# Run workers-cleanup tests
bash workers-cleanup/tests/cleanup.test.sh
```

## Test Strategy

### Node.js Actions

Node.js actions (`deploy`, `comment`, `cleanup`) are tested using:

- **Framework**: Vitest (50-100x faster than Jest)
- **Coverage**: Unit tests for shared libraries
- **Mocking**: API calls and external dependencies are mocked
- **Type Safety**: Full TypeScript support

### Composite Actions

Composite actions (`preview-setup`, `workers-cleanup`, `preview-deploy`, `comments`) follow a testable architecture:

1. **Logic Separation**: Business logic is extracted into `scripts/*.sh` files
2. **Function-based**: Scripts expose testable functions using bash functions
3. **Unit Tests**: Each function is tested independently
4. **Integration**: `action.yml` sources the scripts and calls functions

#### Writing Shell Script Tests

Tests follow a simple pattern:

```bash
#!/usr/bin/env bash
set -euo pipefail

# Source the script to test
source "../scripts/your-script.sh"

# Test helper
assert_equals() {
  local expected="$1"
  local actual="$2"
  local message="$3"

  if [[ "$expected" == "$actual" ]]; then
    echo "✓ PASS: $message"
  else
    echo "✗ FAIL: $message"
    exit 1
  fi
}

# Your test functions
test_your_function() {
  local result
  result=$(your_function "arg1" "arg2")

  assert_equals "expected" "$result" "Should return expected value"
}

# Run tests
test_your_function
```

## Continuous Integration

Tests run automatically on every push and pull request via GitHub Actions:

```yaml
# .github/workflows/ci.yml
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run all tests
        run: ./run-tests.sh
```

## Test Coverage

### Current Coverage

- **Node.js Actions**: Comprehensive unit and integration tests
- **preview-setup**: 9 tests covering all main functions
- **workers-cleanup**: 10 tests covering all cleanup modes
- **preview-deploy**: Tested through preview-setup and comments
- **comments**: Uses GitHub's actions/github-script (tested via integration)

### Coverage Reports

Generate coverage reports for Node.js tests:

```bash
pnpm run test:coverage
```

Coverage reports are saved to `coverage/` directory.

## Best Practices

### For Node.js Tests

1. **Mock External APIs**: Never make real API calls in tests
2. **Test Edge Cases**: Include error scenarios and boundary conditions
3. **Keep Tests Fast**: Vitest is fast, keep it that way
4. **Use TypeScript**: Leverage type safety in tests

### For Shell Script Tests

1. **Test Functions, Not Actions**: Extract logic into testable functions
2. **Use Temporary Directories**: Create isolated test environments
3. **Clean Up**: Always tear down test fixtures
4. **Test Happy and Sad Paths**: Cover both success and failure scenarios
5. **Keep Tests Simple**: Shell tests should be straightforward to understand

## Debugging Tests

### Node.js Tests

```bash
# Run specific test file
pnpm test url-generator.test.ts

# Run with verbose output
pnpm test --reporter=verbose

# Run in watch mode and debug
pnpm run test:watch
```

### Shell Script Tests

```bash
# Add debug output
set -x  # Enable bash debug mode

# Run test with verbose output
bash -x preview-setup/tests/setup.test.sh
```

## Adding New Tests

### For New Composite Actions

1. Create `scripts/` directory in your action
2. Extract logic into shell functions in `scripts/*.sh`
3. Create `tests/` directory
4. Write test script following existing patterns
5. Add test to `run-tests.sh`

Example structure:

```
your-action/
├── action.yml
├── scripts/
│   └── your-script.sh      # Testable functions
└── tests/
    └── your-script.test.sh # Tests
```

### For Node.js Actions

1. Create test file in `tests/` directory
2. Follow Vitest conventions
3. Mock external dependencies
4. Test should run with `pnpm test`

## CI/CD Integration

All tests must pass before merging:

- ✅ Node.js tests (TypeScript)
- ✅ Composite action tests (Shell)
- ✅ Linting (Oxlint)
- ✅ Type checking (TypeScript)
- ✅ Build verification

## Troubleshooting

### Tests Fail Locally But Pass in CI

- Check Node.js version (`node --version`)
- Ensure dependencies are installed (`pnpm install`)
- Verify you're on the correct branch

### Shell Tests Fail

- Ensure scripts are executable (`chmod +x script.sh`)
- Check for proper line endings (LF, not CRLF)
- Verify bash version (`bash --version`, requires 4.0+)

### Coverage Too Low

- Add tests for uncovered code paths
- Focus on critical business logic first
- Use coverage report to identify gaps

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Bash Testing with Bats](https://github.com/bats-core/bats-core)
- [GitHub Actions Testing](https://docs.github.com/en/actions/creating-actions/creating-a-composite-action)
