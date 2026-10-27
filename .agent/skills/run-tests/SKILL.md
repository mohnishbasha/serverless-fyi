---
name: run-tests
description: Run the right test subset for the files you changed in serverless.fyi and interpret failures.
---

- Changed src/lib or migration/ → `pnpm test:unit`
- Changed components/layouts/pages/styles → `pnpm build && pnpm validate && pnpm test:e2e`
- Changed posts → `pnpm build && pnpm validate`
- Before PR → `pnpm check`

Visual diffs: inspect playwright-report. Visual snapshots are Linux-rendered, so never update them locally with `--update-snapshots`; run `bash scripts/update-snapshots.sh` (Docker, after a fresh `pnpm build`) only when the change is intentional, and say so in the PR.

E2E needs a served build: `node scripts/serve-dist.mjs 4399` (Astro 7 `astro preview` daemonizes).

Success = exit code 0 and no new warnings.
