# Cloudflare Workers Deployment Examples

Practical examples for deploying Cloudflare Workers with preview environments and automated PR comments.

## 📂 Directory Structure

```
examples/
├── cleanup/          # Worker cleanup automation
└── preview-deploy/   # Preview deployment workflows
    ├── using-wrangler-action/   # Modular approach
    └── using-preview-deploy/    # All-in-one approach
```

## 🚀 Preview Deploy Examples

Choose the approach that best fits your needs:

### [Using Wrangler Action](./preview-deploy/using-wrangler-action/) (Modular)

**Three separate actions for maximum flexibility:**

- `prepare-preview-deploy` - Generate URLs and update wrangler.toml
- `cloudflare/wrangler-action` - Official deployment
- `pr-comment` - PR status updates

**Best for:**

- Teams wanting full control over deployment steps
- Custom deployment logic between steps
- Fine-grained workflow customization

### [Using Preview Deploy](./preview-deploy/using-preview-deploy/) (All-in-one)

**Single action handles everything:**

- URL generation + deployment + PR commenting in one step

**Best for:**

- Simple, streamlined workflows
- Quick setup with less boilerplate
- Standard deployment patterns

## 🌿 Git Workflow Support

Both approaches support common Git workflows:

### Preview + Production (GitHub Flow)

- **Preview** (PRs) → `myapp-pr-123`
- **Production** (main) → `myapp`

### Multi-Environment (GitFlow)

- **Preview** (PRs) → `myapp-pr-123` (dynamic)
- **Dev** (dev) → `myapp-dev` (static)
- **Staging** (stg) → `myapp-stg` (static)
- **Release** (release/**) → `myapp-release-v1.0` (static)
- **Production** (main) → `myapp` (static)

## 🧹 Cleanup Examples

Auto-cleanup of preview workers when PRs close:

👉 [Cleanup Examples](./cleanup/)

## 🔧 Quick Start

1. **Choose your approach** (modular vs all-in-one)
2. **Choose your Git workflow** (GitHub Flow vs GitFlow)
3. **Copy the workflow file** to `.github/workflows/`
4. **Update app name** in the workflow
5. **Add secrets** to repository settings

## 📚 What's Next?

- [Preview Deploy with Wrangler Action](./preview-deploy/using-wrangler-action/)
- [Preview Deploy with Preview Deploy](./preview-deploy/using-preview-deploy/)
- [Cleanup Automation](./cleanup/)

---

**Made with ❤️ by [harunonsystem](https://github.com/harunonsystem)**
