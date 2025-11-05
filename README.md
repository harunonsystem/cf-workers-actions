# Cloudflare Actions

[![CI](https://github.com/harunonsystem/cloudflare-actions/workflows/CI/badge.svg)](https://github.com/harunonsystem/cloudflare-actions/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A comprehensive suite of GitHub Actions for Cloudflare Workers deployment, PR commenting, and cleanup operations.

## 🚀 Features

- **Deploy**: Deploy Cloudflare Workers with preview and production support
- **Comment**: Automatically post deployment URLs and status to PR comments
- **Cleanup**: Clean up workers based on patterns or specific names
- **TypeScript First**: Written in TypeScript with complete type safety and definitions
- **Comprehensive Testing**: Full test coverage with Vitest (50-100x faster than Jest)
- **Ultra-Fast Linting**: Code quality checks with Oxlint (10-100x faster than ESLint)
- **Error Handling**: Robust error handling and informative logging
- **Security First**: No external dependencies, minimal attack surface

## 📦 Actions

This repository provides two types of actions:

1. **Node.js Actions** - Fast, feature-rich TypeScript implementations
2. **Composite Actions** - Shell-based, flexible actions for wrangler.toml manipulation

### Node.js Actions

#### Deploy Action (`deploy`)

Deploy applications to Cloudflare Workers with support for both preview and production environments.

```yaml
- uses: harunonsystem/cloudflare-actions/deploy@v1
   id: deploy
   with:
     environment: preview
     cloudflare-api-token: ${{ secrets.CLOUDFLARE_API_TOKEN }}
     cloudflare-account-id: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
```

**Inputs:**

- `environment` (required): Deployment environment (`preview` or `production`)
- `worker-name-pattern`: Worker name pattern (default: `project-pr-{pr_number}`)
- `script-path`: Path to worker script (default: `index.js`)
- `cloudflare-api-token` (required): Cloudflare API Token
- `cloudflare-account-id` (required): Cloudflare Account ID
- `subdomain`: Custom subdomain for workers.dev URL
- `vars`: Environment variables (JSON format)
- `secrets`: Worker secrets (JSON format)
- `compatibility-date`: Cloudflare Workers compatibility date

**Outputs:**

- `url`: Deployed worker URL
- `worker-name`: Actual worker name used
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
- `deployment-status`: Deployment status (`success` or `failure`)
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
- `max-age-days`: Only delete workers older than specified days
- `exclude-pattern`: Pattern for workers to exclude from deletion
- `confirm-deletion`: Require explicit confirmation (default: `yes`)

**Outputs:**

- `deleted-workers`: List of deleted worker names (JSON array)
- `deleted-count`: Number of workers deleted
- `skipped-workers`: List of workers that were skipped (JSON array)
- `dry-run-results`: Workers that would be deleted in dry run mode (JSON array)

---

### Composite Actions

Composite Actions provide shell-based implementations that are ideal for workflows requiring `wrangler.toml` manipulation and flexible deployment patterns.

#### Preview Deploy Complete (`preview-deploy-complete`)

Complete workflow for preview deployments: updates `wrangler.toml`, deploys to Cloudflare, and posts PR comments.

```yaml
- uses: harunonsystem/cloudflare-actions/preview-deploy-complete@v1
  with:
    cloudflare-api-token: ${{ secrets.CLOUDFLARE_API_TOKEN }}
    cloudflare-account-id: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
    worker-name-prefix: 'myapp-preview'
    branch-patterns: 'feature/*,bugfix/*'
    exclude-branches: 'develop,staging,main'
```

**Key Inputs:**

- `cloudflare-api-token` (required): Cloudflare API Token
- `cloudflare-account-id` (required): Cloudflare Account ID
- `worker-name-prefix` (required): Worker name prefix
- `worker-name-suffix`: Suffix strategy (`pr-number`, `branch-name`, `custom`)
- `wrangler-toml-path`: Path to wrangler.toml (default: `wrangler.toml`)
- `environment-name`: Environment name in wrangler.toml (default: `preview`)
- `branch-patterns`: Branch patterns to deploy (default: `feature/*,bugfix/*,hotfix/*`)
- `exclude-branches`: Branches to exclude (default: `develop,staging,main`)
- `build-command`: Build command (default: `npm run build`)
- `skip-build`: Skip build step (default: `false`)
- `comment-enabled`: Post PR comment (default: `true`)
- `comment-template`: Custom comment template
- `github-token`: GitHub token (default: `${{ github.token }}`)

**Outputs:**

- `worker-name`: Deployed worker name
- `worker-url`: Deployed worker URL
- `deployment-id`: Cloudflare deployment ID
- `deployed`: Whether deployment was executed

#### Wrangler TOML Updater (`wrangler-toml-updater`)

Dynamically update `wrangler.toml` configuration.

```yaml
- uses: harunonsystem/cloudflare-actions/wrangler-toml-updater@v1
  id: update-toml
  with:
    environment-name: 'preview'
    worker-name: 'myapp-preview-123'
```

**Inputs:**

- `wrangler-toml-path`: Path to wrangler.toml (default: `wrangler.toml`)
- `environment-name` (required): Environment name
- `worker-name` (required): Worker name to set
- `create-backup`: Create backup before modification (default: `true`)
- `update-vars`: JSON object of environment variables
- `update-routes`: JSON array of routes

**Outputs:**

- `backup-path`: Path to backup file
- `updated`: Whether file was updated

#### PR Comment Poster (`pr-comment-poster`)

Post deployment results as PR comments.

```yaml
- uses: harunonsystem/cloudflare-actions/pr-comment-poster@v1
  with:
    worker-name: 'myapp-preview-123'
    worker-url: 'https://myapp-preview-123.workers.dev'
    deployment-status: 'success'
    github-token: ${{ secrets.GITHUB_TOKEN }}
```

**Inputs:**

- `github-token` (required): GitHub token
- `worker-name` (required): Deployed worker name
- `worker-url` (required): Deployed worker URL
- `deployment-status` (required): Status (`success`/`failure`)
- `comment-mode`: Posting mode (`create`, `update`, `create-or-update`)
- `comment-identifier`: Unique identifier (default: `preview-deployment`)
- `success-template`: Custom success template
- `failure-template`: Custom failure template
- `additional-info`: Additional markdown content

**Outputs:**

- `comment-id`: Posted comment ID
- `comment-url`: Posted comment URL

#### Workers Cleanup Composite (`workers-cleanup-composite`)

Flexible worker deletion with multiple modes: PR-linked, manual, batch, and age-based.

```yaml
- uses: harunonsystem/cloudflare-actions/workers-cleanup-composite@v1
  with:
    cloudflare-api-token: ${{ secrets.CLOUDFLARE_API_TOKEN }}
    cloudflare-account-id: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
    cleanup-mode: 'pr-linked'
    pr-number: ${{ github.event.pull_request.number }}
    worker-name-prefix: 'myapp-preview'
```

**Inputs:**

- `cloudflare-api-token` (required): Cloudflare API Token
- `cloudflare-account-id` (required): Cloudflare Account ID
- `cleanup-mode` (required): Mode (`pr-linked`, `manual`, `batch`, `batch-by-age`)
- `pr-number`: PR number (for `pr-linked` mode)
- `worker-name-prefix`: Worker name prefix (default: `preview`)
- `worker-names`: Comma-separated worker names (for `manual` mode)
- `batch-pattern`: Pattern for batch deletion (e.g., `preview-*`)
- `exclude-workers`: Workers to exclude from deletion
- `max-age-days`: Delete workers older than N days (for `batch-by-age` mode)
- `require-confirmation`: Require confirmation (default: `true`)
- `confirmation-keyword`: Confirmation keyword (default: `DELETE`)
- `dry-run`: Dry run mode (default: `false`)

**Outputs:**

- `deleted-workers`: JSON array of deleted worker names
- `deleted-count`: Number of deleted workers
- `skipped-count`: Number of skipped workers
- `errors`: Errors encountered

---

## 🔧 Complete Workflow Examples

### Node.js Actions Examples

#### Preview Deployment with PR Comments

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

      - name: Deploy to Cloudflare Workers
        id: deploy
        uses: harunonsystem/cloudflare-actions/deploy@v1
        with:
          environment: preview
          worker-name-pattern: 'myapp-pr-{pr_number}'
          api-token: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          account-id: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          vars: |
            {
              "ENVIRONMENT": "preview",
              "DEBUG": "true"
            }

      - name: Comment PR
        uses: harunonsystem/cloudflare-actions/comment@v1
        if: always()
        with:
          deployment-url: ${{ steps.deploy.outputs.url }}
          deployment-status: ${{ steps.deploy.outputs.success == 'true' && 'success' || 'failure' }}
          worker-name: ${{ steps.deploy.outputs.worker-name }}
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
         uses: harunonsystem/cloudflare-actions/deploy@v1
         with:
           environment: production
           worker-name-pattern: 'myapp-production'
           cloudflare-api-token: ${{ secrets.CLOUDFLARE_API_TOKEN }}
           cloudflare-account-id: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          vars: |
            {
              "ENVIRONMENT": "production",
              "DEBUG": "false"
            }
          secrets: |
            {
              "API_KEY": "${{ secrets.PRODUCTION_API_KEY }}",
              "DATABASE_URL": "${{ secrets.DATABASE_URL }}"
            }
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
           exclude-pattern: 'myapp-pr-main'
           max-age-days: 7
           dry-run: false
           cloudflare-api-token: ${{ secrets.CLOUDFLARE_API_TOKEN }}
           cloudflare-account-id: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          confirm-deletion: 'yes'
```

---

### Composite Actions Examples

#### Complete Preview Deployment (All-in-One)

```yaml
name: Deploy Preview (Complete)

on:
  pull_request:
    types: [opened, synchronize, reopened]

jobs:
  preview:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci

      # One action does it all: wrangler.toml update + deploy + PR comment
      - name: Deploy preview
        uses: harunonsystem/cloudflare-actions/preview-deploy-complete@v1
        with:
          cloudflare-api-token: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          cloudflare-account-id: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          worker-name-prefix: 'myapp-preview'
          branch-patterns: 'feature/*,bugfix/*'
          exclude-branches: 'develop,staging'
          build-command: 'npm run build'
```

#### Modular Preview Deployment

```yaml
name: Deploy Preview (Modular)

on:
  pull_request:
    types: [opened, synchronize, reopened]

jobs:
  preview:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci && npm run build

      # Step 1: Update wrangler.toml
      - name: Update wrangler.toml
        id: update-toml
        uses: harunonsystem/cloudflare-actions/wrangler-toml-updater@v1
        with:
          environment-name: 'preview'
          worker-name: 'myapp-preview-${{ github.event.pull_request.number }}'

      # Step 2: Deploy with official Cloudflare action
      - name: Deploy to Cloudflare
        id: deploy
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          environment: 'preview'

      # Step 3: Post PR comment
      - name: Post PR comment
        uses: harunonsystem/cloudflare-actions/pr-comment-poster@v1
        if: always()
        with:
          worker-name: 'myapp-preview-${{ github.event.pull_request.number }}'
          worker-url: ${{ steps.deploy.outputs.deployment-url }}
          deployment-status: ${{ steps.deploy.outcome == 'success' && 'success' || 'failure' }}

      # Restore wrangler.toml
      - name: Restore wrangler.toml
        if: always()
        run: |
          if [[ -f "${{ steps.update-toml.outputs.backup-path }}" ]]; then
            mv "${{ steps.update-toml.outputs.backup-path }}" wrangler.toml
          fi
```

#### PR-Linked Cleanup

```yaml
name: Cleanup on PR Close

on:
  pull_request:
    types: [closed]

jobs:
  cleanup:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Delete preview worker
        uses: harunonsystem/cloudflare-actions/workers-cleanup-composite@v1
        with:
          cloudflare-api-token: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          cloudflare-account-id: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          cleanup-mode: 'pr-linked'
          pr-number: ${{ github.event.pull_request.number }}
          worker-name-prefix: 'myapp-preview'
```

#### Batch Cleanup by Age

```yaml
name: Cleanup Old Previews

on:
  schedule:
    - cron: '0 0 * * 0'  # Weekly on Sunday
  workflow_dispatch:
    inputs:
      max-age-days:
        description: 'Delete workers older than N days'
        default: '14'
      dry-run:
        description: 'Dry run mode'
        default: 'false'

jobs:
  cleanup:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Batch delete old workers
        uses: harunonsystem/cloudflare-actions/workers-cleanup-composite@v1
        with:
          cloudflare-api-token: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          cloudflare-account-id: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          cleanup-mode: 'batch-by-age'
          max-age-days: ${{ github.event.inputs.max-age-days || '14' }}
          dry-run: ${{ github.event.inputs.dry-run || 'false' }}
          require-confirmation: 'false'
```

For more examples, see the [`examples/workflows`](./examples/workflows) directory.

---

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

The actions are built with a modular architecture supporting both Node.js and composite implementations:

```
cloudflare-actions/
├── Node.js Actions (TypeScript)
│   ├── deploy/                           # Deploy action
│   ├── comment/                          # Comment action
│   ├── cleanup/                          # Cleanup action
│   └── shared/                           # Shared libraries
│       ├── lib/
│       │   ├── cloudflare-api.js        # Cloudflare API client
│       │   ├── url-generator.js         # URL generation utilities
│       │   └── wrangler.js              # Wrangler CLI wrapper
│       └── __tests__/                   # Shared library tests
│
├── Composite Actions (Shell-based)
│   ├── preview-deploy-complete/         # All-in-one preview deployment
│   ├── wrangler-toml-updater/           # wrangler.toml manipulation
│   ├── pr-comment-poster/               # PR comment posting
│   └── workers-cleanup-composite/       # Flexible worker cleanup
│
└── examples/
    └── workflows/                        # Example workflow files
```

### Shared Libraries

- **CloudflareApi**: Direct API client for Cloudflare Workers API
- **WranglerClient**: Wrapper around Wrangler CLI for deployments
- **URL Generator**: Utilities for generating worker names and URLs

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
