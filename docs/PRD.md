# PRD — serverless.fyi static rebuild

Status: implemented through Sprint 6 hardening; this document now describes what was built. Source of truth; supersedes `Prompt.md` where they differ (deviations go in `docs/DECISIONS.md`, notably ADR-015 and ADR-020 to ADR-026).
Owner: Mohinish Shaikh, Serverless Ventures LLC. Publication: **2 Minute Serverless**.
Repo: `github.com/mohnishbasha/serverless-fyi`. Production host: `https://www.serverless.fyi`. Staging: `https://mohnishbasha.github.io/serverless-fyi/`.

## 1. Summary

Move the publication from Beehiiv web hosting to a static site built with Astro, built and deployed by GitHub Actions to GitHub Pages. Every existing public URL keeps working. The email newsletter continues, first through Kit's free plan (Phase A, ADR-028), then through self-hosted listmonk + Amazon SES before the list reaches ~10,000 subscribers (Phase B). Beehiiv is decommissioned now: export subscribers, import into Kit, cancel.

## 2. Goals

- Own the content. Every post is Markdown/MDX in git: versioned, reviewable, portable.
- Zero hosting cost: GitHub Pages and GitHub Actions only.
- Rank at least as well as today, then better: preserve every URL, add structured data, feeds, sitemaps, fast pages.
- Be agent-ready. Answer engines (ChatGPT, Claude, Perplexity, Gemini, Copilot) and coding agents can discover, read and cite every post cleanly (`llms.txt`, Markdown twins, JSON index, feeds).
- Fully responsive, WCAG 2.2 AA, dark-mode aware.
- Publishing an issue means opening a PR with one MDX file. Merge to live in under 5 minutes.
- Keep the newsletter. Email subscribers keep receiving issues.

## 3. Non-goals (v1)

- No comments system, paywall or premium tier.
- No server-side code of any kind. Everything is static.
- No CMS UI.
- No build-time Mermaid renderer (see F-14).
- No Tailwind. Plain CSS only.

## 4. Audiences

| Audience                   | Needs                                                                                                |
| -------------------------- | ---------------------------------------------------------------------------------------------------- |
| Engineers                  | Fast, readable pages; correct code blocks; dark mode; copyable code; RSS.                            |
| Founders / product leaders | Scannable TL;DR, key takeaways, easy subscribe.                                                      |
| AI / answer engines        | Answer-first structure, JSON-LD, `llms.txt`, `.md` twins, `api/posts.json`, permissive `robots.txt`. |
| Search crawlers            | Stable canonical URLs, sitemap, correct redirects, no soft 404s.                                     |
| Owner (publisher)          | One-file publishing, CI guardrails, no vendor lock-in, no recurring ESP cost.                        |

## 5. Current site inventory (live Beehiiv site, discovered)

Identity:

- Name **2 Minute Serverless**. Tagline: _Freshly baked serverless nuggets in 2-minutes_. OG description: _Data | AI | Distributed Systems | Start Ups_. Keywords: product management, software engineering, technology.
- Author: Mohinish S (Mohinish Shaikh). Copyright Serverless Ventures LLC.
- Theme color `#000000`. Cloud-icon logo, committed to `public/brand/`.
- sameAs: X `https://twitter.com/mohinishbasha`; LinkedIn `https://www.linkedin.com/in/mohinishbasha`; YouTube `https://www.youtube.com/@TwoMinuteServerless`; GitHub `https://github.com/mohnishbasha`.

Sitemap (`https://www.serverless.fyi/sitemap.xml`) lists **44 URLs**:

| Group  | Count | URLs                                                                                                                                                                                                   |
| ------ | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Static | 4     | `/`, `/subscribe`, `/authors`, `/authors/mohinish-s`                                                                                                                                                   |
| Posts  | 23    | `/p/<slug>` (slugs preserved byte for byte, e.g. `post-quantum-cryptography-fd6d`)                                                                                                                     |
| Tags   | 17    | `/t/<tag>`: 2024, apache-flink, apache-pulsar, crypto, distributed-filesystem, distributed-systems, dns, iac, object-storage, pqca, qsbs, rfm, serverless-meetup, tax, terraform, video-streaming, xrp |

Additional facts:

- Live tag slugs use hyphens. The `~` form (`/t/distributed~systems`) is a legacy Beehiiv encoding that we still serve as a redirect stub.
- `/archive?page=1` and `?page=2` together list the same 23 posts. `/archive` is not in the sitemap but is a public URL and is in the manifest.
- No Beehiiv RSS feed is enabled (publication `rss_feeds = []`). Legacy feed URLs need no parity. New feeds are additive.
- Other legacy paths to keep resolving: `/login`, `/signup`, `/upgrade`, `/account` (redirect to `/subscribe/`), `/authors/mohinish-s` (redirect to `/authors/`).
- The final manifest has 63 entries (49 `same`, 14 redirect stubs). It includes 22 tag pages: the 17 Beehiiv tags plus 5 added for untagged posts (ADR-020: `newsletter`, `containers`, `apache-kafka`, `ai-agents`, `algorithms`). `object-storage` and `xrp` have no posts and render `noindex` (ADR-021).
- Author data from Beehiiv: name "Mohinish Shaikh", bio "Serverless Ventures | Cloud, Data & Distributed Systems | Angel & Advisor | Infra & Data Startups", photo `public/brand/mohinish.jpg`.

URL mapping:

| Beehiiv URL                                 | New page                   | Behavior                                            |
| ------------------------------------------- | -------------------------- | --------------------------------------------------- |
| `/`                                         | Home                       | same                                                |
| `/p/<slug>`                                 | `/p/<slug>/`               | same (GitHub Pages 301s slashless to slash)         |
| `/t/<tag>`                                  | `/t/<tag>/`                | same                                                |
| `/t/<a~b>`                                  | `/t/<a-b>/`                | redirect stub, one per hyphenated tag               |
| `/archive`, `/archive?page=N`               | `/archive/`, `/archive/N/` | same; inline script maps `?page=N` to `/archive/N/` |
| `/authors`                                  | `/authors/`                | same                                                |
| `/authors/mohinish-s`                       | `/authors/`                | redirect stub                                       |
| `/subscribe`                                | `/subscribe/`              | same                                                |
| `/login`, `/signup`, `/upgrade`, `/account` | `/subscribe/`              | redirect stub                                       |

## 6. Feature list and acceptance criteria

Each feature maps to a template or capability. "AC" items are testable and are enforced by the suites named in `docs/TEST_PLAN.md`.

New pages that Beehiiv never had (additive, no parity impact): `/tags/` (all-topics index), `/feeds/` (feeds index, linked as **RSS** in the main nav, ADR-030), `/about/`, `/privacy/`, `/search/` (`noindex`, not in the sitemap), `/archive/N/`, `/t/<tag>/N/`, `/t/<tag>/rss.xml`, `/p/<slug>.md`, `/og/<slug>.png`, feeds, `llms.txt`, `llms-full.txt`, `robots.txt`, `api/posts.json`, `site.webmanifest`, `humans.txt`, `/.well-known/security.txt`.

### F-01 BaseLayout

Includes `<html lang="en">`, skip link, header (logo, Posts, Archive, Tags, About, Search, Subscribe button, theme toggle), `<main id="main">`, footer (social links, RSS, copyright Serverless Ventures LLC, privacy, `llms.txt` link).

- AC: skip link is the first focusable element and moves focus to `<main id="main">`.
- AC: every template has exactly one `<h1>`, one `<main>`, one `lang="en"`.
- AC: all internal hrefs are built through `url()` and are correct under `BASE_PATH=/serverless-fyi/`.
- AC: tap targets are at least 44x44 px; no horizontal overflow at 320 px.

### F-02 Home

Hero (name, tagline, subscribe form), latest 10 posts as cards, tag cloud, "Start here" (3 pinned posts, configurable in `src/lib/site.ts`).

- AC: renders the 10 newest non-draft posts in descending `pubDate`.
- AC: pinned posts resolve to existing slugs or the build fails.
- AC: JSON-LD `WebSite` + `Organization` + `Blog` + `ItemList` present.

### F-03 Post

Breadcrumbs, H1 title, subtitle, author, date, updated date, reading time, cover image, TL;DR box, key takeaways, auto TOC (over 1,200 words), body, FAQ (if any), tags, prev/next, related posts (shared tags), subscribe CTA, "Read as Markdown" link, share links (plain URLs, no SDKs).

- AC: H1 equals frontmatter `title`; slug equals the Beehiiv slug for migrated posts.
- AC: cover is the LCP element: `fetchpriority="high"`, not lazy, explicit width/height, AVIF/WebP.
- AC: TL;DR and takeaways render and are in JSON-LD only when not `aeoPending`. FAQ markup appears only if FAQ items are visible.
- AC: TOC appears if and only if the body exceeds 1,200 words; anchors scroll correctly.
- AC: post page ships under 30 KB gzipped JS (search excluded).
- AC: JSON-LD `BlogPosting` + `BreadcrumbList` (+ `FAQPage` when applicable) validate in `validate-seo.ts`.
- AC: `/p/<slug>.md` twin exists and returns the Markdown body.

### F-04 Tag listing

Intro, paginated cards (10 per page), JSON-LD `CollectionPage` + `ItemList` + `BreadcrumbList`, per-tag RSS.

- AC: all 22 tag URLs (17 live plus 5 from ADR-020) exist at `/t/<tag>/`. A tag with no posts renders a "No posts with this tag yet" note, `noindex`, no feed, not in the sitemap (ADR-021).
- AC: `/tags/` lists every tag with post counts.
- AC: `/feeds/` lists RSS, Atom and JSON Feed URLs as copyable text and every per-topic RSS feed. The main nav links it as "RSS", and the subscribe page has a "Prefer RSS?" section (e2e `rss.spec.ts`).
- AC: pagination at `/t/<tag>/2/` etc. only when more than 10 posts; no empty pages.
- AC: tags without a description file use the default template description (70-160 chars).

### F-05 Archive

All posts grouped by year, 20 per page, plus inline `?page=N` redirect.

- AC: `/archive/` lists all 23 posts (single page at current volume).
- AC: `/archive/?page=2` ends at `/archive/2/` when that page exists; when it does not, stays on `/archive/`.
- AC: noscript users see the full list on `/archive/`.

### F-06 Authors

Bio, photo, `knowsAbout`, sameAs, list of posts. JSON-LD `ProfilePage` with `Person`.

- AC: `/authors/` exists; `/authors/mohinish-s` is a redirect stub to it.
- AC: Person name, photo and sameAs are identical to what post JSON-LD emits.

### F-07 Subscribe

Provider form, what you get, frequency, privacy note, recent issues.

- AC: plain HTML `<form>` submits to the provider endpoint with JS disabled (`kit`: `POST <host>/forms/<form id>/subscriptions` with `email_address`, host defaults to `https://app.kit.com` (ADR-028); `listmonk`: `POST <PUBLIC_NEWSLETTER_URL>/subscription/form` with `email`, `l=<list uuid>` and a `nonce` honeypot).
- AC: with JS, submits via `fetch` (`no-cors` for Kit) and shows inline success/error in an `aria-live` region.
- AC: on screens narrower than `30rem` the subscribe input and button are full width.
- AC: honeypot field, labelled input, `autocomplete="email"`, `inputmode="email"`.
- AC: `provider=none` renders the RSS/LinkedIn/YouTube follow block, no form.
- AC: no API keys in client bundle; only `PUBLIC_*` values.

### F-08 404 and legacy fallback

- AC: `dist/404.html` exists and is served by GitHub Pages for misses.
- AC: the 404 script rewrites known legacy patterns (`/p/<slug>` without slash, `~` tags) before showing 404 content; otherwise shows search box and popular posts.
- AC: unknown URL returns HTTP 404 (smoke test).

### F-09 Redirect stubs

Generated from `migration/legacy-urls.json` for every `type: redirect` entry.

- AC: each stub has canonical, `noindex`, `meta refresh`, JS `location.replace`, a fallback link, and respects `BASE_PATH`.
- AC: stubs are excluded from the sitemap and from search indexing.
- AC: `validate-parity.ts` reports 100%.

### F-10 Search

Pagefind index built post-build. Search page at `/search/` (`noindex`); the page lazily imports the Pagefind JS API on first interaction or when `?q=` is present and renders its own result list.

- AC: `/search/` returns results for a known term (e2e).
- AC: no search JS is loaded on a post page until the user interacts with search.
- AC: redirect stubs, `/og/` and 404 are excluded from the index.
- AC: `WebSite` JSON-LD `SearchAction` targets `/search/?q={search_term_string}`.

### F-11 SEO and structured data

Per-page head set, JSON-LD graph per template, sitemap with `lastmod`, robots by environment.

- AC: title (post: `{title} | 2 Minute Serverless`), description 70-160 and unique, absolute canonical with trailing slash, OG/Twitter set, `og:image` file exists in `dist/`.
- AC: staging builds are `noindex` and `robots.txt` disallows all; production allows all and explicitly welcomes AI crawlers (ADR-009).
- AC: sitemap contains published posts and listing pages only; no stubs, drafts or OG URLs.

### F-12 Feeds and agent endpoints

`/rss.xml` (alias `/feed.xml`), `/atom.xml`, `/feed.json`, `/t/<tag>/rss.xml`, `/llms.txt`, `/llms-full.txt` (under 5 MB), `/api/posts.json`, `/robots.txt` (AI crawlers and social preview bots allowed), `/.well-known/security.txt` (static file, `Expires` 2027-10-26).

- AC: `validate-feeds.ts` passes (well-formed, absolute URLs, last 50 posts, full content).
- AC: every published post appears in `llms.txt` and `api/posts.json` (checked by `validate-dist.ts`).

### F-13 OG images

One 1200x630 PNG per post at `/og/<slug>.png`, generated at build with satori and `@resvg/resvg-js`.

- AC: file exists for every post and for the site default; referenced by absolute `og:image`.
- AC: image text never overflows (title truncation unit-tested).

### F-14 Diagrams

No build-time Mermaid renderer in v1. No migrated post uses Mermaid. Authors commit pre-rendered SVG next to the post. This avoids a headless browser in the build.

- AC: `package.json` has no Mermaid or Playwright dependency in the build path (Playwright stays a dev/test dependency).
- AC: SVG diagrams carry `alt` text or `<title>`.

### F-15 Theming and responsive design

System font stack, fluid type via `clamp()`, CSS split into `tokens.css`, `base.css`, `components.css`, `prose.css` under `@layer`, `prefers-color-scheme` plus persisted manual toggle applied before paint, `prefers-reduced-motion`, print stylesheet. Code uses Shiki `github-light-high-contrast` and `github-dark` (ADR-024). Theme colors `#ffffff` / `#0b0d10`. The look is the serene theme (ADR-027): white/mint base, sage green brand `#15803d`, sky-teal accent `#0e7490`, soft mint to sky to lavender page-top wash, pastel pills, mint TL;DR, a frosted sticky header at 64rem and up, a gentle card hover lift (off under `prefers-reduced-motion`) and a deep green-slate dark mode. Responsive contract: ADR-029.

- AC: every template works from 320px to 1440px+ with zero horizontal overflow, audited at 320, 375, 414, 768, 1024, 1280 and 1440.
- AC: standalone links and controls (`.more-link`, `.link-list`) are at least 44px tall; mobile shows a second scrollable nav row.
- AC: e2e covers chromium-desktop 1280, iPhone 15, Pixel 7, a 320px overflow spec and no-JS.
- AC: axe has zero violations in light and dark on every template (home, post, tag, archive, authors, subscribe, tags, about, search, 404).
- AC: all text/background pairs meet 4.5:1.
- AC: `data-theme` is set before first paint (e2e).
- AC: tables scroll inside a wrapper on small screens.
- AC: visual snapshots (Linux only) cover six templates in both schemes; see `docs/TEST_PLAN.md` section 8.

### F-16 Newsletter adapter

`PUBLIC_NEWSLETTER_PROVIDER` selects `kit` (current), `listmonk` (planned before ~10,000 subscribers), `buttondown`, `beehiiv` (legacy, code removal tracked for decommission) or `none`. See `docs/ARCHITECTURE.md` section 8.

- AC: switching provider changes only env, not code.
- AC: e2e covers JS on, JS off, success and error (mocked network).

### F-17 Content pipeline guardrails

- AC: build fails on schema violation (zod).
- AC: `description` 70-160 chars; migrated posts that cannot meet it from author words are composed from the author's own text and flagged in `migration/report.md` (10 of 23, ADR-018).
- AC: `scripts/check-content.ts` fails on `TODO(owner)` outside `aeoPending` posts and on slug not equal to folder name, and warns on a missing cover.
- AC: migrated posts carry `aeoPending: true`; production deploy is not blocked by them, but they render no TL;DR/takeaways and emit no AEO JSON-LD.
- AC: `pubDate` in the future requires `draft: true`.

### F-18 Analytics (optional)

Cloudflare Web Analytics, cookieless, env-gated.

- AC: absent token means no script in output.

## 7. Success metrics

| Metric                                   | Target                                                                                                                                  |
| ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Legacy URL parity                        | 100% of manifest URLs return 200 (page or redirect stub)                                                                                |
| Lighthouse (mobile)                      | Performance >= 95, Accessibility = 100, Best Practices >= 95, SEO = 100 (measured locally: 100/100/100/100 on home, post, tag, archive) |
| LCP / CLS / INP (field, p75)             | < 2.0 s / < 0.05 / < 200 ms (lab: LCP 1.0 to 1.4 s, CLS <= 0.002)                                                                       |
| JS shipped on a post page                | < 30 KB gzipped (excluding search, which lazy-loads); about 3 KB measured, post page 80 KB total                                        |
| Build time                               | < 3 min on a GitHub-hosted runner                                                                                                       |
| Broken links                             | 0 internal, 0 non-allowlisted external                                                                                                  |
| Indexed pages (GSC) 30 days post-cutover | >= pre-migration count                                                                                                                  |
| Publish latency                          | merge to live < 5 min                                                                                                                   |
| Newsletter health (Kit and Phase B)      | bounce < 2%, complaints < 0.1%                                                                                                          |

## 8. Cutover definition of done

Whole project is done when all are true:

1. Every Beehiiv URL in `migration/legacy-urls.json` resolves on `https://www.serverless.fyi` (live parity 100%, `validate-parity.ts --live`).
2. Publishing is a merged PR with one MDX file; feeds, sitemap and IndexNow update in under 5 minutes.
3. Lighthouse mobile >= 95/100/95/100 on the four measured templates; axe clean; no overflow at 320 px.
4. `llms.txt`, `llms-full.txt`, `.md` twins, `api/posts.json`, RSS/Atom/JSON feeds, sitemap and robots are live and validated.
5. HTTPS enforced, apex redirects to www.
6. Subscribers receive new issues from Kit's free plan (listmonk + SES once the list nears ~10,000); Beehiiv has no account, no DNS and no cost.
7. All agent files are present and accurate; a fresh Claude Code session can run `/new-post` end to end.
8. Docs, CHANGELOG and RUNBOOK are current; `v1.0.0` tagged (`v1.1.0` for self-hosted email, `v1.2.0` for Beehiiv decommission).

Cutover (Sprint 7) is complete when: production smoke green, live parity 100%, HTTPS enforced, apex to www working, sitemap submitted to GSC and Bing, IndexNow pinged, the subscribe form feeds the Kit list, `v1.0.0` tagged.

Owner-only actions at cutover: content sign-off, DNS changes, GitHub Pages custom domain and domain verification, Kit account, subscriber import and sending-domain authentication, Beehiiv domain disconnect and cancellation, GSC/Bing setup. Agents never do these.

## 9. Sprint plan summary

Every sprint ends in a hard gate: all checkboxes ticked and CI green on `main`. TDD throughout. Behavior changes update the spec in the same PR.

| Sprint | Scope                                                                                                     | Gate summary                                                                                                                    | Tag        |
| ------ | --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| 0      | Specs: PRD, ARCHITECTURE, CONTENT_MIGRATION, SEO_AEO, TEST_PLAN, DECISIONS, RUNBOOK skeleton, STYLE_GUIDE | Specs complete, ADRs decided, owner approves PRD                                                                                | `sprint-0` |
| 1      | Scaffold, tooling, CI/CD, agent files, `url()` helper                                                     | `pnpm check` green, staging deploy with BASE_PATH works, smoke passes                                                           | `v0.1.0`   |
| 2      | Migration: fixtures, exporter, converter, image localizer, manifest, report                               | Post count = 23, 0 remote Beehiiv images, parity 100%, owner reviewed report, subscriber CSV stored privately                   | `v0.2.0`   |
| 3      | Templates, responsive design, dark mode, TOC, pagination, 404, stubs, Pagefind                            | e2e on 5 Playwright projects, no 320 px overflow, axe 0, snapshots, JS-off green                                                | `v0.3.0`   |
| 4      | SEO, JSON-LD, OG images, feeds, robots, llms.txt, twins, API index, IndexNow                              | validate-seo 0 errors, feeds valid, Lighthouse thresholds, Rich Results Test on 3 posts                                         | `v0.4.0`   |
| 5      | Newsletter adapter, Subscribe component, subscribe page                                                   | Form works JS on/off, real test subscription on staging, privacy page names the ESP                                             | `v0.5.0`   |
| 6      | Hardening: perf, a11y, links, RUNBOOK, licenses, audit                                                    | All CI green, rollback dry run on staging                                                                                       | `v0.9.0`   |
| 7      | Cutover                                                                                                   | Production smoke, live parity 100%, HTTPS, sitemap submitted                                                                    | `v1.0.0`   |
| 8      | Post-launch, 2 weeks                                                                                      | Indexed pages >= baseline, no open `incident` issues, retro written                                                             | n/a        |
| 9      | Self-hosted newsletter (listmonk + SES), deferred until ~10,000 subscribers                               | SES out of sandbox, SPF/DKIM/DMARC pass, bounce webhook tested, backup restored, first full send within bounce/complaint limits | `v1.1.0`   |
| 10     | Decommission Beehiiv (can run now; Kit is the sender)                                                     | Exports archived, no Beehiiv DNS, plan cancelled, smoke + parity green                                                          | `v1.2.0`   |

## 10. Risks

| Risk                                                          | Mitigation                                                                                           |
| ------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Lost URLs or SEO drop                                         | Manifest + parity test on build and live; sitemap resubmission; 14-day monitoring.                   |
| Scraped HTML is noisy (inline-styled wrappers, `utm_*` links) | Golden-fixture converter tests; never rewrite prose.                                                 |
| Missing short descriptions                                    | Compose only from author words, flag in report, owner reviews.                                       |
| SES sandbox / deliverability                                  | Request production access at start of Sprint 9; batch warm-up.                                       |
| Beehiiv API key unavailable                                   | Sitemap scrape is the primary path (used); API exporter exists for when the key is supplied.         |
| Astro 7 differences from the prompt's snippets                | Pinned at 7.4.2; deviations logged in ADR-015.                                                       |
| Email template lacks a physical mailing address               | `email/template.html` has `TODO(owner)`; must be filled before Phase B sends (RUNBOOK section 10.2). |
| GitHub Pages has no redirects or headers                      | Static stubs, meta tags; Cloudflare proxy documented as a future option.                             |

## 11. v2 backlog

- Decap CMS or Pages CMS for browser-based authoring (behind GitHub auth).
- Comments (GitHub Discussions via giscus, or similar) and reactions.
- Paid tier / sponsorship placements.
- Series pages (`series` field is already in the schema).
- Build-time Mermaid rendering if the authoring need appears.
- Real response headers via a Cloudflare proxy (CSP, HSTS, cache-control).
- Per-tag newsletters and preference center in listmonk.
- Webmentions, related-post ranking beyond shared tags, i18n.
- Dedicated analytics dashboard for newsletter stats imported from listmonk.

### Home page cards (2026-10-27)

- AC: Every post card shows a 16:9 cover thumbnail (OG image fallback), lazy-loaded below the fold, with explicit width and height (CLS 0).
- AC: The home page shows "Latest posts" first. The newest post is a full-width featured card labelled "Latest issue". Covered by e2e `cards.spec.ts`.
- AC: Lighthouse on the home page stays at 100/100/100/100.
