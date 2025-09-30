# Cloudflare Actions

[![CI](https://github.com/harunonsystem/cloudflare-actions/workflows/CI/badge.svg)](https://github.com/harunonsystem/cloudflare-actions/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A comprehensive suite of modular GitHub Actions for Cloudflare Workers deployment, PR commenting, and cleanup operations.

## 🚀 Features

- **URL Generator**: Generate dynamic worker names and URLs for PR-based deployments
- **Deploy**: Simple deployment with secrets management (use with official wrangler-action)
- **Comment**: Automatically post deployment URLs and status to PR comments
- **Cleanup**: Clean up workers based on patterns or specific names
- **Modular Architecture**: Mix and match actions as needed, compatible with official Cloudflare actions
- **TypeScript First**: Written in TypeScript with complete type safety and definitions
- **Comprehensive Testing**: Full test coverage with Vitest (50-100x faster than Jest)
- **Ultra-Fast Linting**: Code quality checks with Oxlint (10-100x faster than ESLint)
- **Error Handling**: Robust error handling and informative logging
- **Security First**: No external dependencies, minimal attack surface

## 📦 Actions

### URL Generator Action (`url-generator`)

Generate dynamic worker names and URLs for PR deployments, and update wrangler.toml accordingly.

```yaml
- uses: harunonsystem/cloudflare-actions/url-generator@v1
  id: url-gen
  with:
    environment: preview
    worker-name-pattern: 'myapp-pr-{pr_number}'
```

**Inputs:**

- `environment` (required): Deployment environment (`preview` or `production`)
- `worker-name-pattern`: Worker name pattern (default: `project-pr-{pr_number}`)
- `subdomain`: Custom subdomain for worker URLs

**Outputs:**

- `worker-name`: Generated worker name
- `url`: Generated worker URL

### Deploy Action (`deploy`)

Deploy applications to Cloudflare Workers with secrets management. **Recommended to use with official `cloudflare/wrangler-action`**.

```yaml
- uses: harunonsystem/cloudflare-actions/deploy@v1
  with:
    environment: preview
    cloudflare-api-token: ${{ secrets.CLOUDFLARE_API_TOKEN }}
    cloudflare-account-id: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
    secrets: |
      {
        "DATABASE_URL": "${{ secrets.DATABASE_URL }}"
      }
```

**Inputs:**

- `environment` (required): Deployment environment (`preview` or `production`)
- `worker-name-pattern`: Worker name pattern (for reference only, wrangler.toml should be pre-configured)
- `cloudflare-api-token` (required): Cloudflare API Token
- `cloudflare-account-id` (required): Cloudflare Account ID
- `secrets`: Worker secrets (JSON format)

**Outputs:**

- `url`: Deployed worker URL
- `success`: Deployment success status
- `deployment-id`: Unique deployment identifier

### Comment Action (`comment`)

Post deployment information and preview URLs to Pull Request comments.

```yaml
- uses: harunonsystem/cloudflare-actions/comment@v1
  with:
    deployment-url: ${{ steps.deploy.outputs.url }}
    github-token: ${{ secrets.GITHUB_TOKEN }}
```

**Inputs:**

- `deployment-url` (required): URL of the deployed preview
- `deployment-status`: Deployment status (`success`, `failure`, or `pending`)
- `worker-name`: Name of the deployed worker
- `github-token` (required): GitHub Token
- `custom-message`: Additional custom message
- `comment-template`: Custom comment template (markdown supported)
- `update-existing`: Update existing comment instead of creating new one
- `comment-tag`: Unique tag to identify comments for updates

**Outputs:**

- `comment-id`: ID of the created/updated comment
- `comment-url`: URL of the comment

### Cleanup Action (`cleanup`)

Clean up and delete Cloudflare Workers based on patterns or specific names.

```yaml
- uses: harunonsystem/cloudflare-actions/cleanup@v1
   with:
     worker-pattern: 'project-pr-*'
     cloudflare-api-token: ${{ secrets.CLOUDFLARE_API_TOKEN }}
     cloudflare-account-id: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
```

**Inputs:**

- `worker-pattern`: Pattern for workers to delete (supports wildcards)
- `worker-names`: Specific worker names to delete (comma-separated)
- `cloudflare-api-token` (required): Cloudflare API Token
- `cloudflare-account-id` (required): Cloudflare Account ID
- `dry-run`: Only list workers without deleting (default: `false`)

- `exclude-pattern`: Pattern for workers to exclude from deletion
- `confirm-deletion`: Require explicit confirmation (default: `yes`)

**Outputs:**

- `deleted-workers`: List of deleted worker names (JSON array)
- `deleted-count`: Number of workers deleted
- `skipped-workers`: List of workers that were skipped (JSON array)
- `dry-run-results`: Workers that would be deleted in dry run mode (JSON array)

## 🔧 Complete Workflow Examples

### Modular Preview Deployment with PR Comments

```yaml
name: Deploy Preview

on:
  pull_request:
    types: [opened, synchronize, reopened]

jobs:
  deploy-preview:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Generate Worker URL
        id: url-gen
        uses: harunonsystem/cloudflare-actions/url-generator@v1
        with:
          environment: preview
          worker-name-pattern: 'myapp-pr-{pr_number}'

      - name: Deploy to Cloudflare Workers
        id: deploy
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          command: deploy -e preview
          secrets: |
            DATABASE_URL=${{ secrets.DATABASE_URL }}
            API_KEY=${{ secrets.API_KEY }}

      - name: Comment PR
        if: always()
        uses: harunonsystem/cloudflare-actions/comment@v1
        with:
          deployment-url: ${{ steps.url-gen.outputs.url }}
          deployment-status: ${{ steps.deploy.outcome == 'success' && 'success' || 'failure' }}
          worker-name: ${{ steps.url-gen.outputs.worker-name }}
          github-token: ${{ secrets.GITHUB_TOKEN }}
          custom-message: |
            🚀 Preview deployment completed!

            **Build Information:**
            - Commit: ${{ github.sha }}
            - Branch: ${{ github.head_ref }}
```

### Production Deployment

```yaml
name: Deploy Production

on:
  push:
    branches: [main]

jobs:
  deploy-production:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Deploy to Production
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          command: deploy
          secrets: |
            API_KEY=${{ secrets.PRODUCTION_API_KEY }}
            DATABASE_URL=${{ secrets.DATABASE_URL }}
        env:
          ENVIRONMENT: production
```

### Cleanup Old Preview Deployments

```yaml
name: Cleanup Old Previews

on:
  pull_request:
    types: [closed]

jobs:
  cleanup:
    runs-on: ubuntu-latest
    steps:
       - name: Cleanup Preview Worker
         uses: harunonsystem/cloudflare-actions/cleanup@v1
         with:
           worker-pattern: 'myapp-pr-${{ github.event.pull_request.number }}'
           cloudflare-api-token: ${{ secrets.CLOUDFLARE_API_TOKEN }}
           cloudflare-account-id: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          confirm-deletion: 'yes'
```

### Scheduled Cleanup

```yaml
name: Weekly Cleanup

on:
  schedule:
    - cron: '0 2 * * 0' # Every Sunday at 2 AM

jobs:
  cleanup-old-workers:
    runs-on: ubuntu-latest
    steps:
       - name: Cleanup Old Preview Workers
         uses: harunonsystem/cloudflare-actions/cleanup@v1
         with:
           worker-pattern: 'myapp-pr-*'
            exclude: 'myapp-develop,myapp-staging,myapp,*-production'
            dry-run: false
           cloudflare-api-token: ${{ secrets.CLOUDFLARE_API_TOKEN }}
           cloudflare-account-id: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          confirm-deletion: 'yes'
```

## 🔄 GitFlow Workflow Support

This action suite fully supports GitFlow branching strategies with persistent and ephemeral environments.

### Worker Strategy

Create multiple worker types for different purposes:

- **Temporary PR Previews**: `myapp-pr-123`, `myapp-pr-456` (auto-deleted when PR closes)
- **Persistent Environments**: `myapp-develop`, `myapp-staging`, `myapp` (permanent)

### Key Features

1. **Separate patterns for PRs and branches**:
   - `worker-name-pattern` - For PR deployments (e.g., `myapp-pr-{pr_number}`)
   - `worker-name-pattern-branch` - For direct branch deployments (e.g., `myapp-{branch}`)

2. **Protection mechanism** to prevent accidental deletion:
   - `exclude` - Supports both exact names and glob patterns (e.g., `myapp-develop,*-staging,*-production`)

3. **Automatic cleanup** with safety guarantees

### Example: PR Preview + Persistent Environments

```yaml
# .github/workflows/preview-pr.yml
name: PR Preview
on:
  pull_request:
    branches: [develop, staging, main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: harunonsystem/cloudflare-actions/deploy@v1
         with:
           worker-name-pattern: 'myapp-pr-{pr_number}'
           environment: preview
           cloudflare-api-token: ${{ secrets.CLOUDFLARE_API_TOKEN }}
           cloudflare-account-id: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
```

```yaml
# .github/workflows/deploy-persistent.yml
name: Deploy Persistent Environments
on:
  push:
    branches: [develop, staging, main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: harunonsystem/cloudflare-actions/deploy@v1
        with:
          worker-name-pattern-branch: 'myapp-{branch}'
          environment: ${{ github.ref_name }}
          cloudflare-api-token: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          cloudflare-account-id: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
```

```yaml
# .github/workflows/cleanup-pr.yml
name: Cleanup PR
on:
  pull_request:
    types: [closed]

jobs:
  cleanup:
    runs-on: ubuntu-latest
    steps:
      - uses: harunonsystem/cloudflare-actions/cleanup@v1
        with:
          worker-pattern: 'myapp-pr-${{ github.event.pull_request.number }}'
          protected-workers: 'myapp-develop,myapp-staging,myapp,*-production'
          cloudflare-api-token: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          cloudflare-account-id: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          confirm-deletion: 'yes'
```

**📚 See [examples/advanced/gitflow/](examples/advanced/gitflow/) for complete working examples.**

## 🔑 Secret Management

### Option 1: GitHub Secrets (Default)

Add these secrets to your repository settings:

- `CLOUDFLARE_API_TOKEN`: Your Cloudflare API token with Workers permissions
- `CLOUDFLARE_ACCOUNT_ID`: Your Cloudflare Account ID
- `GITHUB_TOKEN`: Automatically provided by GitHub Actions (for commenting)

### Getting Cloudflare Credentials

1. **API Token**: Go to [Cloudflare Dashboard](https://dash.cloudflare.com/profile/api-tokens) → API Tokens → Create Token
   - Use the "Workers:Edit" template
   - Or create a custom token with these permissions:
     - Account: Cloudflare Workers:Edit
     - Zone: Zone:Read (if deploying to custom domains)

2. **Account ID**: Found in the right sidebar of any domain's overview page in the Cloudflare dashboard

## 🏗️ Architecture

The actions are built with a modular architecture:

```
cloudflare-actions/
├── url-generator/    # URL Generator action
├── deploy/           # Deploy action (for secrets management)
├── comment/          # Comment action
├── cleanup/          # Cleanup action
├── shared/           # Shared libraries
│   ├── lib/
│   │   ├── cloudflare-api.js    # Cloudflare API client
│   │   ├── url-generator.js     # URL generation utilities
│   │   └── wrangler.js          # Wrangler CLI wrapper
│   └── __tests__/    # Shared library tests
└── __tests__/        # Integration tests
```

### Design Philosophy

- **Modular**: Each action has a single responsibility
- **Compatible**: Works seamlessly with official Cloudflare actions
- **Flexible**: Mix and match actions based on your needs
- **Simple**: URL generation separate from deployment logic

### Shared Libraries

- **CloudflareApi**: Direct API client for Cloudflare Workers API
- **URL Generator**: Utilities for generating worker names and URLs from PR context
- **WranglerClient**: Minimal wrapper for specific use cases

## 🧪 Testing

Run the test suite:

```bash
pnpm test
```

Run tests with coverage:

```bash
pnpm run test:coverage
```

The project includes comprehensive tests for:

- All shared library functions
- API client functionality
- URL generation logic
- Error handling scenarios

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass (`pnpm test`)
6. Commit your changes (`git commit -m 'Add amazing feature'`)
7. Push to the branch (`git push origin feature/amazing-feature`)
8. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🔗 Related

- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)

## 📊 Marketplace Stats

- **Version**: 1.0.0
- **Downloads**: Coming soon
- **Stars**: ⭐ Star this repo to support the project!

---

**Made with ❤️ by [harunonsystem](https://github.com/harunonsystem)**
