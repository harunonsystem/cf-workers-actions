---
'cf-workers-actions': patch
---

Worker names are now lowercased in addition to sanitization to satisfy Cloudflare's `name` validation rule (alphanumeric lowercase with dashes only).
