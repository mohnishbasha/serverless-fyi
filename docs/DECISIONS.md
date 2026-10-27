# Decision Log (ADRs)

Lightweight architecture decision records. One entry per decision. Format: Status, Context, Decision, Consequences.

Statuses: `Accepted`, `Accepted — owner to confirm` (agent proceeds with the default; owner can overturn), `Superseded by ADR-NNN`.

Process: when a PR deviates from this log or from `docs/PRD.md`, add or amend an ADR in the same PR. Do not delete ADRs; supersede them.

| ADR | Title                                                       | Status                      |
| --- | ----------------------------------------------------------- | --------------------------- |
| 001 | Static site generator = Astro                               | Accepted                    |
| 002 | Hosting = GitHub Pages, public repo                         | Accepted — owner to confirm |
| 003 | URL scheme preserves Beehiiv paths                          | Accepted                    |
| 004 | Trailing slashes always                                     | Accepted                    |
| 005 | Canonical host = `https://www.serverless.fyi`               | Accepted                    |
| 006 | Newsletter: Beehiiv interim sender, then listmonk + SES     | Accepted                    |
| 007 | Redirects via static stubs                                  | Accepted                    |
| 008 | Security headers via `<meta http-equiv>`                    | Accepted                    |
| 009 | AI crawlers allowed by default                              | Accepted                    |
| 010 | Content license                                             | Accepted — owner to confirm |
| 011 | Styling = plain CSS + custom properties + `@layer`          | Accepted                    |
| 012 | HTML to Markdown = unified / rehype-remark                  | Accepted                    |
| 013 | Migration source = sitemap + `window.__remixContext` scrape | Accepted                    |
| 014 | Mermaid: no build-time renderer in v1                       | Accepted                    |
| 015 | Astro pinned at 7.4.x exactly                               | Accepted                    |
| 016 | Node 24 LTS pinned                                          | Accepted                    |
| 017 | Remote cover images are downloaded and committed            | Accepted                    |
| 018 | Migrated post descriptions are never invented               | Accepted                    |
| 019 | Search page at `/search/`                                   | Accepted                    |

---

## ADR-001: Static site generator = Astro

**Status:** Accepted

**Context:** The site is a content site with 23 posts, 17 tags, and a handful of fixed pages. It needs typed content, MDX, near-zero client JS, built-in sitemap and RSS, and excellent Lighthouse scores. Alternatives considered: Eleventy (light, but weaker typed content and image pipeline), Hugo (fast, but Go templates and no MDX), Next.js static export (ships a React runtime).

**Decision:** Use Astro with content collections (zod schemas), MDX, `astro:assets`, and the official sitemap integration. TypeScript `strict: true`. Pin the exact version in `package.json` (see ADR-015).

**Consequences:** Zero JS by default and typed frontmatter that fails the build on bad content. We depend on Astro's release cadence and breaking changes; pinning and Dependabot grouping manage that. Contributors need basic Astro knowledge.

## ADR-002: Hosting = GitHub Pages, public repository

**Status:** Accepted — owner to confirm

**Context:** Goal is zero hosting cost. GitHub Pages is free for public repos; private repos need a paid plan (Pro/Team/Enterprise). A public repo also makes Markdown content discoverable to agents. Downsides: drafts and history are public, and no server-side redirects or headers.

**Decision:** Host on GitHub Pages via `actions/deploy-pages` (OIDC, no secrets), from a **public** repo `github.com/mohnishbasha/serverless-fyi`. Code is MIT. Drafts are not committed to `main` publicly if sensitive: use a branch PR (which is public in a public repo) or keep sensitive drafts outside the repo until ready.

**Consequences:** Free, HTTPS, custom domain. Everything committed is public, including post history, `migration/` outputs, and docs. Never commit subscriber data, secrets, or `migration/raw/`. If the owner prefers private, it requires a paid plan and ADR amendment. Owner to confirm before Sprint 1.

## ADR-003: URL scheme preserves Beehiiv paths

**Status:** Accepted

**Context:** The existing site ranks and has inbound links under `/p/<slug>` and `/t/<tag>`. Changing URLs loses ranking.

**Decision:** Keep `/p/<slug>/` (slug byte-for-byte), `/t/<tag>/`, `/archive/`, `/authors/`, `/subscribe/`. Tags move from `~` encoding to `-` (`/t/distributed~systems` becomes `/t/distributed-systems/`) with a redirect stub at the old path. `/authors/mohinish-s` redirects to `/authors/`. Manifest `migration/legacy-urls.json` is append-only and drives the parity test.

**Consequences:** URL parity is enforceable by test. Slugs can never change. Some legacy slugs contain hash suffixes (for example `post-quantum-cryptography-fd6d`); they stay.

## ADR-004: Trailing slashes always

**Status:** Accepted

**Context:** GitHub Pages serves directory indexes and 301s slashless URLs to slashed. Mixed forms cause duplicate-content signals.

**Decision:** `trailingSlash: 'always'`, `build.format: 'directory'`. Canonicals end with `/` for HTML pages. File-like endpoints (`.xml`, `.json`, `.txt`, `.md`, `.png`) have no slash.

**Consequences:** One canonical form per page. `url()` enforces it. Legacy slashless URLs resolve through GitHub's native 301.

## ADR-005: Canonical host = `https://www.serverless.fyi`

**Status:** Accepted

**Context:** The current Beehiiv canonical is the `www` host. GitHub Pages redirects apex to the custom domain if both are configured.

**Decision:** Canonical origin is `https://www.serverless.fyi`. Apex `serverless.fyi` points to GitHub Pages A/AAAA records and redirects to `www`. `public/CNAME` is generated only for production builds.

**Consequences:** No canonical change at cutover, so no Change of Address is needed in Search Console. Staging must never emit `CNAME`.

## ADR-006: Newsletter: Beehiiv interim sender, then listmonk + SES

**Status:** Accepted

**Context:** The owner wants to stop paying Beehiiv (about $50/month) and own the list. Email deliverability needs SPF, DKIM, DMARC, one-click unsubscribe, and bounce handling.

**Decision:** Phase A (cutover to Sprint 9): Beehiiv remains sender only, web hosting disconnected, cheapest plan that fits. Phase B (Sprint 9 on): self-hosted listmonk + PostgreSQL on a small AWS instance at `lists.serverless.fyi`, delivery via Amazon SES, sending domain `serverless.fyi`. A provider adapter (`PUBLIC_NEWSLETTER_PROVIDER`) keeps it swappable; `none` is the fallback. Sprint 10 fully decommissions Beehiiv. Campaigns are created as drafts by a GitHub Action; a human sends.

**Consequences:** Lower cost and full ownership; operational burden (backups, deliverability, warm-up, complaint monitoring) moves to the owner. Old emails will show broken images after Beehiiv deletion. See RUNBOOK.

## ADR-007: Redirects via static stubs

**Status:** Accepted

**Context:** GitHub Pages offers no server redirect rules or headers.

**Decision:** Generate HTML stub pages from the manifest with canonical to target, `noindex`, `meta refresh`, and `location.replace` (preserving the hash). Query-string redirects (`/archive?page=N`) use an inline script on `/archive/`. Stubs are excluded from the sitemap.

**Consequences:** Redirects return HTTP 200, not 301. Google treats the canonical plus refresh as a soft redirect and generally consolidates signals, but consolidation is slower than a 301. Acceptable for the small set of non-slug redirects. If real 301s are required, front the site with Cloudflare (ADR-008).

## ADR-008: Security headers via `<meta http-equiv>` where possible

**Status:** Accepted

**Context:** GitHub Pages cannot set response headers. A Cloudflare proxy could, but adds a moving part and complicates GitHub's certificate issuance.

**Decision:** Use `<meta http-equiv="Content-Security-Policy">` and `<meta name="referrer">` where they work. Accept that `frame-ancestors`, HSTS preload tuning, `X-Content-Type-Options`, and `Permissions-Policy` cannot be set. GitHub Pages already serves HTTPS and HSTS. If real headers become required, front with Cloudflare; documented, not done in v1.

**Consequences:** Partial header coverage; security scanners may flag missing headers. Inline scripts (theme, redirects) need hashes or `'unsafe-inline'`-free design via hashed CSP; the CSP is generated with hashes at build.

## ADR-009: AI crawlers allowed by default

**Status:** Accepted

**Context:** The goal is to be discoverable and citable by answer engines. Blocking training crawlers reduces exposure and does not stop scraping by non-compliant bots.

**Decision:** `robots.txt` explicitly allows GPTBot, OAI-SearchBot, ChatGPT-User, ClaudeBot, Claude-User, Claude-SearchBot, PerplexityBot, Perplexity-User, Google-Extended, Applebot-Extended, CCBot. The list lives in `src/lib/site.ts` (`AI_CRAWLERS`) so the owner can flip individual bots to `Disallow`. Staging disallows everything.

**Consequences:** Content may be used for model training by crawlers that honor the allow. Combined with ADR-010, excerpts require attribution, but robots.txt is advisory, not enforcement. Owner can change the policy by editing one list and amending this ADR.

## ADR-010: Content license

**Status:** Accepted — owner to confirm

**Context:** A public repo needs an explicit content license separate from the code license. The owner has not chosen one.

**Decision:** Code: MIT. Content (posts, images, brand): **© Serverless Ventures LLC, all rights reserved**, with excerpts and quotation allowed with attribution and a link to the original post. Recorded in `CONTENT_LICENSE.md`, the footer, the Markdown twin footer, and `llms.txt`. A permissive alternative (CC BY 4.0) is possible if the owner wants maximum reuse by agents.

**Consequences:** Others cannot republish full posts. Answer engines can quote with attribution. Changing to CC BY later is easy; the reverse is not for content already released under CC.

## ADR-011: Styling = plain CSS + custom properties + `@layer`

**Status:** Accepted

**Context:** The prompt allowed plain CSS or Tailwind v4. Requirements: tiny CSS (< 30 KB total), no runtime, easy theming with dark mode, predictable specificity.

**Decision:** Plain CSS in `src/styles/` (`tokens.css`, `base.css`, `prose.css`, `components.css`) with custom properties for design tokens and `@layer reset, tokens, base, prose, components, utilities;` for ordering. Container queries for component-level responsiveness; media queries at `40rem` and `64rem`. No Tailwind, no CSS-in-JS, no preprocessor.

**Consequences:** No build dependency, no utility-class churn, easy to read. We write our own utilities and discipline; stylelint is optional. Dark mode is token redefinition under `[data-theme]` and `prefers-color-scheme`.

## ADR-012: HTML to Markdown = unified / rehype-remark (not turndown)

**Status:** Accepted

**Context:** The migrator must convert Beehiiv HTML to clean Markdown with custom rules (strip chrome, unwrap tables, embed components). Turndown is simple string-rule based; unified works on a syntax tree.

**Decision:** Use `unified` + `rehype-parse` + custom rehype plugins (chrome stripping, unwrapping, embed conversion, link rewrite) + `rehype-remark` + `remark-gfm` + `remark-stringify`. Golden fixtures in `migration/fixtures/`.

**Consequences:** Tree transforms are testable and composable; more code than Turndown but more reliable for nested layout tables and embeds. The same ecosystem (remark/rehype) is already inside Astro.

## ADR-013: Migration source = sitemap + embedded `window.__remixContext` JSON scrape

**Status:** Accepted

**Context:** The Beehiiv API v2 needs `BEEHIIV_API_KEY`, which is not available to the build agent (secrets stay with the owner, and the key is never committed). The sitemap fallback is in the prompt. Beehiiv pages are Remix apps that embed page data as JSON in `window.__remixContext`, which contains structured post data (title, subtitle, dates, tags, HTML content) more reliably than scraping rendered DOM.

**Decision:** The migrator (`migration/scrape-beehiiv.ts`) reads `https://www.serverless.fyi/sitemap.xml`, fetches each `/p/` and `/t/` page politely (1 req/s, identifying UA), parses `window.__remixContext` for structured fields and body HTML, and falls back to DOM extraction if the JSON is absent. The API exporter `migration/fetch-beehiiv.ts` is kept for owner use with `BEEHIIV_API_KEY` in `.env.local`; it is not run in CI. Raw output goes to `migration/raw/` (git-ignored).

**Consequences:** Migration works without credentials. It depends on Beehiiv's page internals, which can change; golden fixtures from saved pages protect the converter, and the scrape runs once. Subscriber data is not scraped; the owner exports the CSV from the dashboard.

## ADR-014: Mermaid: no build-time renderer in v1

**Status:** Accepted

**Context:** The prompt suggested build-time Mermaid (`rehype-mermaid`), which requires a headless browser (Playwright/Chromium) in the build, slowing it and adding flakiness. No migrated post uses Mermaid.

**Decision:** No Mermaid renderer in v1. Authors who need a diagram commit an SVG (or optimized image) beside the post and embed it with alt text and a caption. A ` ```mermaid ` fence is allowed only in `docs/` (rendered by GitHub), not in posts. Revisit if a post genuinely needs it.

**Consequences:** Build stays under 3 minutes with no browser. Diagram authors do an extra export step. No client-side Mermaid JS.

## ADR-015: Astro pinned at 7.4.x exactly

**Status:** Accepted

**Context:** The prompt's content config snippet (`astro:content`, `astro/loaders`, `astro/zod`) targeted an earlier Astro API and says to follow current docs if the API differs, and not to downgrade Astro.

**Decision:** Pin Astro at an exact `7.4.x` version in `package.json` (no `^` or `~`), with `@astrojs/*` integrations pinned to compatible exact versions. Where the snippet's imports or loader options differ from 7.4, follow the 7.4 docs. Deviations are recorded here as they are found during Sprint 1 (append bullets below).

**Consequences:** Reproducible builds; upgrades are deliberate PRs (Dependabot group `astro`). Spec docs describe behavior, not Astro-version-specific APIs.

Deviations log:

- (to be filled in Sprint 1: content config import paths, `z` import source, `glob` loader options, `trailingSlash`/`build.format` behavior with endpoints, sitemap `serialize` signature)

## ADR-016: Node 24 LTS pinned in `.nvmrc` / `engines`

**Status:** Accepted

**Context:** Node 24 is the active LTS at project start. Local machines may run a newer version.

**Decision:** `.nvmrc` contains `24`; `package.json` `engines.node` is `>=24 <25`; CI uses `node-version-file: .nvmrc`. Local development may use a newer Node (with `engine-strict=false` locally); CI and deploy are authoritative. `packageManager` pins pnpm via Corepack.

**Consequences:** Builds are reproducible on CI. A bug seen only on newer local Node is not a release blocker. Move to the next LTS in a dedicated PR when it becomes active.

## ADR-017: Remote cover images (Unsplash) are downloaded and committed

**Status:** Accepted

**Context:** Some posts use cover images hosted on Unsplash or other remote sources. Hotlinking hurts LCP and CLS control, can break, adds third-party requests, and conflicts with the "no media.beehiiv.com in dist" rule for the equivalent case.

**Decision:** Treat remote cover images like Beehiiv images: download at migration or authoring time, commit beside the post (`src/content/posts/<slug>/`), reference by relative path so `astro:assets` optimizes them, and require `coverAlt`. Record attribution (photographer, source URL) in the post body or `coverCredit` frontmatter if the source license requires it. The localizer fails on any remaining remote cover URL.

**Consequences:** Repository size grows modestly; pages stay self-contained and fast. Licensing obligations must be checked per image.

## ADR-018: Migrated post descriptions are never invented

**Status:** Accepted

**Context:** The schema requires `description` of 70 to 160 characters. Beehiiv posts often have no `meta_default_description`. The prompt forbids inventing content.

**Decision:** For migrated posts, build `description` in this order: (1) Beehiiv meta description if it is 70 to 160 characters; (2) otherwise the author's subtitle, extended with verbatim leading body sentences until it is long enough; the result is truncated at a word boundary to at most 160 characters (ending without a trailing partial word; ellipsis counted within the limit). No paraphrase, no generated text. Any description not taken directly from the author's metadata is listed in `migration/report.md` for owner review. `tldr` and `keyTakeaways` are `TODO(owner)` and posts are `aeoPending: true` until the owner writes them.

**Consequences:** Descriptions are accurate but may read less polished than hand-written ones; owner reviews and rewrites over time. Truncation rules are unit-tested (`description.test.ts`).

## ADR-019: Search page at `/search/`

**Status:** Accepted

**Context:** Pagefind provides a static index with a lazy-loaded UI. A dedicated page makes search linkable and lets `WebSite` declare a `SearchAction`.

**Decision:** Provide `/search/` with Pagefind UI, lazy-loaded on first interaction (or when `?q=` is present). Reads `?q=` and pre-fills. Emit `WebSite.potentialAction` `SearchAction` with target `/search/?q={search_term_string}`. Header search icon links to `/search/` (no JS required to navigate). `/search/` is excluded from the sitemap.

**Consequences:** One extra page, no search JS on content pages. The `SearchAction` is only valid while `/search/?q=` works, so e2e tests it. Pagefind index files add weight to `dist/`, not to page loads.
