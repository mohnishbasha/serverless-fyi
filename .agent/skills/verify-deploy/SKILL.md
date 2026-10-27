---
name: verify-deploy
description: Verify the deployed site after a deploy or when it looks wrong. Use for smoke checks and GitHub Pages status.
---

1. Smoke test: `bash scripts/smoke.sh <url>` (for example the staging or production URL).
2. Pages build status: `gh api repos/:owner/:repo/pages/builds/latest` (look for `status: built`).
3. Workflow status: `gh run list --limit 5` and `gh run view <id> --log-failed` on failures.
4. Staging has `noindex` by design (`PUBLIC_INDEXABLE=false`); production must not.
5. Never change DNS or Pages settings; report to the owner.

Success = smoke.sh exits 0 and the latest Pages build is `built`.
