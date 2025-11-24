# Using Deploy Preview (All-in-one Approach)

All-in-one deployment action that handles URL generation, deployment, and PR commenting automatically.

## 🎯 Action Used

**`preview-deploy`** - All-in-one action that combines:
- URL generation
- Cloudflare Workers deployment
- Automatic PR commenting

## 📋 Workflows

### Preview + Production
👉 [`preview-prod.yml`](./preview-prod.yml)

**Simple two-environment pattern:**
- Pull Request → Preview (`myapp-pr-123`)
- Push to main → Production (`myapp`)

### Multi-Environment
👉 [`multi-env.yml`](./multi-env.yml)

**Multi-environment with dynamic + static deployments (GitFlow):**
- Pull Request → **Preview (DYNAMIC)** (`myapp-pr-123`)
- Push to dev → **Dev (STATIC)** (`myapp-dev`)
- Push to stg → **Staging (STATIC)** (`myapp-stg`)
- Push to release/** → **Release (STATIC)** (`myapp-release-v1.0`)

### Production Only
👉 [`prod-deploy.yml`](../prod-deploy.yml)

**Production deployment with approval workflow:**
- Push to main → Production (`myapp`)
- Uses GitHub Environment protection for manual approval
- Perfect companion to `multi-env.yml` for GitFlow

## 🔧 Configuration

### Basic Usage

```yaml
- uses: harunonsystem/cloudflare-actions/preview-deploy@v1
  with:
    cloudflare-api-token: ${{ secrets.CLOUDFLARE_API_TOKEN }}
    cloudflare-account-id: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
    worker-name: 'myapp-pr-{pr-number}'
    environment: 'preview'
```

### With Custom Domain

```yaml
- uses: harunonsystem/cloudflare-actions/preview-deploy@v1
  with:
    cloudflare-api-token: ${{ secrets.CLOUDFLARE_API_TOKEN }}
    cloudflare-account-id: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
    environment: 'preview'
    worker-name: 'myapp-pr-{pr-number}'
    domain: 'preview.example.com'
```

## ✨ Benefits

- **Simplicity**: Single action handles everything
- **Less boilerplate**: Fewer steps in workflow
- **Automatic PR comments**: No need to configure separately
- **Consistent behavior**: URL generation and deployment always in sync

## 🔄 Comparison with Modular Approach

### All-in-one (Deploy Preview)
```yaml
# Just one step!
- uses: harunonsystem/cloudflare-actions/preview-deploy@v1
  with:
    cloudflare-api-token: ${{ secrets.CLOUDFLARE_API_TOKEN }}
    cloudflare-account-id: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
    worker-name: 'myapp-pr-{pr-number}'
    environment: 'preview'
```

### Modular (Wrangler Action)
```yaml
# Three separate steps
- uses: harunonsystem/cloudflare-actions/prepare-preview-deploy@v1
  id: prepare
  with:
    worker-name: 'myapp-pr-{pr-number}'
    environment: 'preview'

- uses: cloudflare/wrangler-action@v3
  id: deploy
  with:
    apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
    accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
    command: deploy -e preview

- uses: harunonsystem/cloudflare-actions/pr-comment@v1
  with:
    deployment-url: ${{ steps.prepare.outputs.deployment-url }}
    deployment-name: ${{ steps.prepare.outputs.deployment-name }}
    deployment-success: ${{ steps.deploy.outcome == 'success' && 'true' || 'false' }}
```

**Choose modular approach if:**
- You need custom deployment logic
- You want to add steps between URL generation and deployment
- You need fine-grained control over each step

**Choose all-in-one approach if:**
- You want simplicity and fewer lines of code
- Standard deployment flow is sufficient
- You prefer opinionated, streamlined workflows

## 🚀 Usage

1. Copy the workflow file that matches your Git workflow
2. Update `worker-name` in the workflow
3. Add secrets to your repository settings
4. (Optional) Configure custom domains

## 📚 Related

- [Using Wrangler Action](../using-wrangler-action/) - Modular approach
- [Main README](../../README.md) - Examples overview
