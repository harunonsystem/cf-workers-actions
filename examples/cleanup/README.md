# Cleanup Action Examples

Clean up and delete Cloudflare Workers based on specific names.

## Quick Start

Choose the example that best fits your use case:

### 1. [basic-workflow.yml](./basic-workflow.yml)
**Simple PR cleanup** - Automatically delete worker when PR is closed

```yaml
# When PR #123 is closed -> deletes "myapp-pr-123"
worker-names: 'myapp-pr-${{ github.event.pull_request.number }}'
```

### 2. [multi-trigger.yml](./multi-trigger.yml)
**Production-ready** - Multiple triggers with protection

- ✅ Manual execution via workflow_dispatch
- ✅ Environment protection with `exclude`
- ✅ Dry-run preview

---

### Deletion Mode: Exact Match (`worker-names`)
Delete specific workers by name

```yaml
worker-names: 'myapp-pr-1,myapp-pr-2'
```

**Result**: Only `myapp-pr-1` and `myapp-pr-2` are deleted



---

## Protecting Environments

Use `exclude` to protect production and staging workers:

```yaml
worker-names: 'myapp-pr-1'
exclude: 'myapp,myapp-dev,myapp-stg'
```

**Supports**:
- Exact names: `myapp`, `myapp-dev`
- Wildcards: `*-production`, `myapp-release-*`

---

## Action Inputs

| Input | Description | Required | Default |
|-------|-------------|----------|---------|
| `worker-names` | Specific worker names (comma-separated) | No | - |

| `exclude` | Workers/patterns to exclude from deletion | No | - |
| `dry-run` | Preview mode (`true` = no deletion) | No | `true` |
| `cloudflare-api-token` | Cloudflare API Token | Yes | - |
| `cloudflare-account-id` | Cloudflare Account ID | Yes | - |

## Action Outputs

| Output | Description |
|--------|-------------|
| `deleted-workers` | List of deleted workers (JSON array) |
| `deleted-count` | Number of workers deleted |
| `skipped-workers` | List of skipped workers (JSON array) |
| `dry-run-results` | Workers that would be deleted in dry-run (JSON array) |

---

## Usage

Copy one of the example files to `.github/workflows/` in your repository and customize:

1. Replace `myapp` with your worker name prefix
2. Configure `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` secrets
3. Adjust `exclude` patterns for your environments
4. Set `dry-run: 'false'` for actual deletion
