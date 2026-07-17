---
"cf-workers-actions": minor
---

Fix `deleteWorker`/`getWorker` to detect "not found" via HTTP status (404) instead of matching error message text, so Cloudflare's `This Worker does not exist on your account.` response is correctly treated as a skip rather than a failure.

Migrate all action runtimes (`cleanup`, `pr-comment`, `prepare-preview-deploy`, `preview-deploy`) from `node20` to `node24`.
