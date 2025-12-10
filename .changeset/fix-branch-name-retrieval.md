---
'cf-workers-actions': patch
---

fix: use GITHUB_HEAD_REF for PR branch name retrieval

Fixed an issue where pull request branch names were incorrectly displayed as GitHub's internal reference (refs/pull/*/merge) instead of the actual source branch name. Now correctly uses GITHUB_HEAD_REF environment variable for PRs and github.context.payload.pull_request.head.ref in PR comments.
