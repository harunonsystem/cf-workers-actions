# GitFlow Workflow Examples

This directory contains complete workflow examples for using cloudflare-actions with GitFlow branching strategy.

## Overview

GitFlow typically involves:

- `main` - Production releases
- `develop` - Integration branch for development
- `staging` - Pre-production testing
- `feature/*` - Feature branches (merge to develop)
- `release/*` - Release preparation branches
- `hotfix/*` - Production fixes

## Worker Strategy

This setup creates:

- `myapp-pr-123`, `myapp-pr-456` - Temporary PR preview workers (deleted when PR closes)
- `myapp-develop` - Persistent development environment
- `myapp-staging` - Persistent staging environment
- `myapp` or `myapp-main` - Production environment

## Workflows

### 1. `preview-deploy.yml` - PR Preview Deployments

Deploys temporary preview workers for pull requests.

**Triggers:** Pull requests to `develop`, `staging`, or `main`

**Worker naming:** `myapp-pr-{pr_number}`

**Key features:**

- Automatic PR preview deployment
- Comments preview URL on PR
- Isolated environment per PR

### 2. `deploy-persistent-envs.yml` - Persistent Environment Deployments

Deploys to persistent named environments when branches are pushed.

**Triggers:** Push to `develop`, `staging`, or `main`

**Worker naming:** `myapp-{branch}` (e.g., `myapp-develop`, `myapp-staging`)

**Key features:**

- Uses `worker-name-pattern-branch` for branch-based naming
- Separate workers for each environment
- Long-lived, named workers

### 3. `cleanup-workers.yml` - Cleanup Workers

Removes PR preview workers when PRs are closed, and cleans up old workers on schedule.

**Triggers:** PR closed + Scheduled (weekly on Sunday 2 AM UTC)

**Key features:**

- **On PR close**: Uses `worker-names` to delete specific PR worker (e.g., `myapp-pr-123`)
- **On schedule**: Uses `worker-pattern` with `max-age-days: 7` to clean old workers
- `exclude` protects persistent environments (develop/staging/production)
- Dual-trigger design following standard GitHub Actions patterns

## Configuration

### Required Secrets

Add these to your repository settings:

- `CLOUDFLARE_API_TOKEN` - Your Cloudflare API token with Workers:Edit permissions
- `CLOUDFLARE_ACCOUNT_ID` - Your Cloudflare account ID
- `DATABASE_URL`, `API_KEY` - Your application secrets

### wrangler.toml Configuration

See [`wrangler.toml`](./wrangler.toml) for a minimal configuration example.

**Key environments:**

```toml
name = "myapp"  # Default production worker

[env.develop]
name = "myapp-develop"

[env.staging]
name = "myapp-staging"

[env.preview]
# Name dynamically set by deploy action to myapp-pr-{pr_number}
```

**Worker URLs:**

- Production: `myapp.your-subdomain.workers.dev`
- Development: `myapp-develop.your-subdomain.workers.dev`
- Staging: `myapp-staging.your-subdomain.workers.dev`
- PR Preview: `myapp-pr-123.your-subdomain.workers.dev`

## Exclusion Mechanism

To prevent accidental deletion of persistent workers:

### Exclude (Exact Names + Patterns)

```yaml
exclude: 'myapp-develop,myapp-staging,myapp,*-production,myapp-pr-important-*'
```

Supports both:

- **Exact names**: `myapp-develop`, `myapp-staging`, `myapp`
- **Glob patterns**: `*-production`, `*-staging`, `myapp-pr-important-*`

This single setting excludes all critical workers from deletion.

## Usage

1. Copy the workflow files to `.github/workflows/` in your repository
2. Update worker names (`myapp` → your project name)
3. Add required secrets to your repository
4. Configure your `wrangler.toml` as shown above
5. Push to trigger workflows

## Example Flow

1. **Create feature branch from develop:**

   ```bash
   git checkout -b feature/new-feature develop
   ```

2. **Push and create PR to develop:**
   - `preview-deploy.yml` triggers
   - Creates `myapp-pr-123`
   - Comments preview URL on PR

3. **Merge PR to develop:**
   - `cleanup-workers.yml` triggers → deletes `myapp-pr-123`
   - `deploy-persistent-envs.yml` triggers → deploys to `myapp-develop`

4. **Create release branch:**

   ```bash
   git checkout -b release/v1.0 develop
   ```

5. **Merge release to staging:**
   - `deploy-persistent-envs.yml` triggers → deploys to `myapp-staging`

6. **Merge release to main:**
   - `deploy-persistent-envs.yml` triggers → deploys to `myapp` (production)

## Advanced: Branch-Based Preview Names

If you want different preview patterns per base branch:

```yaml
# In preview-deploy.yml
- name: Generate worker name pattern
  id: pattern
  run: |
    if [ "${{ github.base_ref }}" = "develop" ]; then
      echo "pattern=myapp-dev-pr-{pr_number}" >> $GITHUB_OUTPUT
    elif [ "${{ github.base_ref }}" = "staging" ]; then
      echo "pattern=myapp-stage-pr-{pr_number}" >> $GITHUB_OUTPUT
    else
      echo "pattern=myapp-pr-{pr_number}" >> $GITHUB_OUTPUT
    fi

- uses: harunonsystem/cloudflare-actions/deploy@v2
  with:
    worker-name-pattern: ${{ steps.pattern.outputs.pattern }}
```
