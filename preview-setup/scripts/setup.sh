#!/usr/bin/env bash
set -euo pipefail

# Preview environment setup script
# Updates wrangler.toml with preview environment configuration

# Function to update wrangler.toml with worker name
update_worker_name() {
  local toml_path="$1"
  local env_name="$2"
  local worker_name="$3"

  if [[ ! -f "$toml_path" ]]; then
    echo "Error: wrangler.toml not found at $toml_path" >&2
    return 1
  fi

  # Check if environment section exists
  if grep -q "^\[env\.$env_name\]" "$toml_path"; then
    # Update existing environment's name
    sed -i "/^\[env\.$env_name\]/,/^\[/ s/^name = .*/name = \"$worker_name\"/" "$toml_path"
  else
    # Add new environment section
    cat >> "$toml_path" << EOF

[env.$env_name]
name = "$worker_name"
EOF
  fi
}

# Function to create backup of wrangler.toml
create_backup() {
  local toml_path="$1"
  local backup_path="${toml_path}.backup.$(date +%s)"

  if [[ ! -f "$toml_path" ]]; then
    echo "Error: Cannot backup, file not found: $toml_path" >&2
    return 1
  fi

  cp "$toml_path" "$backup_path"
  echo "$backup_path"
}

# Function to update environment variables (if jq is available)
update_env_vars() {
  local toml_path="$1"
  local env_name="$2"
  local vars_json="$3"

  if [[ -z "$vars_json" ]]; then
    return 0
  fi

  if ! command -v jq &> /dev/null; then
    echo "Warning: jq not available, skipping vars update" >&2
    return 0
  fi

  echo "" >> "$toml_path"
  echo "[env.$env_name.vars]" >> "$toml_path"
  echo "$vars_json" | jq -r 'to_entries | .[] | "\(.key) = \"\(.value)\""' >> "$toml_path"
}

# Function to update routes (if jq is available)
update_routes() {
  local toml_path="$1"
  local env_name="$2"
  local routes_json="$3"

  if [[ -z "$routes_json" ]]; then
    return 0
  fi

  if ! command -v jq &> /dev/null; then
    echo "Warning: jq not available, skipping routes update" >&2
    return 0
  fi

  echo "" >> "$toml_path"
  echo "[[env.$env_name.routes]]" >> "$toml_path"
  echo "$routes_json" | jq -r '.[] | "pattern = \"\(.)\"" ' >> "$toml_path"
}

# Main function
main() {
  local toml_path="${1:-wrangler.toml}"
  local env_name="${2:-preview}"
  local worker_name="${3:?Worker name is required}"
  local create_backup_flag="${4:-true}"
  local update_vars="${5:-}"
  local update_routes_data="${6:-}"

  # Create backup if requested
  local backup_path=""
  if [[ "$create_backup_flag" == "true" ]]; then
    backup_path=$(create_backup "$toml_path")
    echo "Created backup: $backup_path" >&2
  fi

  # Update worker name
  update_worker_name "$toml_path" "$env_name" "$worker_name"
  echo "Updated worker name to: $worker_name" >&2

  # Update environment variables if provided
  if [[ -n "$update_vars" ]]; then
    update_env_vars "$toml_path" "$env_name" "$update_vars"
    echo "Updated environment variables" >&2
  fi

  # Update routes if provided
  if [[ -n "$update_routes_data" ]]; then
    update_routes "$toml_path" "$env_name" "$update_routes_data"
    echo "Updated routes" >&2
  fi

  # Output the backup path to stdout for GitHub Actions
  if [[ -n "$backup_path" ]]; then
    echo "$backup_path"
  fi
}

# Run main function if script is executed directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
  main "$@"
fi
