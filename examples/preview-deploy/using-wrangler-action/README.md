# Using Wrangler Action (Modular Approach)

Modular deployment approach using three separate actions for maximum flexibility.

## 🎯 Actions Used

1. **`prepare-preview-deploy`** - Generate preview URLs and update wrangler.toml
2. **`cloudflare/wrangler-action`** - Official Cloudflare deployment action
3. **`pr-comment`** - Post deployment status to PRs

## 📋 Workflows

### Preview + Production

👉 [`preview-prod.yml`](./preview-prod.yml)

**Simple two-environment pattern (GitHub Flow):**

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

### wrangler.toml

👉 [`wrangler.toml`](./wrangler.toml)

Configure multiple environments in your `wrangler.toml`:

```toml
name = "myapp"
main = "src/index.js"
compatibility_date = "2024-01-01"

[env.preview]
# Name dynamically set by prepare-preview-deploy action

[env.dev]
name = "myapp-dev"

[env.stg]
name = "myapp-stg"

[env.production]
name = "myapp"
```

The `prepare-preview-deploy` action automatically updates the `[env.preview]` section with the generated worker name at runtime.

### Custom Domains

To use custom domains, specify the `domain` input:

```yaml
- uses: harunonsystem/cf-workers-actions/prepare-preview-deploy@v1
  with:
    worker-name: "myapp-pr-{pr-number}"
    environment: "preview"
    domain: "preview.example.com" # Custom domain
    pr-number: ${{ github.event.pull_request.number }}
```

And configure routes in `wrangler.toml`:

```toml
[env.production]
name = "myapp"
routes = [
  { pattern = "example.com/*", zone_name = "example.com" }
]
```

## 💡 Key Differences: Dynamic vs Static

### Dynamic Preview (PR-based)

- Uses `prepare-preview-deploy` to generate worker names and update wrangler.toml
- Updates `wrangler.toml` `[env.preview]` section with `name = "myapp-pr-123"`
- Deployed with `-e` flag: `wrangler deploy -e preview`
- Worker name changes per PR: `myapp-pr-456`, `myapp-pr-789`
- **Uses wrangler.toml env config (dynamically updated)**

### Static Environments (Branch-based)

- Uses `wrangler.toml` env configuration (static)
- Deployed with `-e` flag: `wrangler deploy -e dev`
- Worker name is always the same: `myapp-dev`, `myapp-stg`
- **Uses wrangler.toml `[env.xxx]` sections (manually configured)**

## 🚀 Usage

1. Copy the workflow file that matches your Git workflow
2. Configure `wrangler.toml` for your environments
3. Add secrets to your repository settings

## 📚 Related

- [Using Preview Deploy](../using-preview-deploy/) - All-in-one approach
- [Main README](../../README.md) - Examples overview
