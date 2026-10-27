---
description: Run the Beehiiv export, convert, localize, manifest pipeline and validate
argument-hint: '[--force]'
---

Run the Beehiiv migration pipeline. Use plan mode first; delegate to the content-migrator subagent if needed. Arguments: $ARGUMENTS

1. Export: `pnpm migrate:scrape`, or `pnpm migrate:fetch` when BEEHIIV_API_KEY is set in .env.local. Never print or commit the key.
2. Convert HTML to MDX: `pnpm exec tsx migration/html-to-md.ts`. Add `--force` only to regenerate (only if $ARGUMENTS contains it); it overwrites owner edits.
3. Localize images: `pnpm exec tsx migration/localize-images.ts`.
4. Build the manifest: `pnpm exec tsx migration/build-manifest.ts`. Never hand-edit migration/legacy-urls.json.
5. Verify: `pnpm build && pnpm validate`.
6. Summarize migration/report.md: counts, failures, posts needing owner review (migrated posts stay `aeoPending: true`).
