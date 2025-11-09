# Cloudflare Workers Delete Action

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A minimal GitHub Action to delete Cloudflare Workers.

## Features

- Delete Cloudflare Workers by name
- Support for comma-separated list of workers
- 1Password integration for secure credential management
- Detailed deletion status reporting
- Error handling and retry logic

## Usage

### Basic Usage

```yaml
- name: Delete Cloudflare Workers
  uses: harunonsystem/cloudflare-actions@v1
  with:
    cloudflare-api-token: ${{ secrets.CLOUDFLARE_API_TOKEN }}
    cloudflare-account-id: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
    worker-names: 'my-worker-1,my-worker-2'
```

### With 1Password Integration

```yaml
- name: Load secrets
  id: load-secrets
  uses: harunonsystem/cloudflare-actions/.github/actions/load-1password-secrets@v1
  env:
    OP_SERVICE_ACCOUNT_TOKEN: ${{ secrets.OP_SERVICE_ACCOUNT_TOKEN }}

- name: Delete workers
  uses: harunonsystem/cloudflare-actions@v1
  with:
    cloudflare-api-token: ${{ steps.load-secrets.outputs.CLOUDFLARE_API_TOKEN }}
    cloudflare-account-id: ${{ steps.load-secrets.outputs.CLOUDFLARE_ACCOUNT_ID }}
    worker-names: 'my-worker-1,my-worker-2'
```

### Delete Workers on PR Close

```yaml
name: Cleanup

on:
  pull_request:
    types: [closed]

jobs:
  delete-preview:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Load secrets
        id: load-secrets
        uses: ./.github/actions/load-1password-secrets
        env:
          OP_SERVICE_ACCOUNT_TOKEN: ${{ secrets.OP_SERVICE_ACCOUNT_TOKEN }}

      - name: Delete preview worker
        uses: harunonsystem/cloudflare-actions@v1
        with:
          cloudflare-api-token: ${{ steps.load-secrets.outputs.CLOUDFLARE_API_TOKEN }}
          cloudflare-account-id: ${{ steps.load-secrets.outputs.CLOUDFLARE_ACCOUNT_ID }}
          worker-names: 'my-app-pr-${{ github.event.pull_request.number }}'
```

## Inputs

| Input | Description | Required | Default |
|-------|-------------|----------|---------|
| `cloudflare-api-token` | Cloudflare API Token | Yes | - |
| `cloudflare-account-id` | Cloudflare Account ID | Yes | - |
| `worker-names` | Comma-separated list of worker names to delete | Yes | - |
| `fail-on-error` | Fail the workflow if any deletion fails | No | `true` |

## Outputs

This action outputs deletion results to the console:
- Number of successfully deleted workers
- Number of workers not found
- Number of errors encountered

## 1Password Integration

This repository includes a helper action to load secrets from 1Password:

```yaml
- uses: harunonsystem/cloudflare-actions/.github/actions/load-1password-secrets@v1
  env:
    OP_SERVICE_ACCOUNT_TOKEN: ${{ secrets.OP_SERVICE_ACCOUNT_TOKEN }}
```

### 1Password Setup

1. Create secrets in 1Password with the following paths:
   - `op://cloudflare/api-token/credential`
   - `op://cloudflare/account-id/credential`

2. Add `OP_SERVICE_ACCOUNT_TOKEN` to your GitHub repository secrets

## Getting Cloudflare Credentials

1. **API Token**: Go to [Cloudflare Dashboard](https://dash.cloudflare.com/profile/api-tokens) → API Tokens → Create Token
   - Use the "Workers:Edit" template
   - Or create a custom token with these permissions:
     - Account: Cloudflare Workers:Edit

2. **Account ID**: Found in the right sidebar of any domain's overview page in the Cloudflare dashboard

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Related

- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)
- [1Password GitHub Actions](https://github.com/1Password/load-secrets-action)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)

---

**Made with ❤️ by [harunonsystem](https://github.com/harunonsystem)**
