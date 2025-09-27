# GitFlow Pattern Example

This example demonstrates a GitFlow deployment pattern using explicit environment detection.

## Approach

This example uses **explicit bash logic** to determine environments and worker names, demonstrating how to handle complex branching strategies manually. For simpler setups, see the integrated approach in `../preview-deploy/`.

## Environments

- **Production**: `main` branch → `my-app` (default environment)
- **Staging**: `staging` branch → `my-app-staging`
- **Development**: `develop` branch → `my-app-dev`
- **Preview**: Pull requests → `my-app-pr-{number}`

## Workflow Logic

1. **Bash script** determines environment and worker name based on branch/event
2. **Deploy action** uses explicit `worker-name` (no pattern)
3. **Comment action** posts PR deployment results

## Usage

1. Copy `preview-deploy.yml` to `.github/workflows/`
2. Replace `my-app` with your actual worker name
3. Set required secrets:
   - `CLOUDFLARE_API_TOKEN`
   - `CLOUDFLARE_ACCOUNT_ID`
   - Any application secrets (DATABASE_URL, API_KEY, etc.)

## vs Simple Pattern

| Feature               | GitFlow (this example) | Simple (../preview-deploy/) |
| --------------------- | ---------------------- | --------------------------- |
| Environment detection | Bash script            | GitHub expressions          |
| Worker naming         | Explicit names         | Pattern-based generation    |
| Complexity            | Higher                 | Lower                       |
| Flexibility           | Maximum                | Good for most cases         |

## Features

- Manual environment detection and worker naming
- Multi-environment wrangler.toml configuration
- Secret management per environment
- PR comment integration
