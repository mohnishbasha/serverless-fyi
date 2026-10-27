# Test Plan

Status: source of truth for what is tested, with which tool, at what threshold, and when it runs. TDD is mandatory: write the failing test, run it and see it fail, implement, see it pass, refactor. Content-migration behavior is tested the same way (fixtures in, expected Markdown out).

Related: `docs/SEO_AEO.md` (what the validators assert), `docs/CONTENT_MIGRATION.md`, `docs/RUNBOOK.md`.

## 1. Test pyramid

```text
                 /\
                /  \   Scheduled / post-deploy: smoke.sh (every 6 h), weekly external links
               /----\
              /      \ E2E + a11y + visual + Lighthouse (Playwright, axe, LHCI) on dist/ via scripts/serve-dist.mjs
             /--------\
            /          \ Build-output validators: parity, SEO/JSON-LD, feeds, html-validate,
           /            \ internal links (lychee --offline), asset sanity, sitemap sanity
          /--------------\
         /                \ Unit tests (Vitest): urls, seo, jsonld, tags, html-to-md golden,
        /                  \ redirect stubs, robots, llms, images, reading-time
       /--------------------\
      /______________________\ Static checks: typecheck, ESLint, Prettier, markdownlint, cspell,
                                 zod content schema (enforced by astro build)
```

Principle: push assertions down. A rule that can be asserted on the generated HTML (cheap, deterministic) must not require a browser. Browsers are for behavior (navigation, JS, viewport, rendering).

## 2. Where each suite runs

| Suite                                                                                  | PR (ci.yml)                              | Post-deploy (smoke.yml)                       | Scheduled                                   |
| -------------------------------------------------------------------------------------- | ---------------------------------------- | --------------------------------------------- | ------------------------------------------- |
| Static checks (section 3)                                                              | yes (`verify`)                           | no                                            | no                                          |
| Unit (section 4)                                                                       | yes (`verify`)                           | no                                            | no                                          |
| Build-output validators (section 5)                                                    | yes (`verify`) and again in deploy build | no                                            | no                                          |
| Internal link check (lychee offline)                                                   | yes (`verify`)                           | no                                            | no                                          |
| E2E, JS-disabled, overflow (section 6)                                                 | yes (`e2e`)                              | no                                            | no                                          |
| Accessibility (axe) (section 7)                                                        | yes (`e2e`)                              | no                                            | no                                          |
| Visual regression (section 8)                                                          | yes (`e2e`, Linux)                       | no                                            | no                                          |
| Lighthouse CI (section 9)                                                              | yes (`lighthouse`)                       | no                                            | no                                          |
| Content PR checks (section 10)                                                         | yes (`verify`, changed files)            | no                                            | no                                          |
| Spec-touch, commitlint                                                                 | yes (PR only)                            | no                                            | no                                          |
| Smoke (section 11)                                                                     | no                                       | yes, after every deploy                       | every 6 hours (`17 */6 * * *`; `SMOKE_URL`) |
| Live parity (`validate-parity.ts --live`)                                              | no                                       | manual: cutover and after any manifest change | not scheduled (backlog)                     |
| External link check (section 12)                                                       | no                                       | no                                            | weekly, Monday 09:00 UTC (`links.yml`)      |
| Dependency audit (`pnpm audit --prod --audit-level high`) and `pnpm licenses:gen` diff | yes (`licenses` job)                     | no                                            | weekly via Dependabot                       |
| CodeQL                                                                                 | yes                                      | no                                            | weekly default schedule                     |

Required status checks on `main`: `verify`, `e2e`, `lighthouse`, `spec-touch`, `commitlint`. The `licenses` job also runs on PRs.

Flake policy: a flaky test is a bug. Quarantine only with a linked issue and a due date. Playwright retries: 1 in CI, 0 locally. LHCI uses median of 3 runs.

## 3. Static checks

| Check           | Command                                                         | Proves                                                                                                                                      | Threshold                                                |
| --------------- | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| Types           | `pnpm typecheck` (`astro check && tsc --noEmit`)                | TS strict passes, content collections typed                                                                                                 | 0 errors, 0 warnings treated as errors for `astro check` |
| ESLint          | `eslint .` (flat config + `eslint-plugin-astro`)                | code quality; rule blocking string-literal root-relative `href`                                                                             | 0 errors                                                 |
| Prettier        | `prettier --check .`                                            | formatting                                                                                                                                  | clean                                                    |
| markdownlint    | `markdownlint-cli2` on `**/*.{md,mdx}`                          | Markdown structure (heading levels, code fences have language)                                                                              | 0 violations                                             |
| cspell          | on `src/**/*.{md,mdx,astro}`                                    | spelling; custom dictionary in `cspell.json` (Beehiiv, Jepsen, Pulsar, Flink, QSBS, PQCA, RTMP, listmonk, Pagefind)                         | 0 unknown words                                          |
| Content schema  | enforced inside `astro build` via zod (`src/content.config.ts`) | frontmatter validity: description 70 to 160, tags 1 to 6 kebab-case, `coverAlt` with `cover`, `tldr` and >= 2 takeaways unless `aeoPending` | build fails                                              |
| Vale (optional) | prose lint                                                      | style hints                                                                                                                                 | warnings only                                            |

## 4. Unit tests (Vitest, `tests/unit/`)

| File                        | Proves                                                                                                                                                                                                                                                                                                                                                                                    |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `urls.test.ts`              | `url()` respects `BASE_PATH`, always adds trailing slash (except file-like paths), never emits double slashes; `absoluteUrl()` combines `SITE_URL` + base.                                                                                                                                                                                                                                |
| `seo.test.ts`               | Title builder truncates the suffix not the title, <= 60 target; description bounds; canonical builder handles base path, `canonical` override and pagination.                                                                                                                                                                                                                             |
| `jsonld.test.ts`            | `BlogPosting`, `Person`, `Organization`, `WebSite` + `SearchAction`, `BreadcrumbList`, `CollectionPage`, `ItemList`, `ProfilePage`, `FAQPage` builders emit required props; `aeoPending` omits `abstract` and `FAQPage`; all URLs absolute.                                                                                                                                               |
| `tags.test.ts`              | `~` to `-` normalization; `tag-map.json` round trip; every manifest tag redirect resolves.                                                                                                                                                                                                                                                                                                |
| `reading-time.test.ts`      | Words per minute rule, rounding, minimum 1; TOC threshold 1,200 words.                                                                                                                                                                                                                                                                                                                    |
| `html-to-md.test.ts`        | Golden tests: every `migration/fixtures/*.html` converts to its `*.expected.md`. Covers code blocks and language detection, tables to GFM, embeds to MDX components, Beehiiv chrome stripping (subscribe widgets, "Powered by beehiiv", share bars, polls, tracking pixels, `utm_*`), button to link, internal link rewrite `https://www.serverless.fyi/p/x` to `/p/x/`, prose untouched. |
| `localize-images.test.ts`   | No remote Beehiiv image URL survives (grep assertion); Cloudflare `cdn-cgi/image/...` prefix stripped; hashed filenames; relative imports written.                                                                                                                                                                                                                                        |
| `migration.test.ts`         | Remix-page parsing, API normalization, sitemap parsing, manifest building (append-only, `~` tag stubs, account redirects), frontmatter rendering (`aeoPending`, YAML quoting). Includes `buildDescription` (ADR-018): Beehiiv meta if 70 to 160, else subtitle plus verbatim leading words, word-boundary truncation to <= 160, flagged in the report, never invented.                    |
| `redirect-stub.test.ts`     | Stub contains canonical, `noindex`, meta refresh, `location.replace` with hash; respects `BASE_PATH`; staging canonical uses staging origin; stubs excluded from sitemap filter.                                                                                                                                                                                                          |
| `robots.test.ts`            | Production output lists every AI crawler and the sitemap line; staging is disallow-all; flipping one crawler changes only its group.                                                                                                                                                                                                                                                      |
| `llms.test.ts`              | `llms.txt`: H1, blockquote, sections in order, every published post present, drafts absent, links point at `.md`; `llms-full.txt` under 5 MB and has per-post headers; `aeoPending` posts omit TL;DR.                                                                                                                                                                                     |
| `markdown.test.ts`          | Markdown twin and feed body conversion: relative images and root-relative links become absolute, embed components become plain links, MDX-only escapes removed, frontmatter-lite header and H1 on the twin, GFM rendered with absolute URLs only.                                                                                                                                         |
| `parity.test.ts`            | `checkParity`: passes for matching pages and stubs; fails for missing pages, wrong stub targets and missing targets; expects base-prefixed stub targets on staging.                                                                                                                                                                                                                       |
| `remark-base-links.test.ts` | Root-relative Markdown links get the configured base (ADR-022); absolute, fragment and relative links are untouched.                                                                                                                                                                                                                                                                      |
| `content-check.test.ts`     | `check-content.ts` rules: `TODO(owner)` guard, slug equals folder name, warning for missing cover.                                                                                                                                                                                                                                                                                        |
| `newsletter.test.ts`        | Provider adapter returns correct form config per provider (`kit`, `listmonk`, `buttondown`, `beehiiv`, `none`), including the Kit action `<host>/forms/<id>/subscriptions` and field `email_address`; no secrets in config.                                                                                                                                                               |
| `newsletter-draft.test.ts`  | Email rendering and listmonk draft-campaign payload (never a send).                                                                                                                                                                                                                                                                                                                       |
| `new-post.test.ts`          | `pnpm new-post` scaffolding: slug, frontmatter, folder.                                                                                                                                                                                                                                                                                                                                   |

Coverage: `vitest run --coverage` (v8) reports on `src/lib/**`, `migration/**/*.ts`, `integrations/**`, `scripts/lib/**`; no enforced threshold yet (target lines 90, branches 85). Components/pages are covered by validators and E2E, not unit coverage.

Backlog tests (planned, not written): feed builder unit tests (50-item cap, per-tag filtering; feeds are covered by `validate-feeds.ts` meanwhile), a `posts.schema.json` fixture test for `/api/posts.json`, a `serialize` unit test for sitemap `lastmod`, and a `smoke.sh` parser test against a local server. Their behavior is currently asserted by `validate-dist.ts`, `validate-feeds.ts` and the E2E suite.

## 5. Build-output validators (run against `dist/` after `pnpm build`)

Run via `pnpm validate`: `check-content.ts`, `validate-parity.ts`, `validate-seo.ts`, `validate-feeds.ts`, `validate-dist.ts`, `html-validate`, in that order. Lychee offline (`lychee.toml`, `include_fragments = "full"`) runs in the same CI job.

| Validator                                          | Proves                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | Fails when                                                                                                     |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `scripts/check-content.ts`                         | Content hygiene on `src/content/posts`: no `TODO(owner)` outside `aeoPending` posts, `slug` equals the folder name, warning when a post has no cover.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | Guard or slug violation.                                                                                       |
| `scripts/validate-parity.ts`                       | URL parity (the sacred rule). Each `migration/legacy-urls.json` entry has `dist/<path>/index.html`; for `redirect`, the stub targets `new` and `new` exists.                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | Any missing entry. 100 percent required. `--live` mode fetches the real site, follows redirects, requires 200. |
| `scripts/validate-seo.ts`                          | Per non-stub page: exactly one `<h1>`, unique `<title>`, unique description 70 to 160, absolute canonical matching path, OG and Twitter tags present, `og:image` file exists in `dist/`, JSON-LD parses with required props per type, `lang` set, no `noindex` on production except stubs/drafts/404. Also: `llms.txt`, `llms-full.txt` size, twins exist for every post, `/api/posts.json` schema, `aeoPending` rules, no `TODO(owner)` in production builds unless `aeoPending`.                                                                                                                                                    | Any violation.                                                                                                 |
| `scripts/validate-feeds.ts`                        | RSS, Atom, JSON Feed and per-tag feeds are well formed, required elements present, links and image src absolute, GUIDs unique.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | Any violation.                                                                                                 |
| `html-validate`                                    | `dist/**/*.html` is valid HTML (`.htmlvalidate.json`, extends `html-validate:recommended` + `prettier`).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | Any error.                                                                                                     |
| `lychee --offline --include-fragments --base dist` | Zero broken internal links and anchors.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | Any broken.                                                                                                    |
| `scripts/validate-dist.ts`                         | Asset sanity: no `dist/` file > 1 MB (except Pagefind assets and `llms-full.txt`); no Beehiiv media URL anywhere in `dist/`; `CNAME` only when `PUBLIC_INDEXABLE=true`. Sitemap sanity: sitemap URLs map to indexable pages and every indexable page is in the sitemap (no stubs, drafts, OG or `.md` URLs). Agent endpoints exist: `api/posts.json`, twins, `llms.txt`, `llms-full.txt` (coverage of every post). `robots.txt` per environment (staging disallow-all, no `CNAME`; production `Allow: /` and the sitemap line). `security.txt` `Expires` > 30 days away. On staging builds, no root-relative URL missing `BASE_PATH`. | Any violation.                                                                                                 |
| Budget (target, not yet automated)                 | Total CSS < 30 KB; JS on a post page < 30 KB (measured: about 3 KB of inline JS, post page 80 KB total).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | Reviewed with Lighthouse `resource-summary` (post <= 400 KB).                                                  |

Staging run: the same validators run in the deploy job with `BASE_PATH=/serverless-fyi/`, which is how base-path bugs are caught.

## 6. End-to-end (Playwright, `tests/e2e/`)

Runs against `node scripts/serve-dist.mjs <port>` (a GitHub Pages emulator: base path, 301 to the trailing slash, `404.html`), used because Astro 7 `astro preview` daemonizes and Playwright cannot manage it. Projects: `chromium-desktop` (1280x800), `mobile-safari` (iPhone 15), `pixel-7`, `narrow-320` (320 px, `overflow.spec.ts` only) and `no-js` (`nojs.spec.ts` only). Retries: 1 in CI.

Responsive matrix (ADR-029): every template must work from 320 px to 1440 px+ with zero horizontal overflow. The audited widths are 320, 375, 414, 768, 1024, 1280 and 1440. The e2e projects cover 1280 (`chromium-desktop`), iPhone 15, Pixel 7 and 320 (`narrow-320`), plus `no-js`; axe runs in light and dark, and Linux visual snapshots cover the layouts. Standalone links and controls (`.more-link`, `.link-list`) are at least 44 px tall, and the subscribe input and button are full width below 30rem.

| Test                                 | Proves                                                                                                                                                                                                                                          |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `home.spec.ts`                       | Latest posts render, nav works, skip link focuses `<main id="main">`.                                                                                                                                                                           |
| `post.spec.ts`                       | H1 equals frontmatter title; TL;DR visible (and hidden for an `aeoPending` fixture post); TOC links scroll to anchors on long posts; prev/next work; `.md` twin link returns text containing the title; FAQ visible when JSON-LD has `FAQPage`. |
| `listing.spec.ts`                    | Tag and archive pagination; `/archive/?page=2` redirects to `/archive/2/`.                                                                                                                                                                      |
| `legacy.spec.ts`                     | `/t/distributed~systems` lands on `/t/distributed-systems/`; `/authors/mohinish-s` lands on `/authors/`; `/login` lands on `/subscribe/`; hash preserved.                                                                                       |
| `404.spec.ts`                        | Unknown URL shows 404 content; legacy pattern fallback works (`/p/<slug>` without slash).                                                                                                                                                       |
| `subscribe.spec.ts`                  | Required validation, honeypot rejects bots, success and error states with mocked network (`page.route`). `provider=none` shows follow block.                                                                                                    |
| `theme.spec.ts`                      | Toggle persists across navigation; `data-theme` set before first paint (checked via early evaluation / init script).                                                                                                                            |
| `search.spec.ts`                     | `/search/` loads Pagefind lazily (no Pagefind request on first paint), returns results for a known term, `?q=term` pre-fills and searches (backs the `SearchAction`).                                                                           |
| `overflow.spec.ts`                   | At 320 px, `document.documentElement.scrollWidth <= innerWidth` on every template.                                                                                                                                                              |
| `nojs.spec.ts` (JS-disabled project) | Home, post, and subscribe form render and the form is a working `<form method="post">`.                                                                                                                                                         |
| Keyboard traversal                   | Tab order through header nav, search and subscribe (in `a11y.spec.ts`; skip link focus in `home.spec.ts`); WebKit skipped because it does not Tab to links by default.                                                                          |
| Staging base path                    | Not an E2E spec: `validate-dist.ts` fails a staging build with root-relative URLs lacking the base, and `integrations/remark-base-links.mjs` (unit-tested) prefixes post-body links. E2E can run against a staging build with `BASE_PATH` set.  |

## 7. Accessibility

- `@axe-core/playwright` on every template in `TEMPLATES` of `tests/e2e/helpers.ts` (home, post, tag, archive, authors, subscribe, tags, about, search, 404), in light and dark mode, tags `wcag2a, wcag2aa, wcag21a, wcag21aa, wcag22aa`. Threshold: zero violations. Incomplete results are reviewed in the report, not ignored.
- Contrast pairs are covered by axe; tokens are additionally unit-checked if a contrast helper is added.
- Keyboard-only traversal (section 6).
- `prefers-reduced-motion` is honored in CSS and emulated in visual snapshots; an explicit duration assertion is in the backlog.
- Manual (Sprint 6, owner or reviewer): screen reader pass on home and a post (VoiceOver), 200 percent zoom, 400 percent reflow at 320 px.

## 8. Visual regression

`tests/visual/templates.spec.ts`: `toHaveScreenshot` for home, post, tag, archive, authors and subscribe x (light, dark), in the `chromium-desktop` and `pixel-7` projects. Snapshots are committed in `tests/visual/__snapshots__/` (`{name}-{scheme}-{project}.png`). Settings: `maxDiffPixelRatio: 0.01`, animations disabled, reduced motion, system fonts, footer copyright line masked. The spec skips on non-Linux hosts (font rendering differs). Regenerate with `bash scripts/update-snapshots.sh` (Docker, official Playwright image, after `pnpm build`) or through a PR labeled `update-snapshots`; the reviewer must look at the diff. The CI `e2e` job runs inside the same `mcr.microsoft.com/playwright:v<version>-noble` container, because hosted-runner fonts differ from the image and caused 5–14% pixel diffs. Keep the container tag equal to the `@playwright/test` version.

## 9. Lighthouse CI

`lighthouserc.json`: URLs = home, the DNS header post, `/t/distributed-systems/`, archive, served by `scripts/serve-dist.mjs`. Mobile preset, 3 runs, median. Measured locally: 100/100/100/100 on all four pages; LCP 1.0 to 1.4 s, CLS <= 0.002, post page 80 KB total. Enforced assertions are the table below; LCP and CLS are not asserted separately yet (backlog).

| Assertion                                | Threshold                        |
| ---------------------------------------- | -------------------------------- |
| `categories:performance`                 | >= 0.95                          |
| `categories:accessibility`               | = 1                              |
| `categories:best-practices`              | >= 0.95                          |
| `categories:seo`                         | = 1                              |
| `resource-summary:total:size` (post URL) | <= 409600 bytes                  |
| `unused-javascript`                      | warn                             |
| `largest-contentful-paint`               | target <= 2000 ms (not asserted) |
| `cumulative-layout-shift`                | target <= 0.05 (not asserted)    |

Staging URL variant (`BASE_PATH`) is run by `lhci autorun` against the preview server on PR; production URLs are measured by the owner in PageSpeed Insights after cutover.

## 10. Content PR checks

For any new or changed post:

- Passes schema (build): description 70 to 160, `tldr` + >= 2 takeaways unless `aeoPending: true`, `coverAlt` with `cover`, slug regex.
- Slug is unique, equals directory name, and (for migrated posts) is unchanged versus `main` (CI diff check: a changed `slug` on an existing post fails).
- `pubDate` not in the future unless `draft: true`.
- Cover image present (warning if missing) and committed locally (no remote URL; unit-test grep for `http` image sources in MDX).
- No `TODO(owner)` left unless `aeoPending: true`; production deploy blocks on it.
- cspell and markdownlint on changed `.md/.mdx`.
- Optional Vale warnings.
- `.md` twin previewed (the PR template asks).

## 11. Post-deploy smoke (`scripts/smoke.sh`)

Runs from `smoke.yml` after `deploy.yml` (waits up to 5 minutes for CDN propagation) and every 6 hours. Checks:

| URL                                  | Expect                                                                      |
| ------------------------------------ | --------------------------------------------------------------------------- |
| `/`                                  | 200, contains `2 Minute Serverless`                                         |
| `/p/understanding-the-dns-header/`   | 200, contains `application/ld+json`                                         |
| `/p/understanding-the-dns-header.md` | 200, contains `# Understanding the DNS Header`                              |
| `/archive/`, `/authors/`             | 200                                                                         |
| `/subscribe/`                        | 200, contains `<form`                                                       |
| `/t/distributed~systems/`            | 200 after redirect, contains `distributed-systems`                          |
| `/rss.xml`                           | 200, `<rss`                                                                 |
| `/feed.json`                         | 200, `jsonfeed.org`                                                         |
| `/sitemap-index.xml`                 | 200, `<sitemapindex`                                                        |
| `/robots.txt`                        | 200, contains `Sitemap:`                                                    |
| `/llms.txt`                          | 200, contains `# 2 Minute Serverless`                                       |
| `/search/`                           | 200 (add)                                                                   |
| random path                          | 404                                                                         |
| `http://serverless.fyi/`             | `location: https://www.serverless.fyi/` (production only; skip for staging) |

On failure: opens an `incident` issue, or comments on the existing open one (deduplicated by title). Closing the incident is manual after fix. The target URL is `vars.SMOKE_URL`, defaulting to `https://www.serverless.fyi`.

## 12. Scheduled checks

- Weekly external link check (`links.yml`, `lychee` over `dist`, Monday 09:00 UTC). Opens an issue listing dead links; does not block PRs. `lychee.toml` allowlist: linkedin.com (returns 999 to bots), x.com/twitter.com (rate limited).
- Live parity (`pnpm exec tsx scripts/validate-parity.ts --live https://www.serverless.fyi`) is run manually at cutover and after manifest changes; a scheduled run is in the backlog.
- `security.txt` expiry: `validate-dist.ts` fails the build when `Expires` is missing or less than 30 days away (so it surfaces on the next PR or deploy).
- Dependabot weekly; `pnpm audit --prod --audit-level high` runs in CI (`licenses` job).

## 13. Coverage of non-code ops (rehearsals)

| Rehearsal                                       | When                 | Proves                                                               |
| ----------------------------------------------- | -------------------- | -------------------------------------------------------------------- |
| Rollback dry run on staging (RUNBOOK section 3) | Sprint 6             | Revert-PR and re-run-previous-deploy both restore a good build.      |
| DNS rollback record check                       | Before cutover       | Placeholder records in RUNBOOK are filled with the real DNS records. |
| pg_dump restore                                 | Sprint 9 and monthly | Backups are usable.                                                  |
| Mail-tester / Gmail "show original"             | Sprint 9             | SPF, DKIM, DMARC pass; one-click unsubscribe present.                |

## 14. How to add a test for a new post template

A "post template" is a new layout or content variant for posts (for example a series landing, a video post, or a post with a data table). Do this in order, red first.

1. **Spec first.** Update `docs/SEO_AEO.md` (JSON-LD types, any new head tags) and `docs/PRD.md` (page inventory). The `spec-touch` check requires it.
2. **Add a fixture post.** The E2E suite currently runs against the real migrated content (`tests/e2e/helpers.ts`); `tests/fixtures/` is empty and a `TEST_FIXTURES` build mode does not exist yet. Until it does, add the variant to a real post or build the fixture mode in the same PR (under `tests/fixtures/posts/<template-name>/index.mdx`, not under `src/content`). Make it minimal but representative: all frontmatter the variant uses, a body that exercises the variant. Add a second fixture with `aeoPending: true` if the variant renders TL;DR or FAQ.
3. **Unit tests (red).** In `tests/unit/jsonld.test.ts` assert the graph for the fixture: required properties and absolute URLs. In `seo.test.ts` assert title, description, canonical. If it affects twins or `llms`, add cases in `markdown.test.ts` and `llms.test.ts`.
4. **Validator expectations.** If the template emits a new JSON-LD type, add its required-property table to `validate-seo.ts` (a failing unit test for the table comes first).
5. **E2E (red).** Create `tests/e2e/<template-name>.spec.ts` that loads the fixture (once a fixture mode exists, it must exclude fixtures from the sitemap, feeds and `llms`), and asserts: H1 equals title, the distinguishing blocks are visible, no horizontal overflow at 320 px, JS-disabled rendering works.
6. **A11y.** Add the URL to `TEMPLATES` in `tests/e2e/helpers.ts`; `a11y.spec.ts` runs axe on it in light and dark.
7. **Visual.** Add the URL to the visual list; run `bash scripts/update-snapshots.sh`, inspect images, commit them in a PR labeled `update-snapshots`.
8. **Implement** until all of the above are green, then refactor.
9. **Lighthouse.** If the template is structurally different and likely to affect LCP, add its URL to `lighthouserc.json`.
10. Run `pnpm check`, then `pnpm test:e2e`, then open the PR with before/after screenshots.

Checklist to paste in the PR:

- [ ] Spec docs updated
- [ ] Fixture post(s) added, including `aeoPending` variant
- [ ] Unit tests for head and JSON-LD
- [ ] E2E spec, 320 px overflow, JS-disabled
- [ ] Axe light and dark
- [ ] Visual snapshots reviewed
- [ ] Lighthouse URL added if needed
- [ ] Fixture posts excluded from production output (verified by sitemap sanity)
