# Workflow Examples

This directory contains example workflows demonstrating how to use the Cloudflare Actions.

## 📁 Files

### Composite Actions Examples

- **[preview-complete.yml](./workflows/preview-complete.yml)** - All-in-one preview deployment using `preview-deploy-complete`
- **[preview-modular.yml](./workflows/preview-modular.yml)** - Modular preview deployment using individual actions
- **[cleanup-pr.yml](./workflows/cleanup-pr.yml)** - Automatic cleanup when PR is closed
- **[cleanup-manual.yml](./workflows/cleanup-manual.yml)** - Manual worker cleanup with confirmation
- **[cleanup-batch.yml](./workflows/cleanup-batch.yml)** - Scheduled batch cleanup of old workers

## 🚀 Getting Started

1. Choose an example workflow that matches your use case
2. Copy the workflow file to your repository's `.github/workflows/` directory
3. Update the secrets and configuration values
4. Commit and push to trigger the workflow

## 🔑 Required Secrets

All workflows require the following secrets to be configured in your repository:

- `CLOUDFLARE_API_TOKEN` - Your Cloudflare API token with Workers permissions
- `CLOUDFLARE_ACCOUNT_ID` - Your Cloudflare Account ID

See the main [README](../README.md#-secret-management) for details on obtaining these credentials.

## 📝 Customization

Each example can be customized by:

- Adjusting branch patterns and exclusions
- Modifying worker naming schemes
- Customizing PR comment templates
- Configuring cleanup strategies

Refer to the action documentation in the main README for all available inputs.

## 💡 Tips

- **Complete vs Modular**: Use `preview-deploy-complete` for simplicity, or modular actions for more control
- **Branch Filtering**: Adjust `branch-patterns` and `exclude-branches` to match your workflow
- **Cleanup Strategy**: Choose between PR-linked, manual, or age-based cleanup depending on your needs
- **Dry Run**: Always test cleanup operations with `dry-run: true` first

## 🔗 Additional Resources

- [Main Documentation](../README.md)
- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
