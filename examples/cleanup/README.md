# Cleanup Action - Complete Guide

Complete implementation guide for the cleanup action to automatically delete Cloudflare Workers.

---

## Overview

The cleanup action can delete Workers in two ways:

| Method           | `worker-names`          | `worker-pattern`       |
| ---------------- | ----------------------- | ---------------------- |
| Deletion Mode| Exact match (list)      | Wildcard match         |
| Example      | `myapp-pr-1,myapp-pr-2` | `myapp-pr-*`           |
| Target       | Specified ones only     | All matching pattern   |
| Multiple     | ✅ Allowed              | ❌ Only one            |
| Use Case     | Delete by PR number     | Scheduled cleanup      |

---

## 4 Deletion Patterns

### Pattern 1️⃣: Delete specific Workers only

Usage: Want to delete PR #1, #2, but keep PR #3

```yaml
worker-names: 'myapp-pr-1,myapp-pr-2'
worker-pattern: ''
```

Result:

- ✅ `myapp-pr-1` -> Deleted
- ✅ `myapp-pr-2` -> Deleted
- ❌ `myapp-pr-3` -> Not deleted (not specified)

Important: Leave `worker-pattern` empty

---

### Pattern 2️⃣: Delete all by pattern

Usage: Delete all PR Workers

```yaml
worker-names: ''
worker-pattern: 'myapp-pr-*'
```

Result:

- ✅ `myapp-pr-1` -> Deleted
- ✅ `myapp-pr-2` -> Deleted
- ✅ `myapp-pr-3` -> Deleted
- ✅ `myapp-pr-999` -> Deleted

Important: Leave `worker-names` empty

---

### Pattern 3️⃣: Pattern + Partial Exclusion

Usage: Delete all PR Workers, but keep PR #3

```yaml
worker-names: ''
worker-pattern: 'myapp-pr-*'
exclude: 'myapp-pr-3'
```

Result:

- ✅ `myapp-pr-1` -> Deleted
- ✅ `myapp-pr-2` -> Deleted
- ❌ `myapp-pr-3` -> Not deleted (excluded)
- ✅ `myapp-pr-999` -> Deleted

Important: Leave `worker-names` empty, use `exclude`

---

### Pattern 4️⃣: Exclude Multiple Environments

Usage: Delete all PR Workers, but protect environment branches

```yaml
worker-pattern: 'myapp-pr-*'
exclude: 'myapp,myapp-dev,myapp-stg,myapp-release-*'
```

Result:

- ✅ `myapp-pr-1` -> Deleted
- ✅ `myapp-feature-x` -> Deleted
- ❌ `myapp` -> Not deleted (Excluded: Production)
- ❌ `myapp-dev` -> Not deleted (Excluded: Develop branch)
- ❌ `myapp-stg` -> Not deleted (Excluded: Staging branch)
- ❌ `myapp-release-1.0` -> Not deleted (Excluded: Release)

---

## Usage Timing

### Auto-delete when PR is closed

```yaml
on:
  pull_request:
    types: [closed]

jobs:
  cleanup:
    runs-on: ubuntu-latest
    steps:
      - uses: harunonsystem/cloudflare-actions/cleanup@v1
        with:
          worker-names: myapp-pr-${{ github.event.pull_request.number }}
          cloudflare-api-token: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          cloudflare-account-id: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          dry-run: 'false'
```

-> When PR #123 is closed, `myapp-pr-123` is deleted

---

### Select deletion pattern manually

```yaml
on:
  workflow_dispatch:
    inputs:
      deletion-type:
        description: 'Deletion type'
        required: true
        type: choice
        options:
          - by-pattern
          - by-names
      worker-input:
        description: 'Pattern (myapp-pr-*) or Names (myapp-pr-1,myapp-pr-2)'
        required: true
        default: 'myapp-pr-*'
      dry-run:
        description: 'Dry run (true=確認のみ, false=実削除)'
        required: false
        default: 'true'

jobs:
  cleanup:
    runs-on: ubuntu-latest
    steps:
      - uses: harunonsystem/cloudflare-actions/cleanup@v1
        with:
          worker-pattern: ${{ github.event.inputs.deletion-type == 'by-pattern' && github.event.inputs.worker-input || '' }}
          worker-names: ${{ github.event.inputs.deletion-type == 'by-names' && github.event.inputs.worker-input || '' }}
          exclude: 'myapp,myapp-dev,myapp-stg,myapp-release-*'
          cloudflare-api-token: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          cloudflare-account-id: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          dry-run: ${{ github.event.inputs.dry-run }}
```

-> Select deletion pattern from GitHub UI and execute

---

## Inputs

```yaml
worker-names: 'myapp-pr-1,myapp-pr-2' # Exact match, multiple allowed
worker-pattern: 'myapp-pr-*' # Wildcard, only one
exclude: 'myapp-dev,myapp-release-*' # Exclusion settings, wildcard supported
dry-run: 'true' # true=check only, false=actual deletion
cloudflare-api-token: ${{ secrets.CLOUDFLARE_API_TOKEN }}
cloudflare-account-id: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
```

### ⚠️ Important Rules

Must specify exactly one of `worker-names` or `worker-pattern`

| Method                                         | Result    |
| ---------------------------------------------- | --------- |
| `worker-names: 'a,b'`, `worker-pattern: ''`    | ✅ OK     |
| `worker-names: ''`, `worker-pattern: 'a-*'`    | ✅ OK     |
| `worker-names: 'a,b'`, `worker-pattern: 'a-*'` | ❌ Error  |
| `worker-names: ''`, `worker-pattern: ''`       | ❌ Error  |

---

## exclude Parameter

### Exclusion by Exact Match

```yaml
exclude: 'myapp,myapp-dev,myapp-stg'
```

- `myapp` excluded
- `myapp-dev` deleted (partial match)

### Exclusion by Pattern

```yaml
exclude: 'myapp-release-*,*-prod,*-production'
```

- `myapp-release-1`, `myapp-release-v1.0` excluded
- `api-prod`, `web-prod` excluded

---

## Troubleshooting

### Target not found

- Check `worker-names` / `worker-pattern`
- Check if accidentally excluded by `exclude`
- Check actual Worker name in Cloudflare Dashboard

### Important Worker deleted

- Check if recoverable in Cloudflare Dashboard
- Add to `exclude` to protect

---

## Outputs

```yaml
- id: cleanup
  uses: harunonsystem/cloudflare-actions/cleanup@v1
  with: # ...

- name: Notify Slack
  run: |
    echo "Deleted: ${{ steps.cleanup.outputs.deleted-count }}"
```

| Output            | Description                                  |
| ----------------- | -------------------------------------------- |
| `deleted-workers` | List of deleted worker names (JSON array)    |
| `deleted-count`   | Number of workers deleted                    |
| `skipped-workers` | List of skipped worker names (JSON array)    |
| `dry-run-results` | List of workers targeted in dry-run (JSON array) |

---

## Sample Files

Implementation examples in this directory:

- `using-secrets.yml` - Basic example using GitHub Secrets
- `using-1pass-cli.yml` - Example using 1Password CLI
- `gitflow-cleanup.yml` - Git Flow (Multi-environment) example
- `advanced-cleanup.yml` - Dry-run + Slack notification example

Copy each file to `.github/workflows/` and edit for your environment.
