---
description: Audit SEO, AEO and Lighthouse across templates and recent posts
argument-hint: '[focus area]'
---

Run an SEO/AEO audit. Focus (optional): $ARGUMENTS

1. Build: `pnpm build`.
2. Run `pnpm exec tsx scripts/validate-seo.ts` and record failures.
3. Run Lighthouse: `pnpm lhci` (covers the home, post, archive and about templates).
4. Invoke the seo-aeo-reviewer subagent on the 5 most recent posts.
5. Write findings to `docs/audits/<date>.md` (YYYY-MM-DD, today's date) with PASS/FAIL per check and suggested fixes.
6. Open a GitHub issue per actionable fix with `gh issue create`; do not change post prose.
