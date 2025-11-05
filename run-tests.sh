#!/usr/bin/env bash

# Test runner for cloudflare-actions
# Runs all shell script tests for composite actions

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Test results
TOTAL_SUITES=0
PASSED_SUITES=0
FAILED_SUITES=0

echo -e "${BLUE}========================================"
echo "Cloudflare Actions Test Runner"
echo -e "========================================${NC}"
echo ""

# Function to run a test suite
run_test_suite() {
  local test_script="$1"
  local test_name="$2"

  TOTAL_SUITES=$((TOTAL_SUITES + 1))

  echo -e "${YELLOW}Running: $test_name${NC}"
  echo "----------------------------------------"

  if bash "$test_script"; then
    PASSED_SUITES=$((PASSED_SUITES + 1))
    echo -e "${GREEN}✓ $test_name passed${NC}"
  else
    FAILED_SUITES=$((FAILED_SUITES + 1))
    echo -e "${RED}✗ $test_name failed${NC}"
  fi

  echo ""
}

# Run composite action tests
if [[ -f "$SCRIPT_DIR/preview-setup/tests/setup.test.sh" ]]; then
  run_test_suite "$SCRIPT_DIR/preview-setup/tests/setup.test.sh" "preview-setup tests"
fi

if [[ -f "$SCRIPT_DIR/workers-cleanup/tests/cleanup.test.sh" ]]; then
  run_test_suite "$SCRIPT_DIR/workers-cleanup/tests/cleanup.test.sh" "workers-cleanup tests"
fi

# Run Node.js tests if available
if [[ -f "$SCRIPT_DIR/package.json" ]] && [[ -d "$SCRIPT_DIR/node_modules" ]] && command -v pnpm &> /dev/null; then
  echo -e "${YELLOW}Running: Node.js tests${NC}"
  echo "----------------------------------------"

  if pnpm test; then
    TOTAL_SUITES=$((TOTAL_SUITES + 1))
    PASSED_SUITES=$((PASSED_SUITES + 1))
    echo -e "${GREEN}✓ Node.js tests passed${NC}"
  else
    TOTAL_SUITES=$((TOTAL_SUITES + 1))
    FAILED_SUITES=$((FAILED_SUITES + 1))
    echo -e "${RED}✗ Node.js tests failed${NC}"
  fi

  echo ""
elif [[ -f "$SCRIPT_DIR/package.json" ]]; then
  echo -e "${YELLOW}⚠️  Skipping Node.js tests (node_modules not found)${NC}"
  echo "Run 'pnpm install' to install dependencies"
  echo ""
fi

# Print summary
echo -e "${BLUE}========================================"
echo "Test Summary"
echo -e "========================================${NC}"
echo "Total test suites: $TOTAL_SUITES"
echo -e "${GREEN}Passed: $PASSED_SUITES${NC}"

if [[ $FAILED_SUITES -gt 0 ]]; then
  echo -e "${RED}Failed: $FAILED_SUITES${NC}"
  echo ""
  echo -e "${RED}Some tests failed. Please fix the failing tests.${NC}"
  exit 1
else
  echo ""
  echo -e "${GREEN}All tests passed! 🎉${NC}"
  exit 0
fi
