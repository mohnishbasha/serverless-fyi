---
name: seo-aeo-audit
description: Audit SEO and answer-engine readiness before publishing or periodically. Use for pre-publish checks and scheduled audits.
---

1. `pnpm build`
2. `pnpm exec tsx scripts/validate-seo.ts`
3. `pnpm exec tsx scripts/validate-feeds.ts`
4. `pnpm lhci`
5. Invoke the seo-aeo-reviewer subagent on changed or the 5 most recent posts.
6. Write findings to `docs/audits/<date>.md` and open issues for fixes.

Success = scripts exit 0, Lighthouse meets lighthouserc.json budgets, reviewer reports no FAIL.
