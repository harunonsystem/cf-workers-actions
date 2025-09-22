# Cloudflare Actions

[![CI](https://github.com/harunonsystem/cloudflare-actions/workflows/CI/badge.svg)](https://github.com/harunonsystem/cloudflare-actions/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A comprehensive suite of GitHub Actions for Cloudflare Workers deployment, PR commenting, and cleanup operations.

## 🚀 Features

- **Deploy**: Deploy Cloudflare Workers with preview and production support
- **Comment**: Automatically post deployment URLs and status to PR comments
- **Cleanup**: Clean up workers based on patterns or specific names
- **Full TypeScript Support**: Complete type definitions for all actions
- **Comprehensive Testing**: Full test coverage with Jest
- **Error Handling**: Robust error handling and informative logging

## 📦 Actions

### Deploy Action (`deploy`)

Deploy applications to Cloudflare Workers with support for both preview and production environments.

```yaml
- uses: harunonsystem/cloudflare-actions/deploy@v1
  id: deploy
  with:
    environment: preview
    api-token: ${{ secrets.CLOUDFLARE_API_TOKEN }}
    account-id: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
```

**Inputs:**

- `environment` (required): Deployment environment (`preview` or `production`)
- `worker-name-pattern`: Worker name pattern (default: `project-pr-{pr_number}`)
- `script-path`: Path to worker script (default: `index.js`)
- `api-token` (required): Cloudflare API Token
- `account-id` (required): Cloudflare Account ID
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
    worker-pattern: "project-pr-*"
    api-token: ${{ secrets.CLOUDFLARE_API_TOKEN }}
    account-id: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
```

**Inputs:**

- `worker-pattern`: Pattern for workers to delete (supports wildcards)
- `worker-names`: Specific worker names to delete (comma-separated)
- `api-token` (required): Cloudflare API Token
- `account-id` (required): Cloudflare Account ID
- `dry-run`: Only list workers without deleting (default: `false`)
- `max-age-days`: Only delete workers older than specified days
- `exclude-pattern`: Pattern for workers to exclude from deletion
- `confirm-deletion`: Require explicit confirmation (default: `yes`)

**Outputs:**

- `deleted-workers`: List of deleted worker names (JSON array)
- `deleted-count`: Number of workers deleted
- `skipped-workers`: List of workers that were skipped (JSON array)
- `dry-run-results`: Workers that would be deleted in dry run mode (JSON array)

## 🔧 Complete Workflow Examples

### Preview Deployment with PR Comments

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
          worker-name-pattern: "myapp-pr-{pr_number}"
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
          worker-name-pattern: "myapp-production"
          api-token: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          account-id: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
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
          worker-pattern: "myapp-pr-${{ github.event.pull_request.number }}"
          api-token: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          account-id: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          confirm-deletion: "yes"
```

### Scheduled Cleanup

```yaml
name: Weekly Cleanup

on:
  schedule:
    - cron: "0 2 * * 0" # Every Sunday at 2 AM

jobs:
  cleanup-old-workers:
    runs-on: ubuntu-latest
    steps:
      - name: Cleanup Old Preview Workers
        uses: harunonsystem/cloudflare-actions/cleanup@v1
        with:
          worker-pattern: "myapp-pr-*"
          exclude-pattern: "myapp-pr-main"
          max-age-days: 7
          dry-run: false
          api-token: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          account-id: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          confirm-deletion: "yes"
```

## 🔑 Required Secrets

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
├── deploy/           # Deploy action
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

### Shared Libraries

- **CloudflareApi**: Direct API client for Cloudflare Workers API
- **WranglerClient**: Wrapper around Wrangler CLI for deployments
- **URL Generator**: Utilities for generating worker names and URLs

## 🧪 Testing

Run the test suite:

```bash
npm test
```

Run tests with coverage:

```bash
npm run test:coverage
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
5. Ensure all tests pass (`npm test`)
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
