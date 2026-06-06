---
'cf-workers-actions': minor
---

Add `{branch-name}` and `{commit-hash}` template placeholders for worker names, replacing `{pr-number}`. Worker names are now truncated to Cloudflare's 54-character preview script name limit. E2E cleanup workflow now uses branch-name based worker naming.
