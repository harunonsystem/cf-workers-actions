#!/usr/bin/env bash
set -euo pipefail

# Workers cleanup script
# Delete Cloudflare Workers based on various criteria

# Function to build deletion list for PR-linked mode
build_pr_linked_list() {
  local pr_number="$1"
  local worker_prefix="$2"

  if [[ -z "$pr_number" ]]; then
    echo "Error: pr-number is required for pr-linked mode" >&2
    return 1
  fi

  local worker_name="${worker_prefix}-${pr_number}"
  echo "$worker_name"
}

# Function to build deletion list for manual mode
build_manual_list() {
  local worker_names="$1"

  if [[ -z "$worker_names" ]]; then
    echo "Error: worker-names is required for manual mode" >&2
    return 1
  fi

  # Split comma-separated list and trim whitespace
  IFS=',' read -ra WORKERS <<< "$worker_names"
  for worker in "${WORKERS[@]}"; do
    echo "$worker" | xargs
  done
}

# Function to build deletion list for batch mode
build_batch_list() {
  local pattern="$1"
  local exclude_list="$2"
  local account_id="$3"
  local api_token="$4"

  if [[ -z "$pattern" ]]; then
    echo "Error: batch-pattern is required for batch mode" >&2
    return 1
  fi

  # Fetch all workers from Cloudflare API
  local all_workers
  all_workers=$(curl -s -X GET \
    "https://api.cloudflare.com/client/v4/accounts/${account_id}/workers/scripts" \
    -H "Authorization: Bearer ${api_token}" \
    | jq -r '.result[].id' 2>/dev/null || echo "")

  if [[ -z "$all_workers" ]]; then
    echo "Warning: No workers found or API call failed" >&2
    return 0
  fi

  # Pattern matching
  local matched_workers=()
  while IFS= read -r worker; do
    if [[ "$worker" == $pattern ]]; then
      matched_workers+=("$worker")
    fi
  done <<< "$all_workers"

  # Apply exclusion list
  if [[ -n "$exclude_list" ]]; then
    IFS=',' read -ra EXCLUDED <<< "$exclude_list"
    local filtered_workers=()
    for worker in "${matched_workers[@]}"; do
      local should_exclude=false
      for exclude in "${EXCLUDED[@]}"; do
        exclude=$(echo "$exclude" | xargs)
        if [[ "$worker" == "$exclude" ]]; then
          should_exclude=true
          break
        fi
      done
      if [[ "$should_exclude" == "false" ]]; then
        filtered_workers+=("$worker")
      fi
    done
    matched_workers=("${filtered_workers[@]}")
  fi

  # Output matched workers
  for worker in "${matched_workers[@]}"; do
    echo "$worker"
  done
}

# Function to check if worker exists
worker_exists() {
  local worker_name="$1"
  local account_id="$2"
  local api_token="$3"

  local response
  response=$(curl -s -X GET \
    "https://api.cloudflare.com/client/v4/accounts/${account_id}/workers/scripts/${worker_name}" \
    -H "Authorization: Bearer ${api_token}")

  if command -v jq &> /dev/null; then
    if echo "$response" | jq -e '.success == false' > /dev/null 2>&1; then
      return 1
    fi
  fi

  return 0
}

# Function to delete a single worker
delete_worker() {
  local worker_name="$1"
  local account_id="$2"
  local api_token="$3"

  local response
  response=$(curl -s -X DELETE \
    "https://api.cloudflare.com/client/v4/accounts/${account_id}/workers/scripts/${worker_name}" \
    -H "Authorization: Bearer ${api_token}")

  if command -v jq &> /dev/null; then
    if echo "$response" | jq -e '.success == true' > /dev/null 2>&1; then
      return 0
    else
      local error_msg
      error_msg=$(echo "$response" | jq -r '.errors[0].message // "Unknown error"')
      echo "$error_msg" >&2
      return 1
    fi
  fi

  return 0
}

# Function to process deletion list
process_deletions() {
  local workers_list="$1"
  local account_id="$2"
  local api_token="$3"
  local dry_run="${4:-false}"

  local deleted=0
  local skipped=0
  local deleted_names=()
  local errors=()

  while IFS= read -r worker; do
    [[ -z "$worker" ]] && continue

    echo "Processing: $worker" >&2

    if [[ "$dry_run" == "true" ]]; then
      echo "  [DRY RUN] Would delete: $worker" >&2
      deleted=$((deleted + 1))
      deleted_names+=("$worker")
      continue
    fi

    # Check if worker exists
    if ! worker_exists "$worker" "$account_id" "$api_token"; then
      echo "  ⚠️  Worker not found, skipping" >&2
      skipped=$((skipped + 1))
      continue
    fi

    # Delete worker
    if delete_worker "$worker" "$account_id" "$api_token"; then
      echo "  ✅ Deleted successfully" >&2
      deleted=$((deleted + 1))
      deleted_names+=("$worker")
    else
      echo "  ❌ Deletion failed" >&2
      errors+=("$worker: Deletion failed")
    fi
  done <<< "$workers_list"

  # Output results as JSON
  local deleted_json
  if command -v jq &> /dev/null; then
    deleted_json=$(printf '%s\n' "${deleted_names[@]}" | jq -R . | jq -s .)
  else
    # Fallback to simple JSON generation
    deleted_json="["
    for i in "${!deleted_names[@]}"; do
      [[ $i -gt 0 ]] && deleted_json="${deleted_json},"
      deleted_json="${deleted_json}\"${deleted_names[$i]}\""
    done
    deleted_json="${deleted_json}]"
  fi

  # Output JSON result
  echo "{\"deleted\":$deleted,\"skipped\":$skipped,\"deleted_names\":$deleted_json,\"error_count\":${#errors[@]}}"
}

# Main function
main() {
  local mode="$1"
  local account_id="${CLOUDFLARE_ACCOUNT_ID:?CLOUDFLARE_ACCOUNT_ID is required}"
  local api_token="${CLOUDFLARE_API_TOKEN:?CLOUDFLARE_API_TOKEN is required}"
  local dry_run="${DRY_RUN:-false}"

  local workers_list=""

  case "$mode" in
    pr-linked)
      local pr_number="${PR_NUMBER:?PR_NUMBER is required for pr-linked mode}"
      local worker_prefix="${WORKER_NAME_PREFIX:-preview}"
      workers_list=$(build_pr_linked_list "$pr_number" "$worker_prefix")
      ;;

    manual)
      local worker_names="${WORKER_NAMES:?WORKER_NAMES is required for manual mode}"
      workers_list=$(build_manual_list "$worker_names")
      ;;

    batch)
      local pattern="${BATCH_PATTERN:?BATCH_PATTERN is required for batch mode}"
      local exclude_list="${EXCLUDE_WORKERS:-}"
      workers_list=$(build_batch_list "$pattern" "$exclude_list" "$account_id" "$api_token")
      ;;

    *)
      echo "Error: Invalid cleanup mode: $mode" >&2
      echo "Valid modes: pr-linked, manual, batch" >&2
      return 1
      ;;
  esac

  if [[ -z "$workers_list" ]]; then
    echo "No workers found to delete" >&2
    echo '{"deleted":0,"skipped":0,"deleted_names":[],"error_count":0}'
    return 0
  fi

  echo "Found workers to process:" >&2
  echo "$workers_list" >&2
  echo "" >&2

  # Process deletions and output result
  process_deletions "$workers_list" "$account_id" "$api_token" "$dry_run"
}

# Run main function if script is executed directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
  main "$@"
fi
