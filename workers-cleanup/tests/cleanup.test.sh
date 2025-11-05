#!/usr/bin/env bash

# Test script for workers-cleanup/scripts/cleanup.sh

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
source "$PROJECT_DIR/scripts/cleanup.sh"

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

assert_contains() {
  local haystack="$1"
  local needle="$2"
  local message="${3:-}"

  TESTS_RUN=$((TESTS_RUN + 1))

  if [[ "$haystack" == *"$needle"* ]]; then
    TESTS_PASSED=$((TESTS_PASSED + 1))
    echo -e "${GREEN}✓${NC} PASS: $message"
    return 0
  else
    TESTS_FAILED=$((TESTS_FAILED + 1))
    echo -e "${RED}✗${NC} FAIL: $message"
    echo "  Haystack does not contain: $needle"
    return 1
  fi
}

# Test: build_pr_linked_list
test_build_pr_linked_list() {
  echo ""
  echo "Test: build_pr_linked_list"

  local result
  result=$(build_pr_linked_list "123" "myapp-preview")

  assert_equals "myapp-preview-123" "$result" "Should build correct worker name"
}

# Test: build_manual_list
test_build_manual_list() {
  echo ""
  echo "Test: build_manual_list"

  local result
  result=$(build_manual_list "worker1, worker2, worker3")

  assert_contains "$result" "worker1" "Should contain worker1"
  assert_contains "$result" "worker2" "Should contain worker2"
  assert_contains "$result" "worker3" "Should contain worker3"
}

# Test: build_manual_list with single worker
test_build_manual_list_single() {
  echo ""
  echo "Test: build_manual_list with single worker"

  local result
  result=$(build_manual_list "single-worker")

  assert_equals "single-worker" "$result" "Should return single worker"
}

# Test: process_deletions with dry run
test_process_deletions_dry_run() {
  echo ""
  echo "Test: process_deletions with dry run"

  # Mock environment
  export CLOUDFLARE_ACCOUNT_ID="test-account"
  export CLOUDFLARE_API_TOKEN="test-token"

  local workers_list="worker1
worker2
worker3"

  local result
  result=$(process_deletions "$workers_list" "test-account" "test-token" "true")

  # Check JSON structure
  assert_contains "$result" '"deleted":3' "Should report 3 deletions in dry run"
  assert_contains "$result" '"skipped":0' "Should report 0 skipped"

  if command -v jq &> /dev/null; then
    local deleted_count
    deleted_count=$(echo "$result" | jq -r '.deleted')
    assert_equals "3" "$deleted_count" "Deleted count should be 3"
  fi
}

# Test: process_deletions with empty list
test_process_deletions_empty() {
  echo ""
  echo "Test: process_deletions with empty list"

  local result
  result=$(process_deletions "" "test-account" "test-token" "true")

  assert_contains "$result" '"deleted":0' "Should report 0 deletions"
}

# Test: JSON output format
test_json_output_format() {
  echo ""
  echo "Test: JSON output format"

  local workers_list="test-worker"
  local result
  result=$(process_deletions "$workers_list" "test-account" "test-token" "true")

  # Validate JSON structure
  if command -v jq &> /dev/null; then
    if echo "$result" | jq . > /dev/null 2>&1; then
      TESTS_RUN=$((TESTS_RUN + 1))
      TESTS_PASSED=$((TESTS_PASSED + 1))
      echo -e "${GREEN}✓${NC} PASS: Output is valid JSON"
    else
      TESTS_RUN=$((TESTS_RUN + 1))
      TESTS_FAILED=$((TESTS_FAILED + 1))
      echo -e "${RED}✗${NC} FAIL: Output is not valid JSON"
    fi
  else
    echo "  ⚠️  Skipping JSON validation (jq not available)"
  fi
}

# Run all tests
run_tests() {
  echo "========================================"
  echo "Running workers-cleanup tests"
  echo "========================================"

  test_build_pr_linked_list
  test_build_manual_list
  test_build_manual_list_single
  test_process_deletions_dry_run
  test_process_deletions_empty
  test_json_output_format

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
