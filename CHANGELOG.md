# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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

[Unreleased]: https://github.com/harunonsystem/cf-workers-actions/compare/v1.0.2...HEAD
[1.0.2]: https://github.com/harunonsystem/cf-workers-actions/compare/v1.0.1...v1.0.2
[1.0.1]: https://github.com/harunonsystem/cf-workers-actions/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/harunonsystem/cf-workers-actions/releases/tag/v1.0.0
