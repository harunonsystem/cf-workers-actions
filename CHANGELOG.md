# Changelog

## 1.1.0

### Minor Changes

- 157b1cf: Fix `preview-deploy` to correctly use custom `wrangler.toml` path via `--config` option

  Fix `pr-comment` action to properly return `comment-id` output

  Optimize E2E workflow by sharing build artifacts across jobs

  Refactor shared utilities and improve test coverage

## 1.0.5

### Patch Changes

- b693ead: fix: use GITHUB_HEAD_REF for PR branch name retrieval

  Fixed an issue where pull request branch names were incorrectly displayed as GitHub's internal reference (refs/pull/\*/merge) instead of the actual source branch name. Now correctly uses GITHUB_HEAD_REF environment variable for PRs and github.context.payload.pull_request.head.ref in PR comments.

## 1.0.4

### Patch Changes

- eb6724b: Remove `worker-pattern` from cleanup action.

  **BREAKING CHANGE**: The `worker-pattern` input has been removed to prevent accidental mass deletion of workers.

  Use instead:

  - `worker-names`: Exact worker names (comma-separated)
  - `worker-prefix` + `worker-numbers`: For bulk deletion (e.g., `myapp-pr-` + `1,2,3`)

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **worker-prefix and worker-numbers support in cleanup action**: Added flexible worker naming support
  - `worker-prefix` input to specify prefix (e.g., "myapp-pr-")
  - `worker-numbers` input for numeric identifiers (e.g., "1,2,3")
  - `worker-names` input for full names (overrides prefix+numbers)
  - Automatic expansion of prefix+numbers to full worker names

## [1.0.3] - 2025-12-03

### Added

- **Debug Mode**: Added debug mode to control log verbosity ([#9](https://github.com/harunonsystem/cf-workers-actions/issues/9), [#10](https://github.com/harunonsystem/cf-workers-actions/pull/10))
  - Shared logger utility respecting `ACTIONS_STEP_DEBUG` environment variable
  - Reduced default log output for cleaner CI/CD workflows
  - Full diagnostic information available when debug mode enabled
  - Applied to `prepare-preview-deploy` and `cleanup` actions
- **Renovate**: Added automated dependency management configuration ([#11](https://github.com/harunonsystem/cf-workers-actions/pull/11))
  - pnpm support for transitive dependencies
  - Weekly update schedule (Monday mornings JST)
  - Security vulnerability alerts
  - 3-day minimum release age for stability

### Security

- **Vite**: Updated vite from 7.1.7 to 7.2.6 via vitest updates ([#1](https://github.com/harunonsystem/cf-workers-actions/security/dependabot/1), [#11](https://github.com/harunonsystem/cf-workers-actions/pull/11))
  - Fixes CVE affecting vite 7.1.0-7.1.10 (server.fs.deny bypass on Windows)
  - Updated vitest packages from 4.0.13 to 4.0.14

### Changed

- Removed unused `tsx` development dependency ([#11](https://github.com/harunonsystem/cf-workers-actions/pull/11))

## [1.0.2] - 2025-12-03

### Added

- Added `github-token` input to resolve authentication error when accessing GitHub API

## [1.0.1] - 2025-12-03

### Changed

- Switched from TypeScript compilation to @vercel/ncc bundling for distributable files ([#8](https://github.com/harunonsystem/cf-workers-actions/pull/8))
- Made `domain` parameter required for better deployment reliability ([#8](https://github.com/harunonsystem/cf-workers-actions/pull/8))

### Fixed

- Fixed missing @actions/core dependency at runtime by bundling all dependencies ([#7](https://github.com/harunonsystem/cf-workers-actions/issues/7), [#8](https://github.com/harunonsystem/cf-workers-actions/pull/8))
- Added mutual exclusivity validation for `worker_pattern` and `worker_names` in cleanup action ([#6](https://github.com/harunonsystem/cf-workers-actions/issues/6), [#8](https://github.com/harunonsystem/cf-workers-actions/pull/8))

## [1.0.0] - 2025-12-02

### Added

#### Deploy Action

- Initial release of Cloudflare Workers deployment action
- Support for preview and production environments
- Configurable worker name patterns with PR number substitution
- Environment variables and secrets support
- Custom subdomain support for workers.dev URLs
- Comprehensive output values (URL, worker name, deployment ID)
- Wrangler CLI integration for reliable deployments

#### Comment Action

- Automated PR commenting with deployment information
- Support for custom comment templates
- Comment updating to avoid spam (configurable)
- Status-aware commenting (success/failure states)
- Markdown formatting support
- Custom message support

#### Cleanup Action

- Pattern-based worker deletion with wildcard support
- Specific worker name deletion (comma-separated list)
- Dry-run mode for safe preview of deletions
- Exclusion patterns to protect important workers
- Age-based filtering (planned for future release)
- Comprehensive deletion reporting

#### Shared Libraries

- **CloudflareApi**: Direct API client for Cloudflare Workers API
- **WranglerClient**: Wrapper around Wrangler CLI for deployments
- **URL Generator**: Utilities for generating worker names and URLs from patterns

#### Development & Quality

- Complete Jest test suite with >90% coverage
- Biome configuration (replaced ESLint/Prettier/Oxlint)
- GitHub Actions CI/CD pipeline
- Comprehensive documentation and examples
- MIT license

### Technical Details

- Node.js 20 runtime support
- Full TypeScript support (JSDoc annotations)
- Robust error handling and logging
- GitHub Actions summary integration
- Modular architecture for maintainability

### Marketplace Features

- Multiple action access patterns supported
- Comprehensive branding and metadata
- Professional documentation with usage examples
- Community-friendly contribution guidelines

[Unreleased]: https://github.com/harunonsystem/cf-workers-actions/compare/v1.0.3...HEAD
[1.0.3]: https://github.com/harunonsystem/cf-workers-actions/compare/v1.0.2...v1.0.3
[1.0.2]: https://github.com/harunonsystem/cf-workers-actions/compare/v1.0.1...v1.0.2
[1.0.1]: https://github.com/harunonsystem/cf-workers-actions/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/harunonsystem/cf-workers-actions/releases/tag/v1.0.0
