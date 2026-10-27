# AGENTS.md — serverless.fyi

Static site for the "2 Minute Serverless" newsletter (Astro → GitHub Pages).
Source of truth for requirements: docs/PRD.md and the other docs/*.md specs. PROMPT.md is the original build prompt.

## Commands

- Install: `pnpm install`
- Dev: `pnpm dev` (`http://localhost:4321`)
- Build: `pnpm build`
- Preview: `pnpm preview` (Astro 7 `astro preview` daemonizes; for tests serve dist with `node scripts/serve-dist.mjs 4399`)
- All checks: `pnpm check` (= lint + typecheck + test:unit + build + validate)
- Unit: `pnpm test:unit` · E2E: `pnpm test:e2e` · Lighthouse: `pnpm lhci`
- Content and output validation (needs a build): `pnpm validate`
- Versions: `bash scripts/check-versions.sh` (package.json == SITE_VERSION == CHANGELOG)
- New post: `pnpm new-post "Title"`
- Staging build: `SITE_URL=https://mohnishbasha.github.io BASE_PATH=/serverless-fyi/ PUBLIC_INDEXABLE=false pnpm build`
- Visual snapshots (Docker, Linux-rendered): `bash scripts/update-snapshots.sh`
- Migration: `pnpm migrate:scrape` · `pnpm migrate:fetch` (needs BEEHIIV_API_KEY in .env.local) · `pnpm migrate:convert`

## Rules

1. TDD. Failing test first.
2. Never change a published post's slug. Never remove an entry from migration/legacy-urls.json.
3. All internal links via `url()` in src/lib/urls.ts.
4. Behavior change ⇒ update docs/ in the same PR.
5. Zero client JS unless justified in docs/DECISIONS.md.
6. Do not edit the author's prose without being asked. Fix typos only when asked.
7. Conventional Commits; open draft PRs; never push to main; never merge your own PR.
8. Never commit secrets (.env*, BEEHIIV_API_KEY). Never change DNS, Pages settings, or email subscribers — owner only.
9. Structured data must match visible content.
10. Run `pnpm check` before declaring done.
11. Post bodies keep root-relative links (`/p/x/`); the remark-base-links plugin adds the base path.

## Layout

- src/content/posts/\<slug\>/index.mdx — posts
- src/pages, src/lib, src/components — routes, helpers, UI
- integrations/ — Astro integrations
- migration/ — Beehiiv import pipeline (legacy-urls.json is append-only)
- scripts/ — build, validation and release tooling
- tests/{unit,e2e,visual} — test suites
- docs/ — specs, runbook, audits
- infra/newsletter/ — newsletter infrastructure
- email/ — email templates

## Facts

- Release checklist: docs/RUNBOOK.md.
- `tsx scripts/check-content.ts` blocks TODO(owner) in non-draft posts.
- Migrated posts are `aeoPending: true` until reviewed.
- Newsletter provider is Kit (free plan), set via `PUBLIC_NEWSLETTER_PROVIDER=kit` + `PUBLIC_NEWSLETTER_ID` (ADR-028). listmonk + SES (infra/newsletter/) is deferred until ~10,000 subscribers; Beehiiv is decommissioned. Kit free has no post-to-email automation, so the owner pastes each broadcast from the post's `/p/<slug>.md` twin.
- UI is the "serene" theme (ADR-027): calm mint/sage/sky palette, system fonts, no Tailwind. Every template must work from 320px to 1440px+ with zero horizontal overflow and tap targets of at least 44px (ADR-029).
