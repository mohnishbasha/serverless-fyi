# Copilot instructions — serverless.fyi

Astro static site for the "2 Minute Serverless" newsletter, deployed to GitHub Pages. Full guidance: AGENTS.md.

## Commands

- `pnpm install`, `pnpm dev`, `pnpm build`, `pnpm check` (lint + typecheck + unit + build + validate)
- `pnpm test:unit`, `pnpm test:e2e`, `pnpm lhci`, `pnpm validate`, `pnpm new-post "Title"`
- Visual snapshots: `bash scripts/update-snapshots.sh` (Docker, Linux-rendered)

## Rules

1. TDD. Failing test first.
2. Never change a published post's slug or remove entries from migration/legacy-urls.json.
3. Internal links in code go through `url()` in src/lib/urls.ts.
4. Behavior change means updating docs/ in the same PR.
5. Zero client JS unless justified in docs/DECISIONS.md.
6. Do not edit the author's prose unless asked.
7. Conventional Commits; draft PRs; never push to main or merge your own PR.
8. Never commit secrets; never touch DNS, Pages settings or subscribers.
9. Structured data must match visible content.
10. Run `pnpm check` before declaring done.
11. Post bodies keep root-relative links (`/p/x/`); the remark-base-links plugin adds the base path.
