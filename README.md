# cf-workers-actions

[![CI](https://github.com/harunonsystem/cf-workers-actions/workflows/CI/badge.svg)](https://github.com/harunonsystem/cf-workers-actions/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A comprehensive suite of modular GitHub Actions for Cloudflare Workers deployment, PR commenting, and cleanup operations.

## 🚀 Features

- **Prepare Preview Deploy**: Generate URLs and update wrangler.toml for preview deployments
- **Preview Deploy**: All-in-one action combining URL generation, deployment, and PR comments
- **PR Comment**: Automatically post deployment URLs and status to PR comments
- **Cleanup**: Clean up and delete Cloudflare Workers based on specific names
- **Modular Architecture**: Mix and match actions as needed, compatible with official Cloudflare actions
- **TypeScript First**: Written in TypeScript with complete type safety and definitions
- **Ultra-Fast Tooling**: Linting and formatting with Biome (replacing Oxlint & Prettier)
- **Comprehensive Testing**: Full test coverage with Vitest
- **Error Handling**: Robust error handling and informative logging

## 📦 Actions

### Prepare Preview Deploy (`prepare-preview-deploy`)

Prepare preview deployments by generating worker names and updating wrangler.toml.

```yaml
- uses: harunonsystem/cf-workers-actions/prepare-preview-deploy@v1
  id: prepare
  with:
    worker-name: 'myapp-pr-{pr-number}'
    environment: 'preview'
    domain: 'username.workers.dev'
```

**Inputs:**

- `worker-name` (required): Worker name template (supports `{pr-number}`, `{branch-name}`)
- `environment` (required): Deployment environment for wrangler.toml `[env.xxx]` section
- `domain` (required): Custom domain for deployment URL (e.g., `username.workers.dev` or `example.com`)
- `wrangler-toml-path`: Path to wrangler.toml (default: `./wrangler.toml`)

**Outputs:**

- `deployment-name`: Generated worker name
- `deployment-url`: Generated deployment URL

### Preview Deploy (`preview-deploy`)

All-in-one action that handles URL generation, deployment, and PR commenting.

```yaml
- uses: harunonsystem/cf-workers-actions/preview-deploy@v1
  with:
    cloudflare-api-token: ${{ secrets.CLOUDFLARE_API_TOKEN }}
    cloudflare-account-id: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
    worker-name: 'myapp-pr-{pr-number}'
    domain: 'username.workers.dev'
```

**Inputs:**

- `cloudflare-api-token` (required): Cloudflare API Token
- `cloudflare-account-id` (required): Cloudflare Account ID
- `worker-name` (required): Worker name template
- `domain` (required): Custom domain for deployment URL (e.g., `username.workers.dev` or `example.com`)
- `environment`: Deployment environment (default: `preview`)
- `wrangler-toml-path`: Path to wrangler.toml (default: `./wrangler.toml`)
- `github-token`: GitHub token for PR comments (default: `github.token`)

**Outputs:**

- `deployment-url`: Deployed worker URL
- `deployment-name`: Worker name
- `deployment-success`: Deployment success status

### PR Comment (`pr-comment`)

Post deployment information and preview URLs to Pull Request comments.

```yaml
- uses: harunonsystem/cf-workers-actions/pr-comment@v1
  with:
    deployment-url: ${{ steps.prepare.outputs.deployment-url }}
    deployment-success: 'true'
```

**Inputs:**

- `deployment-url` (required): URL of the deployed preview
- `deployment-success` (required): Deployment status (`true` or `false`)
- `deployment-name` (required): Name of the deployed worker
- `github-token`: GitHub token for PR comments (default: `github.token`)

**Outputs:**

- `comment-id`: ID of the created/updated comment

### Cleanup (`cleanup`)

Clean up and delete Cloudflare Workers based on specific names.

```yaml
- uses: harunonsystem/cf-workers-actions/cleanup@v1
  with:
    worker-names: 'myapp-pr-${{ github.event.pull_request.number }}'
    cloudflare-api-token: ${{ secrets.CLOUDFLARE_API_TOKEN }}
    cloudflare-account-id: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
```

**Inputs:**

- `worker-names`: Specific worker names to delete (comma-separated)
- `worker-prefix`: Worker prefix (e.g., `myapp-pr-`)
- `worker-numbers`: Numbers to delete (e.g., `1,2,3`). Used with `worker-prefix`
- `cloudflare-api-token` (required): Cloudflare API Token
- `cloudflare-account-id` (required): Cloudflare Account ID
- `dry-run`: List workers without deleting (default: `true`)
- `exclude`: Workers/patterns to exclude from deletion

**Outputs:**

- `deleted-workers`: List of deleted worker names (JSON array)
- `deleted-count`: Number of workers deleted
- `skipped-workers`: List of skipped workers (JSON array)
- `dry-run-results`: Workers that would be deleted in dry-run (JSON array)

## 🔧 Complete Workflow Examples

### All-in-One Preview Deploy

```yaml
name: Deploy Preview

on:
  pull_request:
    types: [opened, synchronize, reopened]

jobs:
  preview-deploy:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      pull-requests: write
    
    steps:
      - uses: actions/checkout@v4
      
      - uses: harunonsystem/cf-workers-actions/preview-deploy@v1
        with:
          cloudflare-api-token: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          cloudflare-account-id: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          worker-name: 'myapp-pr-{pr-number}'
          environment: 'preview'
          domain: 'preview.example.com'
```

### Modular Preview Deployment

```yaml
name: Deploy Preview (Modular)

on:
  pull_request:
    types: [opened, synchronize, reopened]

jobs:
  preview:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      pull-requests: write
    
    steps:
      - uses: actions/checkout@v4

      - name: Prepare Preview Deployment
        id: prepare
        uses: harunonsystem/cf-workers-actions/prepare-preview-deploy@v1
        with:
          worker-name: 'myapp-pr-{pr-number}'
          environment: 'preview'
          domain: 'username.workers.dev'

      - name: Deploy to Cloudflare Workers
        id: deploy
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          command: deploy -e preview

      - name: Comment on PR
        if: always()
        uses: harunonsystem/cf-workers-actions/pr-comment@v1
        with:
          deployment-url: ${{ steps.prepare.outputs.deployment-url }}
          deployment-name: ${{ steps.prepare.outputs.deployment-name }}
          deployment-success: ${{ steps.deploy.outcome == 'success' && 'true' || 'false' }}
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
        uses: harunonsystem/cf-workers-actions/cleanup@v1
        with:
          worker-names: 'myapp-pr-${{ github.event.pull_request.number }}'
          cloudflare-api-token: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          cloudflare-account-id: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
```


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
cf-workers-actions/
├── prepare-preview-deploy/  # Prepare preview deployments
├── preview-deploy/           # All-in-one preview deploy
├── pr-comment/               # PR comment action
├── cleanup/                  # Cleanup action
├── src/                      # TypeScript source code
│   ├── prepare-preview-deploy/
│   ├── preview-deploy/
│   ├── pr-comment/
│   └── cleanup/
└── tests/                    # Comprehensive test suite
```

### Design Philosophy

- **Modular**: Each action has a single responsibility
- **Flexible**: Mix and match actions based on your needs
- **Type-Safe**: Full TypeScript with Zod schema validation
- **Well-Tested**: Comprehensive unit and integration tests

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

---

**Made with ❤️ by [harunonsystem](https://github.com/harunonsystem)**
