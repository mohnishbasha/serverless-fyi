# Test Plan

Status: source of truth for what is tested, with which tool, at what threshold, and when it runs. TDD is mandatory: write the failing test, run it and see it fail, implement, see it pass, refactor. Content-migration behavior is tested the same way (fixtures in, expected Markdown out).

Related: `docs/SEO_AEO.md` (what the validators assert), `docs/CONTENT_MIGRATION.md`, `docs/RUNBOOK.md`.

## 1. Test pyramid

```text
                 /\
                /  \   Scheduled / post-deploy: smoke.sh (every 6 h), weekly external links
               /----\
              /      \ E2E + a11y + visual + Lighthouse (Playwright, axe, LHCI) on dist/ via preview
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

| Suite                                     | PR (ci.yml)                              | Post-deploy (smoke.yml)               | Scheduled                              |
| ----------------------------------------- | ---------------------------------------- | ------------------------------------- | -------------------------------------- |
| Static checks (section 3)                 | yes (`verify`)                           | no                                    | no                                     |
| Unit (section 4)                          | yes (`verify`)                           | no                                    | no                                     |
| Build-output validators (section 5)       | yes (`verify`) and again in deploy build | no                                    | no                                     |
| Internal link check (lychee offline)      | yes (`verify`)                           | no                                    | no                                     |
| E2E, JS-disabled, overflow (section 6)    | yes (`e2e`)                              | no                                    | no                                     |
| Accessibility (axe) (section 7)           | yes (`e2e`)                              | no                                    | no                                     |
| Visual regression (section 8)             | yes (`e2e`)                              | no                                    | no                                     |
| Lighthouse CI (section 9)                 | yes (`lighthouse`)                       | no                                    | no                                     |
| Content PR checks (section 10)            | yes (`verify`, changed files)            | no                                    | no                                     |
| Spec-touch, commitlint                    | yes (PR only)                            | no                                    | no                                     |
| Smoke (section 11)                        | no                                       | yes, after every deploy               | every 6 hours (`17 */6 * * *`)         |
| Live parity (`validate-parity.ts --live`) | no                                       | cutover and after any manifest change | weekly                                 |
| External link check (section 12)          | no                                       | no                                    | weekly, Monday 09:00 UTC (`links.yml`) |
| Dependency audit (`pnpm audit --prod`)    | on dependency PRs                        | no                                    | weekly via Dependabot                  |
| CodeQL                                    | yes                                      | no                                    | weekly default schedule                |

Required status checks on `main`: `verify`, `e2e`, `lighthouse`, `spec-touch`, `commitlint`.

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

| File                              | Proves                                                                                                                                                                                                                                                                                                                                                                                    |
| --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `urls.test.ts`                    | `url()` respects `BASE_PATH`, always adds trailing slash (except file-like paths), never emits double slashes; `absoluteUrl()` combines `SITE_URL` + base.                                                                                                                                                                                                                                |
| `seo.test.ts`                     | Title builder truncates the suffix not the title, <= 60 target; description bounds; canonical builder handles base path, `canonical` override and pagination.                                                                                                                                                                                                                             |
| `jsonld.test.ts`                  | `BlogPosting`, `Person`, `Organization`, `WebSite` + `SearchAction`, `BreadcrumbList`, `CollectionPage`, `ItemList`, `ProfilePage`, `FAQPage` builders emit required props; `aeoPending` omits `abstract` and `FAQPage`; all URLs absolute.                                                                                                                                               |
| `tags.test.ts`                    | `~` to `-` normalization; `tag-map.json` round trip; every manifest tag redirect resolves.                                                                                                                                                                                                                                                                                                |
| `reading-time.test.ts`            | Words per minute rule, rounding, minimum 1; TOC threshold 1,200 words.                                                                                                                                                                                                                                                                                                                    |
| `html-to-md.test.ts`              | Golden tests: every `migration/fixtures/*.html` converts to its `*.expected.md`. Covers code blocks and language detection, tables to GFM, embeds to MDX components, Beehiiv chrome stripping (subscribe widgets, "Powered by beehiiv", share bars, polls, tracking pixels, `utm_*`), button to link, internal link rewrite `https://www.serverless.fyi/p/x` to `/p/x/`, prose untouched. |
| `localize-images.test.ts`         | No remote Beehiiv image URL survives (grep assertion); Cloudflare `cdn-cgi/image/...` prefix stripped; hashed filenames; relative imports written.                                                                                                                                                                                                                                        |
| `description.test.ts`             | Migrated-description builder (ADR-018): subtitle + verbatim leading sentences, word-boundary truncation to <= 160, flags < 70 in report, never invents text.                                                                                                                                                                                                                              |
| `redirect-stub.test.ts`           | Stub contains canonical, `noindex`, meta refresh, `location.replace` with hash; respects `BASE_PATH`; staging canonical uses staging origin; stubs excluded from sitemap filter.                                                                                                                                                                                                          |
| `robots.test.ts`                  | Production output lists every AI crawler and the sitemap line; staging is disallow-all; flipping one crawler changes only its group.                                                                                                                                                                                                                                                      |
| `llms.test.ts`                    | `llms.txt`: H1, blockquote, sections in order, every published post present, drafts absent, links point at `.md`; `llms-full.txt` under 5 MB and has per-post headers; `aeoPending` posts omit TL;DR.                                                                                                                                                                                     |
| `feeds.test.ts`                   | Feed builders: 50-item cap, absolute URLs in content, per-tag filtering.                                                                                                                                                                                                                                                                                                                  |
| `markdown-twin.test.ts`           | Twin has frontmatter-lite, TL;DR block (unless `aeoPending`), absolute image/link URLs, MDX components flattened.                                                                                                                                                                                                                                                                         |
| `posts-api.test.ts`               | `/api/posts.json` output validates against `tests/fixtures/posts.schema.json`.                                                                                                                                                                                                                                                                                                            |
| `sitemap-serialize.test.ts`       | `serialize` sets `lastmod` = `updatedDate ?? pubDate` for posts and newest-post date for listings.                                                                                                                                                                                                                                                                                        |
| `newsletter.test.ts`              | Provider adapter returns correct form config per provider (`beehiiv`, `listmonk`, `none`); no secrets in config.                                                                                                                                                                                                                                                                          |
| `smoke-script.test.ts` (optional) | `scripts/smoke.sh` check function parses status and body correctly against a local static server.                                                                                                                                                                                                                                                                                         |

Coverage: run `vitest run --coverage`; thresholds on `src/lib/**`, `migration/**`, `integrations/**`: lines 90, branches 85. Components/pages are covered by validators and E2E, not unit coverage.

## 5. Build-output validators (run against `dist/` after `pnpm build`)

Run via `pnpm validate`: `validate-parity.ts`, `validate-seo.ts`, `validate-feeds.ts`, `html-validate`. Lychee offline and asset/sitemap sanity run in the same job.

| Validator                                          | Proves                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | Fails when                                                                                                     |
| -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `scripts/validate-parity.ts`                       | URL parity (the sacred rule). Each `migration/legacy-urls.json` entry has `dist/<path>/index.html`; for `redirect`, the stub targets `new` and `new` exists.                                                                                                                                                                                                                                                                                                                       | Any missing entry. 100 percent required. `--live` mode fetches the real site, follows redirects, requires 200. |
| `scripts/validate-seo.ts`                          | Per non-stub page: exactly one `<h1>`, unique `<title>`, unique description 70 to 160, absolute canonical matching path, OG and Twitter tags present, `og:image` file exists in `dist/`, JSON-LD parses with required props per type, `lang` set, no `noindex` on production except stubs/drafts/404. Also: `llms.txt`, `llms-full.txt` size, twins exist for every post, `/api/posts.json` schema, `aeoPending` rules, no `TODO(owner)` in production builds unless `aeoPending`. | Any violation.                                                                                                 |
| `scripts/validate-feeds.ts`                        | RSS, Atom, JSON Feed and per-tag feeds are well formed, required elements present, links and image src absolute, GUIDs unique.                                                                                                                                                                                                                                                                                                                                                     | Any violation.                                                                                                 |
| `html-validate`                                    | `dist/**/*.html` is valid HTML (`.htmlvalidate.json`, extends `html-validate:recommended` + `prettier`).                                                                                                                                                                                                                                                                                                                                                                           | Any error.                                                                                                     |
| `lychee --offline --include-fragments --base dist` | Zero broken internal links and anchors.                                                                                                                                                                                                                                                                                                                                                                                                                                            | Any broken.                                                                                                    |
| Asset sanity                                       | No `dist/` file > 1 MB (allowlist in config); no `media.beehiiv.com` string anywhere in `dist/`; `CNAME` present only when `PUBLIC_INDEXABLE=true`; no root-relative links missing `BASE_PATH` on staging builds.                                                                                                                                                                                                                                                                  | Any violation.                                                                                                 |
| Sitemap sanity                                     | Every sitemap URL maps to a file in `dist/`; no stubs, drafts, OG or `.md` URLs; count equals published posts + listing pages + fixed pages.                                                                                                                                                                                                                                                                                                                                       | Any violation.                                                                                                 |
| Budget checks                                      | Total CSS < 30 KB; JS on a post page < 30 KB gzipped excluding Pagefind assets.                                                                                                                                                                                                                                                                                                                                                                                                    | Over budget.                                                                                                   |
| Staging guard                                      | When `PUBLIC_INDEXABLE=false`: every page `noindex`, `robots.txt` disallow-all, no `CNAME`. When `true`: `CNAME` exists and `robots.txt` contains `Allow: /` (also guarded in `deploy.yml`).                                                                                                                                                                                                                                                                                       | Mismatch.                                                                                                      |

Staging run: the same validators run in the deploy job with `BASE_PATH=/serverless-fyi/`, which is how base-path bugs are caught.

## 6. End-to-end (Playwright, `tests/e2e/`)

Runs against `pnpm preview` of the downloaded `dist` artifact. Projects: Chromium desktop 1280x800, Mobile Safari (iPhone 15 emulation), Pixel 7, a 320 px-wide viewport, and a JS-disabled project.

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
| `keyboard.spec.ts`                   | Tab order through header, search, subscribe; focus visible.                                                                                                                                                                                     |
| `base-path.spec.ts`                  | When run against the staging build, internal links, assets and search index load under `/serverless-fyi/`.                                                                                                                                      |

## 7. Accessibility

- `@axe-core/playwright` on every template (home, post, post with FAQ + TOC, tag, archive, authors, subscribe, search, about, privacy, 404), in light and dark mode, tags `wcag2a, wcag2aa, wcag21a, wcag21aa, wcag22aa`. Threshold: zero violations. Incomplete results are reviewed in the report, not ignored.
- Contrast pairs are covered by axe; tokens are additionally unit-checked if a contrast helper is added.
- Keyboard-only traversal (section 6).
- `prefers-reduced-motion`: a test emulates it and asserts no CSS animation/transition durations > 0.01 s on interactive elements.
- Manual (Sprint 6, owner or reviewer): screen reader pass on home and a post (VoiceOver), 200 percent zoom, 400 percent reflow at 320 px.

## 8. Visual regression

`toHaveScreenshot` per template x (mobile 390 px, desktop 1280 px) x (light, dark). Snapshots are committed in `tests/visual/__screenshots__/`. Settings: `maxDiffPixelRatio: 0.002`, animations disabled, fonts are system so no font loading variance, fixed date/time for relative content, run on the CI Linux image only (snapshot platform suffix `linux`). Snapshots update only through a PR labeled `update-snapshots` with before/after screenshots; reviewer must look at the diff.

## 9. Lighthouse CI

`lighthouserc.json`: URLs = home, one post (the DNS header post, has cover + TOC-less), one tag, archive. Mobile preset, 3 runs, median.

| Assertion                      | Threshold                      |
| ------------------------------ | ------------------------------ |
| `categories:performance`       | >= 0.95                        |
| `categories:accessibility`     | = 1                            |
| `categories:best-practices`    | >= 0.95                        |
| `categories:seo`               | = 1                            |
| `total-byte-weight` (post URL) | <= 400000 bytes                |
| `unused-javascript`            | warn                           |
| `largest-contentful-paint`     | <= 2000 ms (lab, warn at 1800) |
| `cumulative-layout-shift`      | <= 0.05                        |

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

On failure: opens or updates a GitHub issue labeled `incident`. Closing the incident is manual after fix. The workflow deduplicates by title.

## 12. Scheduled checks

- Weekly external link check (`links.yml`, `lychee` over `dist`, Monday 09:00 UTC). Opens an issue listing dead links; does not block PRs. `lychee.toml` allowlist: linkedin.com (returns 999 to bots), x.com/twitter.com (rate limited).
- Weekly live parity (`validate-parity.ts --live`), issue on any failure.
- `security.txt` expiry check: warn 30 days before `Expires`.
- Dependabot weekly; `pnpm audit --prod` must show no high or critical (Sprint 6 gate).

## 13. Coverage of non-code ops (rehearsals)

| Rehearsal                                       | When                 | Proves                                                               |
| ----------------------------------------------- | -------------------- | -------------------------------------------------------------------- |
| Rollback dry run on staging (RUNBOOK section 3) | Sprint 6             | Revert-PR and re-run-previous-deploy both restore a good build.      |
| DNS rollback record check                       | Before cutover       | Placeholder records in RUNBOOK are filled with real Beehiiv records. |
| pg_dump restore                                 | Sprint 9 and monthly | Backups are usable.                                                  |
| Mail-tester / Gmail "show original"             | Sprint 9             | SPF, DKIM, DMARC pass; one-click unsubscribe present.                |

## 14. How to add a test for a new post template

A "post template" is a new layout or content variant for posts (for example a series landing, a video post, or a post with a data table). Do this in order, red first.

1. **Spec first.** Update `docs/SEO_AEO.md` (JSON-LD types, any new head tags) and `docs/PRD.md` (page inventory). The `spec-touch` check requires it.
2. **Add a fixture post** under `tests/fixtures/posts/<template-name>/index.mdx` (not under `src/content`). Make it minimal but representative: all frontmatter the variant uses, a body that exercises the variant. Add a second fixture with `aeoPending: true` if the variant renders TL;DR or FAQ.
3. **Unit tests (red).** In `tests/unit/jsonld.test.ts` assert the graph for the fixture: required properties and absolute URLs. In `seo.test.ts` assert title, description, canonical. If it affects twins or `llms`, add cases in `markdown-twin.test.ts` and `llms.test.ts`.
4. **Validator expectations.** If the template emits a new JSON-LD type, add its required-property table to `validate-seo.ts` (a failing unit test for the table comes first).
5. **E2E (red).** Create `tests/e2e/<template-name>.spec.ts` that loads the fixture (the e2e config can build with `TEST_FIXTURES=1`, which adds `tests/fixtures/posts` to the collection and excludes them from the sitemap, feeds and `llms`), and asserts: H1 equals title, the distinguishing blocks are visible, no horizontal overflow at 320 px, JS-disabled rendering works.
6. **A11y.** Add the fixture URL to the axe URL list in `tests/e2e/a11y.spec.ts` for light and dark.
7. **Visual.** Add the URL to the visual list; run `pnpm test:e2e --update-snapshots`, inspect images, commit them in a PR labeled `update-snapshots`.
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
