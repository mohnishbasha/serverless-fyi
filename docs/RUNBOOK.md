# Runbook

Operational procedures for serverless.fyi. 👤 marks an action only the owner can do (DNS, repo settings, Beehiiv, subscribers, AWS). Agents must not perform 👤 steps.

Quick facts:

|            |                                                                                                                                           |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Production | `https://www.serverless.fyi` (apex redirects to www)                                                                                      |
| Staging    | `https://mohnishbasha.github.io/serverless-fyi/` (`BASE_PATH=/serverless-fyi/`, `PUBLIC_INDEXABLE=false`)                                 |
| Repo       | `github.com/mohnishbasha/serverless-fyi`                                                                                                  |
| Deploy     | merge to `main` runs `deploy.yml` (build, validate, upload, deploy, smoke)                                                                |
| Smoke      | `scripts/smoke.sh <base_url>`, also scheduled every 6 hours (`smoke.yml`; target = var `SMOKE_URL`, default `https://www.serverless.fyi`) |
| Incidents  | GitHub issues labeled `incident`                                                                                                          |

## 1. Publish a post

Target: merge to live in under 5 minutes.

1. Branch: `git checkout -b content/<slug>`.
2. Scaffold: `pnpm new-post "Title"` creates `src/content/posts/<slug>/index.mdx`.
3. Fill frontmatter (see `docs/STYLE_GUIDE.md`): `title`, `description` (70 to 160), `pubDate`, `tags` (existing tags first), `cover` + `coverAlt`, `tldr`, `keyTakeaways` (at least 2), optional `faq`.
4. Write the body (answer-first, starts at H2). Put images in the post folder.
5. Preview: `pnpm dev`, then open `/p/<slug>/` and `/p/<slug>.md`.
6. `pnpm check` (lint, typecheck, unit, build, validate). Fix everything. `pnpm validate` runs `check-content.ts` (TODO(owner) guard, slug equals folder, cover warning), parity, SEO, feeds, `validate-dist.ts` and html-validate.
7. Commit with Conventional Commits: `content(post): <title>`.
8. Open a PR. Fill the PR template. CI runs `verify`, `e2e`, `lighthouse`, `spec-touch`, `commitlint`.
9. Get approval and squash-merge.
10. Watch Actions: Deploy, then Smoke. Confirm the post at the live URL; confirm it is in `/rss.xml`, `/llms.txt`, and `sitemap-0.xml`.
11. `indexnow.yml` runs automatically after a successful deploy (only when `PUBLIC_INDEXABLE=true`). Optionally request indexing in Search Console.
12. Newsletter: Phase A (now): create a Kit broadcast by hand and send it (section 10.1). Phase B (future): `newsletter-draft.yml` creates a draft campaign in listmonk; review and send (section 10.2).

Scheduling: set `pubDate` in the future and `draft: true`; to publish, flip `draft` to `false` and set the date in a PR. Future-dated non-draft posts fail CI.

Updating a post: edit and set `updatedDate`; never change `slug`.

## 2. Verify a deploy

```bash
gh run list --workflow deploy.yml --limit 3
bash scripts/smoke.sh https://www.serverless.fyi
gh api repos/mohnishbasha/serverless-fyi/pages/builds/latest
```

`dist/` can be inspected locally the way Pages serves it: `pnpm build && node scripts/serve-dist.mjs 4399` (GitHub Pages emulator: honors `BASE_PATH`, 301 to the trailing slash, `404.html` with status 404). Playwright and Lighthouse CI use the same server, because `astro preview` daemonizes in Astro 7.

Check `/robots.txt` has `Allow: /`, the canonical on the home page is the production origin, and `/` returns 200 over HTTPS.

## 3. Roll back a deploy

Pick the fastest option that matches the situation. Content or code regression on `main`:

### Option A: re-run the previous successful deploy (fastest, no code change)

1. `gh run list --workflow deploy.yml --status success --limit 5`.
2. Open the last good run, **Re-run all jobs**. (This rebuilds that commit's code and redeploys it, because the workflow checks out the run's commit.)
3. Verify with section 2.
4. `main` still contains the bad commit. Any later merge redeploys it. Immediately do Option B.

### Option B: revert PR (the durable fix)

1. `git checkout main && git pull`.
2. `git checkout -b fix/revert-<short-sha>`.
3. `git revert <bad-sha>` (use `-m 1` only for merge commits; the repo uses squash merges so this is normally not needed).
4. Push, open a PR titled `revert: <original subject>`, wait for CI, get approval, squash-merge.
5. Verify the deploy and smoke.

### Option C: take the site offline in an emergency 👤

Repo Settings, Pages, unpublish site. Use only for harmful content or a leaked secret. Then fix and redeploy. Search engines will see errors; restore quickly.

### Staging rehearsal (Sprint 6 gate)

On staging, merge a deliberately broken change (for example a bad canonical), see smoke fail, perform Option A, then Option B. Record timings in the PR.

## 4. Fix a broken deploy

| Symptom                                         | Likely cause                                                    | Fix                                                                                                                                                |
| ----------------------------------------------- | --------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `build` fails on content                        | zod schema error (description length, missing `coverAlt`, tags) | Read the error, fix frontmatter.                                                                                                                   |
| `pnpm validate` fails: parity                   | A legacy URL missing                                            | Run `pnpm validate` locally; add the page or restore the slug. Never remove a manifest entry.                                                      |
| validate-seo: duplicate title/description       | Two posts share a title                                         | Make unique.                                                                                                                                       |
| `TODO(owner)` found                             | Unfilled TL;DR/takeaways                                        | Fill them or set `aeoPending: true`.                                                                                                               |
| Guard step: `CNAME`/robots                      | `PUBLIC_INDEXABLE` variable wrong                               | Fix repo variables (section 6 of this doc, repo settings).                                                                                         |
| Deploy job stuck / 404 on site after deploy     | Pages source not set to GitHub Actions; environment protection  | Settings, Pages, Source = GitHub Actions. Environment `github-pages` allows `main`.                                                                |
| Custom domain lost after deploy                 | `CNAME` not emitted                                             | Ensure `PUBLIC_INDEXABLE=true`; the build generates `CNAME`. Re-enter the domain in Pages settings 👤.                                             |
| HTTPS cert error                                | DNS wrong or Cloudflare proxied                                 | Records in section 9 must be DNS-only until the cert is issued.                                                                                    |
| Smoke fails right after deploy                  | CDN propagation                                                 | Re-run smoke after 5 minutes.                                                                                                                      |
| Smoke fails on `http://serverless.fyi` redirect | Apex records missing or Enforce HTTPS off                       | Check A/AAAA records 👤 and Enforce HTTPS.                                                                                                         |
| Broken assets on staging                        | Root-relative link bypassed `url()`                             | Fix link; `validate-dist.ts` and the lint rule should have caught it. Add a test.                                                                  |
| Visual snapshot diff in CI                      | Intentional UI change, or snapshots rendered on macOS           | Snapshots are Linux-only. Run `bash scripts/update-snapshots.sh` (Docker, after `pnpm build`) or label the PR `update-snapshots`; review the diff. |
| Pagefind missing                                | Integration did not run                                         | Check build log order: Pagefind runs after build on `dist/`.                                                                                       |
| CI cache or pnpm errors                         | Lockfile drift                                                  | `pnpm install --frozen-lockfile` locally; commit the lockfile.                                                                                     |

General method: `gh run view <id> --log-failed`, reproduce locally with the same env (`SITE_URL`, `BASE_PATH`, `PUBLIC_INDEXABLE`), write a failing test if it is a code bug, fix, push.

An open `incident` issue means the scheduled smoke is failing. Fix the cause, confirm green, close the issue.

## 5. Rotate secrets

The site needs no secrets for deploy (Pages OIDC). Secrets that exist:

| Secret                                     | Where                          | Rotation                                                                                                                    |
| ------------------------------------------ | ------------------------------ | --------------------------------------------------------------------------------------------------------------------------- |
| `BEEHIIV_API_KEY`                          | owner `.env.local` only        | Beehiiv dashboard, Settings, Integrations, API: create new, revoke old. Revoke when Beehiiv is cancelled.                   |
| listmonk admin password and API user token | AWS Secrets Manager            | Rotate in listmonk UI; update Secrets Manager; update GitHub secret `LISTMONK_API_TOKEN` used by the draft-campaign Action. |
| SES SMTP credentials / IAM access keys     | AWS IAM, Secrets Manager       | Create a new IAM key, update listmonk SMTP settings, verify a test send, delete the old key. Rotate every 90 days.          |
| SNS bounce webhook secret/basic auth       | listmonk + SNS subscription    | Update both; test with an SES simulator address.                                                                            |
| `INDEXNOW_KEY`                             | public file `public/<key>.txt` | Generate new key, add new file, update repo variable, deploy, then remove old file.                                         |
| `LISTMONK_API_USER`, `LISTMONK_API_TOKEN`  | GitHub secrets (Phase B)       | Used by `newsletter-draft.yml`; also set variables `PUBLIC_NEWSLETTER_URL` and `LISTMONK_LIST_ID`.                          |
| Cloudflare analytics token                 | repo variable (public)         | Not secret; regenerate in Cloudflare if needed.                                                                             |

If a secret is committed: revoke it first, then remove it from history only if necessary (history rewrite on `main` is forbidden; prefer revocation). Secret scanning and push protection are enabled (section 8).

Check expiry: `public/.well-known/security.txt` `Expires` (currently 2027-10-26) is renewed yearly; `validate-dist.ts` fails the build when it is missing or within 30 days.

Third-party licenses: `pnpm licenses:gen` (not `pnpm licenses`) regenerates `THIRD_PARTY_LICENSES.md`; CI fails on a diff and runs `pnpm audit --prod --audit-level high`.

## 6. Release checklist (versioning, Prompt §13)

SemVer on the codebase; content-only changes do not bump the version.

1. CI is green on `main`.
2. Create `chore/release-vX.Y.Z`.
3. Bump `package.json` `version` and `src/lib/site.ts` `SITE_VERSION`.
4. Move `[Unreleased]` in `CHANGELOG.md` to `## [X.Y.Z] - YYYY-MM-DD` (Added/Changed/Fixed/Removed/Security).
5. `bash scripts/check-versions.sh` must print `versions consistent`.
6. Commit `chore(release): vX.Y.Z`; open PR; merge when green.
7. `git checkout main && git pull`.
8. `git tag -a vX.Y.Z -m "<summary>"` (annotated). Sprint gates use lightweight `sprint-N` tags.
9. `git push origin vX.Y.Z` 👤 (agents print commands; the owner pushes tags).
10. `release.yml` verifies versions, extracts the CHANGELOG section, creates the GitHub Release.
11. Verify smoke and Release page.

Milestones: v0.1.0 scaffold + CI, v0.2.0 migrated content, v0.3.0 templates, v0.4.0 SEO/AEO, v0.5.0 newsletter, v0.9.0 staging RC, **v1.0.0 production cutover**, v1.1.0 listmonk live (future, before ~10k subscribers), v1.2.0 Beehiiv decommissioned (can ship now).

## 7. Repo settings to apply 👤 (Prompt §11.5)

Apply once, verify after any repo transfer.

1. **Branch protection on `main`:** require pull request; 1 approval (CODEOWNERS = @mohnishbasha, so agent PRs need the human); required status checks `verify`, `e2e`, `lighthouse`, `spec-touch`, `commitlint`; require linear history; squash merge only (disable merge commits and rebase); auto-delete head branches; no force pushes; no deletions; require conversation resolution; do not allow bypass.
2. **Environments:** `github-pages` restricted to `main`.
3. **Pages:** Settings, Pages, Source = **GitHub Actions**.
4. **Actions variables** (Settings, Secrets and variables, Actions, Variables): `SITE_URL`, `BASE_PATH`, `PUBLIC_INDEXABLE`, `PUBLIC_NEWSLETTER_PROVIDER`, `PUBLIC_NEWSLETTER_ID`, `PUBLIC_NEWSLETTER_URL`, `PUBLIC_CF_ANALYTICS_TOKEN`, `INDEXNOW_KEY`, optional `SMOKE_URL`. CI builds with provider `kit` and a placeholder form id (ADR-028).

   | Variable                     | Staging                          | Production                                   |
   | ---------------------------- | -------------------------------- | -------------------------------------------- |
   | `SITE_URL`                   | `https://mohnishbasha.github.io` | `https://www.serverless.fyi`                 |
   | `BASE_PATH`                  | `/serverless-fyi/`               | `/`                                          |
   | `PUBLIC_INDEXABLE`           | `false`                          | `true`                                       |
   | `PUBLIC_NEWSLETTER_PROVIDER` | `kit` or `none`                  | `kit` (Phase A), `listmonk` (Phase B)        |
   | `PUBLIC_NEWSLETTER_ID`       | Kit form id                      | Kit form id, or listmonk list UUID           |
   | `PUBLIC_NEWSLETTER_URL`      | unset                            | optional Kit host (A), listmonk base URL (B) |

   Providers: `kit`, `listmonk`, `buttondown`, `beehiiv` (legacy), `none`.

5. **Secrets:** none required for deploy. `BEEHIIV_API_KEY` stays local. Add `LISTMONK_API_TOKEN` only in Phase B.
6. **Security:** enable secret scanning + push protection, Dependabot alerts and security updates, private vulnerability reporting, CodeQL default setup (or `codeql.yml`).
7. **Actions permissions:** workflow default permissions read-only; allow actions pinned by SHA; require approval for first-time contributors' workflows.
8. **Labels:** `content`, `infra`, `design`, `migration`, `incident`, `no-spec-change`, `update-snapshots`, `perf`.

## 8. Cutover (Prompt §14, Sprint 7)

Steps in order. 👤 = owner. Do not skip. Do not start until Gate 6 is green and `docs/PRD.md` records the pre-migration indexed page count from Search Console.

1. Staging is live at `https://mohnishbasha.github.io/serverless-fyi/` with `PUBLIC_INDEXABLE=false`. Full test suite and smoke are green against staging.
2. 👤 Content review: sign off `migration/report.md`; spot-check 10 posts side by side with Beehiiv (23 posts total in the inventory).
3. 👤 Newsletter Phase A (Kit; do section 10.1 first and verify one real subscription on staging): confirm the subscriber export is backed up outside the repo; set `PUBLIC_NEWSLETTER_PROVIDER=kit` and `PUBLIC_NEWSLETTER_ID` so the new form feeds the Kit list.
4. 👤 Search Console: confirm the **Domain property** `serverless.fyi` is verified by DNS TXT (before touching DNS). Import to Bing Webmaster.
5. 👤 **Record current Beehiiv DNS records** into section 9 below (before any change). Gate: the placeholders must be replaced.
6. 👤 Lower TTL on `www` and apex to 300 s, 24 hours before cutover.
7. Flip repo variables: `SITE_URL=https://www.serverless.fyi`, `BASE_PATH=/`, `PUBLIC_INDEXABLE=true`; run the deploy (build emits `CNAME`).
8. 👤 Settings, Pages, Custom domain = `www.serverless.fyi`; verify the domain for the account (Settings, Pages, Verified domains) to prevent takeover.
9. 👤 DNS at the registrar/Cloudflare (if Cloudflare, **DNS only / grey cloud** until the certificate is issued):
   - `www` CNAME to `mohnishbasha.github.io`
   - apex `serverless.fyi` A: `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`
   - apex AAAA: `2606:50c0:8000::153`, `2606:50c0:8001::153`, `2606:50c0:8002::153`, `2606:50c0:8003::153`
   - Remove the Beehiiv web-hosting records. Beehiiv email-sending records are no longer needed once Kit is verified (section 10.1).
10. 👤 Wait for the TLS certificate (can take up to an hour); then tick **Enforce HTTPS**.
11. 👤 In Beehiiv, disconnect the custom domain from **web hosting only**. If Kit is not yet verified, keep the publication and email DNS records until it is; otherwise follow section 11.
12. Run `smoke.yml` (workflow_dispatch, production). Run `pnpm exec tsx scripts/validate-parity.ts --live` and require 100 percent.
13. 👤 Submit `https://www.serverless.fyi/sitemap-index.xml` in Search Console and Bing. Run `indexnow.yml` manually (workflow_dispatch) with `all: true` once to ping every sitemap URL.
14. Tag `v1.0.0` (section 6). Monitor GSC Pages and Core Web Vitals, 404s, and `incident` issues for 14 days. Scheduled smoke continues.

Gate 7: production smoke green, live parity 100 percent, HTTPS enforced, apex to www, sitemap submitted, subscribe form feeding the Kit list, tag `v1.0.0`.

### 8.1 Cutover rollback

If production is broken and cannot be fixed within the TTL window:

1. 👤 Re-point DNS to the Beehiiv records in section 9 (TTL 300 s, so minutes).
2. 👤 In Beehiiv, reconnect the custom domain for web hosting.
3. 👤 Remove the custom domain in GitHub Pages settings (or leave it; it will fail verification).
4. Investigate on staging. Retry cutover.

## 9. DNS rollback record (owner must fill before cutover) 👤

Do not start cutover until every placeholder is replaced with the real value copied from the registrar/Cloudflare DNS zone for `serverless.fyi` and from Beehiiv Settings, Domain. Paste exports (for example `dig` output or a zone export) below. Do not paste secrets.

Captured on: `<YYYY-MM-DD>` by `<owner>` from `<registrar / Cloudflare>`.

| Name       | Type                  | Value                              | TTL     | Purpose                                                     |
| ---------- | --------------------- | ---------------------------------- | ------- | ----------------------------------------------------------- |
| `www`      | `<CNAME or A>`        | `<PASTE CURRENT BEEHIIV VALUE>`    | `<ttl>` | Beehiiv web hosting                                         |
| `@` (apex) | `<A / ALIAS / CNAME>` | `<PASTE CURRENT BEEHIIV VALUE(S)>` | `<ttl>` | Beehiiv apex or redirect                                    |
| `<PASTE>`  | `<TXT/CNAME>`         | `<PASTE>`                          | `<ttl>` | Beehiiv domain verification                                 |
| `<PASTE>`  | `<CNAME>`             | `<PASTE>`                          | `<ttl>` | Beehiiv email sending (DKIM/return-path)                    |
| `<PASTE>`  | `<TXT>`               | `<PASTE>`                          | `<ttl>` | SPF                                                         |
| `<PASTE>`  | `<TXT>`               | `<PASTE>`                          | `<ttl>` | DMARC (current policy)                                      |
| `<PASTE>`  | `<MX>`                | `<PASTE>`                          | `<ttl>` | Mail (for example inbound mail at the domain; do not break) |
| `<PASTE>`  | `<TXT>`               | `<PASTE>`                          | `<ttl>` | Search Console verification (keep)                          |

Raw `dig` output (paste):

```text
<dig +noall +answer www.serverless.fyi>
<dig +noall +answer serverless.fyi A>
<dig +noall +answer serverless.fyi TXT>
<dig +noall +answer serverless.fyi MX>
```

## 10. Newsletter operations

### 10.1 Phase A (Kit free plan, current)

Kit's free "Newsletter" plan is $0 up to 10,000 subscribers with unlimited broadcasts, forms and tagging. Limits: one basic visual automation, no email sequences, no A/B testing, no third-party integrations, Kit branding on emails. RSS-to-email is a paid feature, so there is no automatic post-to-email (ADR-028).

**Set up Kit** 👤

1. Export the Beehiiv subscriber CSV with signup dates. Keep it private, never in the repo.
2. Create a Kit free account.
3. Import the CSV as confirmed subscribers (these people already opted in; keep signup dates as consent evidence).
4. Create one form. Copy its id, and the host from the form's HTML embed code (usually `https://app.kit.com`).
5. Authenticate the sending domain `serverless.fyi` with Kit's DNS wizard and add DMARC (records below). Confirm the free plan allows domain authentication.
6. Set repo variables `PUBLIC_NEWSLETTER_PROVIDER=kit` and `PUBLIC_NEWSLETTER_ID=<form id>` (and `PUBLIC_NEWSLETTER_URL=<host>` only if the host is not `https://app.kit.com`). Redeploy and verify one real subscription on the live form.
7. Send a test broadcast to yourself; in Gmail, "Show original" must show SPF, DKIM and DMARC PASS.
8. Then cancel Beehiiv (section 11).

**DNS records for Kit** 👤

Kit's DNS wizard shows the exact values; copy them into the zone. Do not guess them.

| Name              | Type  | Value                                  | Purpose                                  |
| ----------------- | ----- | -------------------------------------- | ---------------------------------------- |
| from Kit's wizard | CNAME | from Kit's wizard                      | DKIM                                     |
| from Kit's wizard | TXT   | from Kit's wizard (SPF include)        | SPF (merge into any existing SPF record) |
| `_dmarc`          | TXT   | `v=DMARC1; p=none; rua=mailto:<owner>` | DMARC, monitor only                      |

Send from `newsletter@serverless.fyi`. Keep only one SPF TXT record per name. Move DMARC to `quarantine` only after 30 clean days.

**Send an issue**

1. Merge the post and confirm it is live.
2. In Kit, Broadcasts, New broadcast. Paste the body from the post's `/p/<slug>.md` twin; link back to `https://www.serverless.fyi/p/<slug>/`. Images must use absolute URLs on the new site.
3. Send a test to yourself and check subject, preheader, links and the unsubscribe link.
4. Send or schedule. Check bounce and complaint rates in Kit afterward.

`newsletter-draft.yml` does nothing in this phase; it runs only when the provider is `listmonk`.

Keep the subscriber export current: export from Kit before the Phase B migration.

### 10.2 Phase B (listmonk + SES; future, before ~10,000 subscribers)

Migrate before the list reaches about 10,000 subscribers, when Kit's free plan ends (Kit Creator is about $139/month at 10k and $679/month at 100k; listmonk + SES is about $11/month at 10k). Gate 9 covers this work.

Hosts: listmonk at `https://lists.serverless.fyi` in `infra/newsletter/` (Docker Compose: PostgreSQL 17, listmonk v6.2.0, Caddy, backup; Terraform for SES, SNS, S3, KMS, IAM and an optional Lightsail host). The Caddyfile allowlists `/admin` and `/api` (except `/api/public`) by IP and exposes only the SES webhook and `POST /api/campaigns`. Admin also needs a strong password.

👤 Before Phase B: `email/template.html` contains `TODO(owner): physical mailing address (required by CAN-SPAM)`. Replace it; no campaign may be sent until it is gone.

**Send an issue**

1. Merge the post. After a successful deploy, `newsletter-draft.yml` (runs only when `PUBLIC_NEWSLETTER_PROVIDER=listmonk`) runs `scripts/newsletter-draft.ts` and creates a **draft campaign** in listmonk for each newly added post, using `email/template.html`. It never sends.
2. 👤 Open listmonk, Campaigns, open the draft. Check subject, preheader, links (absolute, to `www.serverless.fyi`), images (absolute URLs to the new site, not Beehiiv), unsubscribe link present.
3. Send a test to yourself; view in Gmail, Outlook, Apple Mail. In Gmail, "Show original" must show SPF, DKIM, DMARC all PASS and `List-Unsubscribe` with `List-Unsubscribe-Post: List-Unsubscribe=One-Click`.
4. Schedule or send. For the first sends after migration, batch: 25 percent, then 50, then 100 across three issues (use a segment or list-percentage), watching rates.
5. Monitor in the first hour: bounce rate under 2 percent, complaint rate under 0.1 percent (SES console, Reputation dashboard).
6. Record the send in a GitHub issue or the CHANGELOG-free ops log.

**Restore pg backup**

Backups: nightly `pg_dump` to a versioned, encrypted S3 bucket, 30-day retention; monthly restore test.

1. Provision a fresh host or use a local Docker Postgres for a test.
2. List objects: `aws s3 ls s3://<backup-bucket>/listmonk/ --recursive | tail`.
3. Download the target dump: `aws s3 cp s3://<backup-bucket>/listmonk/<file>.sql.gz .`.
4. Restore: `gunzip -c <file>.sql.gz | docker compose exec -T db psql -U listmonk -d listmonk`. For a fresh DB, create the database first and stop the listmonk container during restore.
5. Start listmonk. Verify subscriber count against the last known number, a sample of subscribers, lists, templates and campaigns.
6. Re-point DNS only if the host changed. Confirm bounce webhook (SNS subscription endpoint) still reaches the new host.
7. Log the restore date and result. A successful monthly restore test is a Sprint 9 gate item.

**Handle a complaint or bounce spike**

Thresholds: bounce > 2 percent or complaints > 0.1 percent on a send. SES may pause sending at about 5 percent bounce and 0.5 percent complaints, so act early.

1. Pause scheduled campaigns in listmonk. Do not send again until resolved.
2. In SES, Reputation dashboard: confirm which campaign and which domains.
3. Check the bounce webhook is working: hard bounces and complaints must be blocklisted. List recent bounces in listmonk, Subscribers, Bounces; blocklist anything not auto-blocked.
4. Look at the cause: stale addresses (old Beehiiv list not cleaned), unsolicited import, content flagged as spam, missing unsubscribe, wrong From.
5. Segment: send next only to engaged subscribers (opened or clicked in the last 90 days) or those confirmed recently.
6. If complaints came from the import, send a re-permission email only to inactive addresses, and remove non-responders.
7. Verify DMARC alignment and DKIM still pass. Move DMARC from `p=none` to `quarantine` only after 30 clean days.
8. If SES paused the account, open an SES support case with the remediation plan.
9. Write an incident note in the repo (`docs/audits/` or an issue labeled `incident`) with cause and fix.

## 11. Beehiiv decommission (Sprint 10, can run now) 👤

Gate: Kit is live (subscribers imported, domain authenticated, test broadcast received). No longer waits for listmonk.

1. 👤 Final exports, stored privately (not in the repo): subscribers with signup timestamps (already imported into Kit), per-post stats and open/click history, raw post JSON.
2. 👤 Optionally pause the Beehiiv publication (no sends) for a short rollback window.
3. 👤 Remove every remaining Beehiiv DNS record (web and email). Confirm with `dig` that only GitHub Pages and Kit records remain.
4. 👤 Cancel the Beehiiv paid plan. After the rollback window, delete the publication.
5. The `beehiiv` provider code stays in the adapter for now; removal is tracked for decommission. Remove it (or keep it behind a test and record it in `docs/DECISIONS.md`). `grep -ri beehiiv` over the repo and `dist/`: only migration provenance fields and docs may mention it.
6. Run smoke and parity; both stay green.
7. Tag `v1.2.0`.

**Known side effect:** emails already in subscribers' inboxes load images from Beehiiv's servers. After the publication is deleted (and possibly after the plan lapses) those images will show as broken in old emails. The web archive on serverless.fyi is unaffected because images are localized in the repo. Mitigations: keep the publication paused rather than deleted as long as is tolerable; accept the loss for old issues; do not promise old emails will stay intact. If a specific old issue matters, link readers to its page on the website.

## 12. Search Console monitoring after cutover

Daily for 14 days: Pages report (indexed count vs pre-migration), 404 (Not found) list, Core Web Vitals. For each unexpected 404 that is a legitimate legacy URL, ask the owner to approve a new manifest entry (agents cannot edit `legacy-urls.json`), then ship it. Gate 8: indexed pages at or above pre-migration; no open `incident` issues; retro written in `docs/`.
