# Cloudflare Actions

[![CI](https://github.com/harunonsystem/cloudflare-actions/workflows/CI/badge.svg)](https://github.com/harunonsystem/cloudflare-actions/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

GitHub Actions for Cloudflare Workers management.

## Features

- **Cleanup Action**: Delete Cloudflare Workers by prefix, numbers, or names
- **TypeScript**: Written in TypeScript with full type safety
- **Tested**: Comprehensive test coverage with Vitest
- **Fast Linting**: Code quality checks with Oxlint
- **1Password Integration**: Secure credential management

## Actions

### Cleanup Action

Delete Cloudflare Workers by prefix, numbers, or names.

```yaml
- uses: harunonsystem/cloudflare-actions/cleanup@v1
  with:
    cloudflare-api-token: ${{ secrets.CLOUDFLARE_API_TOKEN }}
    cloudflare-account-id: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
    worker-names: 'worker1,worker2'
```

#### Inputs

| Input                   | Description                                    | Required | Default |
| ----------------------- | ---------------------------------------------- | -------- | ------- |
| `cloudflare-api-token`  | Cloudflare API Token                           | Yes      | -       |
| `cloudflare-account-id` | Cloudflare Account ID                          | Yes      | -       |
| `worker-prefix`         | Worker prefix (e.g., "my-app-pr-")             | No       | -       |
| `worker-numbers`        | Comma-separated numbers (e.g., "1,2,3")        | No       | -       |
| `worker-names`          | Comma-separated full worker names              | No       | -       |
| `pr-number`             | PR number for automatic worker name generation | No       | -       |
| `fail-on-error`         | Fail workflow if any deletion fails            | No       | `true`  |

#### Outputs

| Output            | Description                            |
| ----------------- | -------------------------------------- |
| `deleted-count`   | Number of workers successfully deleted |
| `not-found-count` | Number of workers not found            |
| `error-count`     | Number of errors encountered           |

## Usage Examples

### Delete by Worker Names

```yaml
- uses: harunonsystem/cloudflare-actions/cleanup@v1
  with:
    cloudflare-api-token: ${{ secrets.CLOUDFLARE_API_TOKEN }}
    cloudflare-account-id: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
    worker-names: 'my-worker-1,my-worker-2,my-worker-3'
```

### Delete by Prefix and Numbers

```yaml
- uses: harunonsystem/cloudflare-actions/cleanup@v1
  with:
    cloudflare-api-token: ${{ secrets.CLOUDFLARE_API_TOKEN }}
    cloudflare-account-id: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
    worker-prefix: 'my-app-pr-'
    worker-numbers: '1,2,3'
    # Deletes: my-app-pr-1, my-app-pr-2, my-app-pr-3
```

### Delete by PR Number

```yaml
- uses: harunonsystem/cloudflare-actions/cleanup@v1
  with:
    cloudflare-api-token: ${{ secrets.CLOUDFLARE_API_TOKEN }}
    cloudflare-account-id: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
    worker-prefix: 'my-app-pr-'
    pr-number: ${{ github.event.pull_request.number }}
    # Deletes: my-app-pr-123 (if PR number is 123)
```

### Cleanup on PR Close

```yaml
name: Cleanup

on:
  pull_request:
    types: [closed]

jobs:
  cleanup:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Load secrets
        id: load-secrets
        uses: harunonsystem/cloudflare-actions/.github/actions/load-1password-secrets@v1
        env:
          OP_SERVICE_ACCOUNT_TOKEN: ${{ secrets.OP_SERVICE_ACCOUNT_TOKEN }}

      - name: Delete preview worker
        uses: harunonsystem/cloudflare-actions/cleanup@v1
        with:
          cloudflare-api-token: ${{ steps.load-secrets.outputs.CLOUDFLARE_API_TOKEN }}
          cloudflare-account-id: ${{ steps.load-secrets.outputs.CLOUDFLARE_ACCOUNT_ID }}
          worker-prefix: 'my-app-pr-'
          pr-number: ${{ github.event.pull_request.number }}
```

### Manual Cleanup with workflow_dispatch

```yaml
name: Manual Cleanup

on:
  workflow_dispatch:
    inputs:
      worker_prefix:
        description: 'Worker prefix (e.g., "my-app-pr-")'
        type: string
        default: 'my-app-pr-'
      worker_numbers:
        description: 'Numbers to delete (e.g., "1,2,3")'
        required: true
        type: string
      confirm_deletion:
        description: 'Type "DELETE" to confirm'
        required: true
        type: string

jobs:
  cleanup:
    runs-on: ubuntu-latest
    if: github.event.inputs.confirm_deletion == 'DELETE'
    steps:
      - uses: actions/checkout@v4

      - name: Load secrets
        id: load-secrets
        uses: harunonsystem/cloudflare-actions/.github/actions/load-1password-secrets@v1
        env:
          OP_SERVICE_ACCOUNT_TOKEN: ${{ secrets.OP_SERVICE_ACCOUNT_TOKEN }}

      - name: Delete workers
        uses: harunonsystem/cloudflare-actions/cleanup@v1
        with:
          cloudflare-api-token: ${{ steps.load-secrets.outputs.CLOUDFLARE_API_TOKEN }}
          cloudflare-account-id: ${{ steps.load-secrets.outputs.CLOUDFLARE_ACCOUNT_ID }}
          worker-prefix: ${{ github.event.inputs.worker_prefix }}
          worker-numbers: ${{ github.event.inputs.worker_numbers }}
```

## 1Password Integration

This repository includes a helper action to load secrets from 1Password:

```yaml
- name: Load secrets
  id: load-secrets
  uses: harunonsystem/cloudflare-actions/.github/actions/load-1password-secrets@v1
  env:
    OP_SERVICE_ACCOUNT_TOKEN: ${{ secrets.OP_SERVICE_ACCOUNT_TOKEN }}
```

### Setup

1. Create secrets in 1Password:
   - `op://cloudflare/api-token/credential`
   - `op://cloudflare/account-id/credential`

2. Add `OP_SERVICE_ACCOUNT_TOKEN` to your GitHub repository secrets

## Development

### Setup

```bash
pnpm install
```

### Build

```bash
pnpm run build
```

### Test

```bash
pnpm test
```

### Lint

```bash
pnpm run lint
```

### Format

```bash
pnpm run format
```

## Getting Cloudflare Credentials

1. **API Token**: Go to [Cloudflare Dashboard](https://dash.cloudflare.com/profile/api-tokens) → API Tokens → Create Token
   - Use the "Workers:Edit" template
   - Or create a custom token with:
     - Account: Cloudflare Workers:Edit

2. **Account ID**: Found in the right sidebar of any domain's overview page

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Related

- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)
- [1Password GitHub Actions](https://github.com/1Password/load-secrets-action)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)

---

**Made with ❤️ by [harunonsystem](https://github.com/harunonsystem)**
