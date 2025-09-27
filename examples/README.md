# Examples

This directory contains practical examples for different deployment patterns:

## Structure

- **`preview-deploy/`** - Preview & production deployment examples (GitHub-flow and GitFlow compatible)
- **`advanced/gitflow-pattern/`** - GitFlow deployment pattern (develop/staging/main branches)
- **`worker-delete/`** - Worker cleanup examples

## Quick Start

### Universal Deployment (GitFlow + GitHub-flow)

Copy workflows from `preview-deploy/` to `.github/workflows/` and set these secrets:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

Files:

- `preview-deploy.yml` - Auto-detects GitFlow or GitHub-flow patterns
- `production-deploy.yml` - For main/master or release branches

The new `workflow-mode` feature automatically handles both patterns:

- **Auto mode**: Deploys from `main`/`master` (GitHub-flow) OR `release/*`/`hotfix/*` (GitFlow)
- **GitFlow mode**: Only deploys from `release/*` and `hotfix/*` branches
- **GitHub-flow mode**: Only deploys from `main`/`master` branches

### Advanced GitFlow Pattern

For explicit GitFlow control, see `advanced/gitflow-pattern/` which demonstrates:

- `develop` → development environment
- `staging` → staging environment
- PRs → preview environment with PR-specific names
- `release/*` → production deployment

## New Workflow Features

### Branch Filtering

Exclude branches from deployment:

```yaml
- uses: harunonsystem/cloudflare-actions/deploy@v1
  with:
    workflow-mode: 'auto'
    exclude-branches: 'dependabot,renovate,maintenance'
    # Or JSON format: '["dependabot","renovate","maintenance"]'
```

### Workflow Modes

Control deployment strategy:

```yaml
with:
  workflow-mode: 'auto' # Auto-detect (recommended)
  # workflow-mode: 'gitflow'   # Only release/* and hotfix/*
  # workflow-mode: 'githubflow' # Only main/master
  release-branch-pattern: 'release/' # Pattern for GitFlow releases
```

## Migration from v0.x

The new integrated `deploy` action combines URL generation and deployment:

**Old approach:**

```yaml
- uses: ./url-generator
- uses: ./deploy
```

**New approach:**

```yaml
- uses: ./deploy
  with:
    workflow-mode: 'auto'
    exclude-branches: 'dependabot'
    worker-name-pattern: 'myapp-pr-{pr_number}'
```

The action automatically patches `wrangler.toml` for preview deployments, generates URLs, and handles branch filtering.
