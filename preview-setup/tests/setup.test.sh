#!/usr/bin/env bash

# Test script for preview-setup/scripts/setup.sh

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

# Test counters
TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# Source the script to test
source "$PROJECT_DIR/scripts/setup.sh"

# Test helper functions
assert_equals() {
  local expected="$1"
  local actual="$2"
  local message="${3:-}"

  TESTS_RUN=$((TESTS_RUN + 1))

  if [[ "$expected" == "$actual" ]]; then
    TESTS_PASSED=$((TESTS_PASSED + 1))
    echo -e "${GREEN}✓${NC} PASS: $message"
    return 0
  else
    TESTS_FAILED=$((TESTS_FAILED + 1))
    echo -e "${RED}✗${NC} FAIL: $message"
    echo "  Expected: $expected"
    echo "  Actual: $actual"
    return 1
  fi
}

assert_file_contains() {
  local file="$1"
  local pattern="$2"
  local message="${3:-}"

  TESTS_RUN=$((TESTS_RUN + 1))

  if grep -q "$pattern" "$file"; then
    TESTS_PASSED=$((TESTS_PASSED + 1))
    echo -e "${GREEN}✓${NC} PASS: $message"
    return 0
  else
    TESTS_FAILED=$((TESTS_FAILED + 1))
    echo -e "${RED}✗${NC} FAIL: $message"
    echo "  File $file does not contain: $pattern"
    return 1
  fi
}

assert_file_exists() {
  local file="$1"
  local message="${2:-}"

  TESTS_RUN=$((TESTS_RUN + 1))

  if [[ -f "$file" ]]; then
    TESTS_PASSED=$((TESTS_PASSED + 1))
    echo -e "${GREEN}✓${NC} PASS: $message"
    return 0
  else
    TESTS_FAILED=$((TESTS_FAILED + 1))
    echo -e "${RED}✗${NC} FAIL: $message"
    echo "  File does not exist: $file"
    return 1
  fi
}

# Setup test environment
setup() {
  TEST_DIR=$(mktemp -d)
  TEST_TOML="$TEST_DIR/wrangler.toml"

  # Create a minimal wrangler.toml
  cat > "$TEST_TOML" << 'EOF'
name = "test-worker"
main = "src/index.ts"
compatibility_date = "2024-01-01"
EOF
}

# Cleanup test environment
teardown() {
  if [[ -d "$TEST_DIR" ]]; then
    rm -rf "$TEST_DIR"
  fi
}

# Test: create_backup function
test_create_backup() {
  echo ""
  echo "Test: create_backup"

  setup

  local backup_path
  backup_path=$(create_backup "$TEST_TOML")

  assert_file_exists "$backup_path" "Backup file should be created"

  # Verify backup content matches original
  if diff "$TEST_TOML" "$backup_path" > /dev/null; then
    TESTS_RUN=$((TESTS_RUN + 1))
    TESTS_PASSED=$((TESTS_PASSED + 1))
    echo -e "${GREEN}✓${NC} PASS: Backup content matches original"
  else
    TESTS_RUN=$((TESTS_RUN + 1))
    TESTS_FAILED=$((TESTS_FAILED + 1))
    echo -e "${RED}✗${NC} FAIL: Backup content does not match original"
  fi

  teardown
}

# Test: update_worker_name with new environment
test_update_worker_name_new_env() {
  echo ""
  echo "Test: update_worker_name with new environment"

  setup

  update_worker_name "$TEST_TOML" "preview" "test-worker-preview-123"

  assert_file_contains "$TEST_TOML" "\[env.preview\]" "Should add preview environment section"
  assert_file_contains "$TEST_TOML" 'name = "test-worker-preview-123"' "Should set worker name"

  teardown
}

# Test: update_worker_name with existing environment
test_update_worker_name_existing_env() {
  echo ""
  echo "Test: update_worker_name with existing environment"

  setup

  # Add existing preview environment
  cat >> "$TEST_TOML" << 'EOF'

[env.preview]
name = "old-worker-name"
EOF

  update_worker_name "$TEST_TOML" "preview" "new-worker-name"

  assert_file_contains "$TEST_TOML" 'name = "new-worker-name"' "Should update worker name"

  # Verify old name is not present
  if ! grep -q "old-worker-name" "$TEST_TOML"; then
    TESTS_RUN=$((TESTS_RUN + 1))
    TESTS_PASSED=$((TESTS_PASSED + 1))
    echo -e "${GREEN}✓${NC} PASS: Old worker name should be removed"
  else
    TESTS_RUN=$((TESTS_RUN + 1))
    TESTS_FAILED=$((TESTS_FAILED + 1))
    echo -e "${RED}✗${NC} FAIL: Old worker name still present"
  fi

  teardown
}

# Test: main function
test_main_function() {
  echo ""
  echo "Test: main function"

  setup

  local output
  output=$(main "$TEST_TOML" "preview" "test-worker-pr-42" "false")

  assert_file_contains "$TEST_TOML" "\[env.preview\]" "Should add preview environment"
  assert_file_contains "$TEST_TOML" 'name = "test-worker-pr-42"' "Should set worker name"

  teardown
}

# Test: main function with backup
test_main_function_with_backup() {
  echo ""
  echo "Test: main function with backup"

  setup

  local backup_path
  backup_path=$(main "$TEST_TOML" "preview" "test-worker-pr-99" "true")

  assert_file_exists "$backup_path" "Should create backup file"

  teardown
}

# Run all tests
run_tests() {
  echo "========================================"
  echo "Running preview-setup tests"
  echo "========================================"

  test_create_backup
  test_update_worker_name_new_env
  test_update_worker_name_existing_env
  test_main_function
  test_main_function_with_backup

  echo ""
  echo "========================================"
  echo "Test Results"
  echo "========================================"
  echo "Tests run: $TESTS_RUN"
  echo -e "${GREEN}Passed: $TESTS_PASSED${NC}"
  if [[ $TESTS_FAILED -gt 0 ]]; then
    echo -e "${RED}Failed: $TESTS_FAILED${NC}"
    exit 1
  else
    echo "All tests passed!"
    exit 0
  fi
}

# Run tests
run_tests
