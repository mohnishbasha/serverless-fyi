# Sprint gate status

This tracks every gate in PROMPT.md §17. Legend: ✅ done and verified locally · 👤 owner action · ⏳ needs the GitHub repo or live infrastructure (it can't be verified from a local checkout).

Last updated: 2026-10-27. Local verification: `pnpm check`, `pnpm test:e2e` (133 passed), Lighthouse CI and lychee all green.

## Gate 0 — Specs

- ✅ Five spec docs, plus DECISIONS (ADR-001 to ADR-026), RUNBOOK and STYLE_GUIDE.
- ✅ Every ADR has a decision. ADR-002 (public repo), ADR-010 (content license) and ADR-020 (tag overrides) are marked "owner to confirm".
- 👤 Owner approves the PRD (merge the PR).
- ⏳ Tag `sprint-0`.

## Gate 1 — Scaffold, tooling, CI, agent files

- ✅ `pnpm check` green (lint, typecheck, 115 unit tests, build, validate).
- ✅ All §15 agent and harness files and all §16 supporting files exist.
- ✅ Branch protection and repo settings are documented in RUNBOOK.
- ⏳ CI green on a PR.
- ⏳ Staging deploy with `BASE_PATH=/serverless-fyi/` and smoke on staging. A local staging build validates and `scripts/smoke.sh` passes against the Pages emulator.
- ⏳ Tag `v0.1.0`.

## Gate 2 — Migration

- ✅ Post count equals the Beehiiv published count (23 of 23; sitemap and archive cross-checked).
- ✅ 0 remote Beehiiv images (asserted by `localize-images.ts` and `validate-dist`).
- ✅ Parity validator at 100% (63 of 63 legacy URLs, 14 via redirect stubs).
- 👤 Owner reviews `migration/report.md`: 10 composed descriptions, 8 tag overrides, empty-alt images, cover alt text.
- 👤 Subscriber CSV exported from Beehiiv and stored privately, never in the repo.
- ⏳ Tag `v0.2.0`.

## Gate 3 — Templates and responsive design

- ✅ E2E green on 4 viewports (desktop, iPhone 15, Pixel 7, 320 px) plus no-JS.
- ✅ No overflow at 320 px on every template.
- ✅ axe: 0 violations in light and dark mode on 10 templates.
- ✅ Visual snapshots committed (24, rendered on Linux).
- ⏳ Tag `v0.3.0`.

## Gate 4 — SEO, AEO, agent-readiness

- ✅ `validate-seo`: 0 errors across 55 pages.
- ✅ Feeds valid (24 feeds, 121 items).
- ✅ Lighthouse on 4 templates (mobile): 100 / 100 / 100 / 100.
- 👤 Rich Results Test on 3 sample posts against the staging URL, with screenshots in the PR.
- ⏳ Tag `v0.4.0`.

## Gate 5 — Newsletter

- ✅ The form works with JS on and off: e2e mocks the network; the no-JS project checks the plain form.
- ✅ The privacy page names the email provider (derived from `PUBLIC_NEWSLETTER_PROVIDER`).
- 👤 A real test subscription succeeds on staging (Beehiiv magic link, ADR-025).
- ⏳ Tag `v0.5.0`.

## Gate 6 — Hardening

- ✅ Link check clean offline (internal links and anchors). The external check runs weekly.
- ✅ CONTRIBUTING, THIRD_PARTY_LICENSES and CHANGELOG are complete.
- ✅ `pnpm audit --prod` runs in CI (`licenses` job).
- 👤 RUNBOOK rehearsed: rollback dry run on staging.
- ⏳ Every CI job green on GitHub. Tag `v0.9.0`.

## Gate 7 — Cutover (§14)

- 👤 DNS (copy the current Beehiiv records into RUNBOOK first), Pages custom domain and verified domain, Enforce HTTPS.
- 👤 Disconnect web hosting only in Beehiiv.
- ⏳ Production smoke, live parity (`pnpm exec tsx scripts/validate-parity.ts --live https://www.serverless.fyi`), apex → www, sitemap submitted, subscribe form still feeds the interim list. Tag `v1.0.0`.

## Gate 8 — Post-launch

- ✅ "We moved" post drafted at `src/content/posts/we-moved-2-minute-serverless-now-runs-on-github-pages/`. It is `draft: true`, with `TODO(owner)` markers for your reasons and timeline.
- 👤 Indexed pages ≥ pre-migration (GSC), no open `incident` issues, retro written in `docs/`.

## Gate 9 — Self-hosted newsletter (listmonk + SES)

- ✅ `infra/newsletter/`: Compose (Postgres 17, listmonk v6.2.0, Caddy, backups), Caddyfile, Terraform (SES identity, DKIM, MAIL FROM, SNS bounces, KMS-encrypted S3 backups, least-privilege IAM, optional Lightsail). `terraform validate`, `docker compose config` and `caddy validate` all pass.
- ✅ Draft-campaign workflow plus `email/template.html` (never sends). Adapter unit tests for `listmonk`.
- 👤 Request SES production access, apply Terraform, add DNS, import subscribers, run the test sends, warm up in batches. Add the physical mailing address to `email/template.html`.
- ⏳ Gate items for the end-to-end test bounce, backup restore, first full send, `PUBLIC_NEWSLETTER_PROVIDER=listmonk` live, and tag `v1.1.0`.

## Gate 10 — Decommission Beehiiv

- 👤 Every item: final exports, 30–60-day paused rollback window, DNS clean-up, cancellation. After that, remove the `beehiiv` adapter branch (or keep it behind its unit test), record it in DECISIONS, and tag `v1.2.0`.
