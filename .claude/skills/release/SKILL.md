---
name: release
description: Cut a vX.Y.Z release of serverless.fyi. Use when asked to release or tag a version.
---

1. Follow the checklist in docs/RUNBOOK.md.
2. Bump package.json version and SITE_VERSION in src/lib/site.ts; add a dated CHANGELOG section.
3. `bash scripts/check-versions.sh` must pass.
4. `pnpm check` must pass.
5. Open a draft PR; the owner merges.
6. Print (do not run) the tag commands: `git tag -a vX.Y.Z -m "vX.Y.Z"` and `git push origin vX.Y.Z`.

Success = versions agree across the three sources, `pnpm check` exits 0, and tag commands are handed to the owner.
