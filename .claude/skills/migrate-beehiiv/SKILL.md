---
name: migrate-beehiiv
description: Re-run or extend the Beehiiv import (scrape or API fetch, convert, localize images, manifest). Use when posts must be re-imported or the converter changes.
---

1. Export: `pnpm migrate:scrape`, or `pnpm migrate:fetch` with BEEHIIV_API_KEY in .env.local.
2. Convert: `pnpm exec tsx migration/html-to-md.ts` (add `--force` only to regenerate; it overwrites owner edits).
3. Localize images: `pnpm exec tsx migration/localize-images.ts`.
4. Manifest: `pnpm exec tsx migration/build-manifest.ts`. (Steps 2–4 together: `pnpm migrate:convert`, but it has no `--force`.)
5. Verify: `pnpm build && pnpm validate`, and `pnpm test:unit` for converter changes.
6. Read migration/report.md and summarize failures.

Never edit migration/legacy-urls.json; it is append-only and owner-managed. Migrated posts stay `aeoPending: true`.

Success = validate exits 0 and report.md lists no unexplained failures.
