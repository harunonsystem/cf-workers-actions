---
"cf-workers-actions": patch
---

Remove `worker-pattern` from cleanup action.

**BREAKING CHANGE**: The `worker-pattern` input has been removed to prevent accidental mass deletion of workers.

Use instead:
- `worker-names`: Exact worker names (comma-separated)
- `worker-prefix` + `worker-numbers`: For bulk deletion (e.g., `myapp-pr-` + `1,2,3`)
