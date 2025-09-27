# Deploy Examples

Examples for different deployment patterns using the integrated `deploy` action.

## Files

- **`preview-deploy.yml`** - Preview deployments (PRs, feature branches, staging/develop)
- **`production-deploy.yml`** - Production deployments (main/master, releases)

## Preview Deploy Features

- **Dynamic worker names**: `myapp-pr-123`, `myapp-feature-auth`, etc.
- **Automatic wrangler.toml patching**: Updates `[env.{environment}].name` for previews
- **Environment detection**: Determines staging/develop/preview based on branch
- **PR comments**: Posts deployment URLs to pull requests

## Production Deploy Features

- **Fixed worker names**: Uses `wrangler.toml` name as-is
- **No patching**: Deploys to default environment
- **Production secrets**: Environment-specific secret management

## Setup

1. **Copy workflows** to `.github/workflows/`
2. **Update app name** in workflow env vars:
   ```yaml
   env:
     APP_NAME: myapp
   ```
3. **Add GitHub Secrets**:
   - `CLOUDFLARE_API_TOKEN`
   - `CLOUDFLARE_ACCOUNT_ID`
   - Environment-specific secrets (optional)

## Branch → Environment Mapping

| Branch/Event    | Environment  | Worker Name                  |
| --------------- | ------------ | ---------------------------- |
| PRs             | `preview`    | `myapp-pr-{number}`          |
| `staging`       | `staging`    | `myapp-staging`              |
| `develop`       | `develop`    | `myapp-develop`              |
| `main`/`master` | `production` | `myapp` (from wrangler.toml) |

See [Deploy Action README](../../deploy/README.md) for full configuration options.
