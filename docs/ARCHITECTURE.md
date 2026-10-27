# ARCHITECTURE — serverless.fyi

Companion to `docs/PRD.md`. If they disagree, update both in the same PR.

## 1. Overview

A fully static site. Content is Markdown/MDX in git. Astro builds HTML, feeds, OG images and agent endpoints into `dist/`. Pagefind indexes `dist/` after the build. GitHub Actions validates and deploys `dist/` to GitHub Pages. There is no server-side code. Email delivery is handled by an external provider chosen at build time (Kit free plan now, then listmonk + SES before ~10,000 subscribers; ADR-028).

Hosts:

| Environment | URL                                              | `SITE_URL`                       | `BASE_PATH`        | `PUBLIC_INDEXABLE` |
| ----------- | ------------------------------------------------ | -------------------------------- | ------------------ | ------------------ |
| Staging     | `https://mohnishbasha.github.io/serverless-fyi/` | `https://mohnishbasha.github.io` | `/serverless-fyi/` | `false`            |
| Production  | `https://www.serverless.fyi/`                    | `https://www.serverless.fyi`     | `/`                | `true`             |

Canonical host is `https://www.serverless.fyi`. Apex `serverless.fyi` redirects to www (GitHub Pages does this when the custom domain is `www`). Trailing slashes always.

## 2. Stack

| Layer             | Choice                                                                                              | Notes                                                                                                                                                              |
| ----------------- | --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| SSG               | Astro **7.4.x**, pinned to an exact version in `package.json` (no `^`/`~`)                          | Content collections, MDX, zero JS by default.                                                                                                                      |
| Language          | TypeScript, `strict: true`                                                                          |                                                                                                                                                                    |
| Package manager   | pnpm, pinned via `packageManager` + Corepack                                                        |                                                                                                                                                                    |
| Runtime           | Node.js 24 LTS (`.nvmrc`, `engines`)                                                                |                                                                                                                                                                    |
| Styling           | Plain CSS, custom properties, `@layer`; system font stack                                           | No Tailwind. Serene theme (ADR-027); responsive 320px to 1440px+ (ADR-029). Files: `tokens.css`, `base.css`, `components.css`, `prose.css`. Total CSS under 30 KB. |
| Content           | Markdown + MDX in `src/content/posts/<slug>/index.mdx`                                              |                                                                                                                                                                    |
| Search            | Pagefind, static index, lazy UI at `/search/`                                                       |                                                                                                                                                                    |
| OG images         | satori + `@resvg/resvg-js`, Inter from `@fontsource/inter`                                          | Build time, 1200x630 PNG.                                                                                                                                          |
| Diagrams          | None at build time in v1                                                                            | Authors commit pre-rendered SVG. No headless browser in the build.                                                                                                 |
| Code highlighting | Shiki, dual theme (`github-light-high-contrast`/`github-dark`, ADR-024)                             | No client JS.                                                                                                                                                      |
| Images            | `astro:assets` to AVIF/WebP, width/height always set                                                |                                                                                                                                                                    |
| Newsletter        | Adapter: kit (current), listmonk (planned), buttondown, beehiiv (legacy), none                      | Section 8.                                                                                                                                                         |
| Analytics         | Cloudflare Web Analytics, optional, env-gated                                                       |                                                                                                                                                                    |
| Hosting           | GitHub Pages via `actions/deploy-pages`                                                             |                                                                                                                                                                    |
| CI                | GitHub Actions                                                                                      |                                                                                                                                                                    |
| Testing           | Vitest, Playwright, `@axe-core/playwright`, Lighthouse CI, html-validate, lychee, custom validators | See `docs/TEST_PLAN.md`.                                                                                                                                           |
| Lint              | ESLint flat config + `eslint-plugin-astro`, Prettier, markdownlint-cli2, cspell                     |                                                                                                                                                                    |
| Hooks             | lefthook + commitlint                                                                               |                                                                                                                                                                    |
| Migration only    | unified, rehype-parse, rehype-remark, remark-gfm, remark-stringify                                  | `migration/` only; not in the site bundle.                                                                                                                         |

## 3. Directory layout

```text
serverless-fyi/
├── .claude/ {settings.json, commands/, agents/, skills/}
├── .agent/skills/ {run-tests, check-types, new-post, verify-deploy}
├── .github/ {workflows/, ISSUE_TEMPLATE/, PULL_REQUEST_TEMPLATE.md, CODEOWNERS, dependabot.yml, labeler.yml, copilot-instructions.md}
├── .cursor/rules/project.mdc
├── docs/ {PRD, ARCHITECTURE, CONTENT_MIGRATION, SEO_AEO, TEST_PLAN, DECISIONS, RUNBOOK, STYLE_GUIDE}.md
├── email/template.html              # listmonk campaign template (Phase B)
├── infra/newsletter/                # Compose, Caddyfile, Terraform (Phase B)
├── integrations/
│   ├── legacy-redirects.mjs         # writes redirect stubs on astro:build:done
│   ├── redirect-stub.mjs            # stub HTML builder
│   ├── content-index.mjs            # frontmatter scan for sitemap lastmod/exclusions
│   ├── remark-base-links.mjs        # prefixes root-relative post links with the base (ADR-022)
│   ├── pagefind.mjs                 # runs Pagefind on dist/
│   └── cname.mjs                    # emits CNAME only when PUBLIC_INDEXABLE=true
├── migration/
│   ├── fetch-beehiiv.ts             # API exporter (needs BEEHIIV_API_KEY)
│   ├── scrape-beehiiv.ts            # sitemap scraper, primary path in practice
│   ├── html-to-md.ts  localize-images.ts  build-manifest.ts
│   ├── fixtures/                    # *.html + *.expected.md
│   ├── tag-map.json  legacy-urls.json  report.md
│   └── raw/                         # git-ignored
├── public/ {brand/ (logo set, mohinish.jpg), .well-known/security.txt (static, Expires 2027-10-26), <indexnow-key>.txt, .nojekyll}   # CNAME is written to dist/ by the build
├── scripts/ {check-content.ts, validate-seo.ts, validate-parity.ts, validate-feeds.ts, validate-dist.ts, serve-dist.mjs, smoke.sh, indexnow.sh, new-post.ts, newsletter-draft.ts, update-snapshots.sh, third-party-licenses.ts, check-versions.sh, lib/}
├── src/
│   ├── content.config.ts            # posts + authors collections, zod
│   ├── content/posts/<slug>/index.mdx (+ hashed images alongside)
│   ├── content/authors/authors.json
│   ├── content/tags/<tag>.md        # one per tag (22), written by build-manifest.ts
│   ├── components/ {BaseHead, SEO, JsonLd, PostCard, TagList, Subscribe, TOC, Tldr, Faq, Header, Footer, ThemeToggle, Search, Pagination, Breadcrumbs, YouTube, Tweet}
│   ├── layouts/ {BaseLayout, PostLayout}.astro
│   ├── lib/ {site, env, urls, seo, jsonld, reading-time, tags, posts, markdown, feeds, feed-data, llms, robots, og}.ts + newsletter/
│   ├── pages/
│   │   ├── index.astro  tags.astro  authors.astro  subscribe.astro  about.astro  privacy.astro  404.astro  search.astro
│   │   ├── p/[slug].astro  p/[slug].md.ts
│   │   ├── t/[tag]/[...page].astro  t/[tag]/rss.xml.ts
│   │   ├── archive/[...page].astro
│   │   ├── rss.xml.ts  feed.xml.ts  atom.xml.ts  feed.json.ts
│   │   ├── llms.txt.ts  llms-full.txt.ts  robots.txt.ts  humans.txt.ts  site.webmanifest.ts
│   │   ├── api/posts.json.ts
│   │   └── og/[slug].png.ts
│   └── styles/ {tokens, base, components, prose}.css
├── tests/ {unit/, e2e/, visual/ (+ __snapshots__/), fixtures/ (empty)}
├── AGENTS.md  AGENT.md (symlink)  CLAUDE.md  PROMPT.md  SOUL.md  SKILLS.md
├── astro.config.mjs  tsconfig.json  package.json  pnpm-lock.yaml
└── eslint.config.js  lighthouserc.json  playwright.config.ts  vitest.config.ts  .htmlvalidate.json  lychee.toml  lefthook.yml  commitlint.config.js  cspell.json
```

Rules: posts live only at `src/content/posts/<slug>/index.mdx`. Folder name equals frontmatter `slug`. Images sit beside the post. The generated redirect stubs are written into `dist/` by the integration, not committed.

## 4. Build pipeline

`pnpm build` is `astro build` (the `prebuild` script first removes `dist/`, because Astro 7 does not empty it; the stub integration may overwrite only an older stub, never a real page), followed by Astro integrations. Order:

1. **Content load.** `content.config.ts` loads `posts` (glob `**/index.{md,mdx}`) and `authors` (file). Zod validates every post. Any violation fails the build: `description` 70-160, `tags` 1-6 kebab-case, `coverAlt` required with `cover`, `tldr` and 2+ `keyTakeaways` required unless `aeoPending`.
2. **Page generation.** Static routes via `getStaticPaths`. `trailingSlash: 'always'`, `build.format: 'directory'`, so every page is `dist/<path>/index.html`. Drafts and future-dated posts are excluded from production routes.
3. **Derived artifacts** (pages with `.ts` endpoints): RSS, Atom, JSON Feed (last 50, full HTML), per-tag RSS, `llms.txt`, `llms-full.txt`, `p/<slug>.md`, `api/posts.json`, `robots.txt`, `og/<slug>.png`.
4. **Sitemap.** `@astrojs/sitemap` writes `sitemap-index.xml`. A filter drops `/og/`, `/404/`, `/search/`, `noindex` posts and empty tag pages (ADR-021); stubs are not pages in the sitemap. `serialize` sets `lastmod` to `updatedDate ?? pubDate`, using a frontmatter scan at config time (`integrations/content-index.mjs`).
5. **`astro:build:done` hooks**, in order:
   1. `legacy-redirects`: reads `migration/legacy-urls.json`, writes `dist/<old>/index.html` for every `type: redirect` (14 today).
   2. `cname`: writes `dist/CNAME` containing `www.serverless.fyi` only if `PUBLIC_INDEXABLE=true`.
   3. `pagefind`: runs Pagefind on `dist/` and writes `dist/pagefind/`. Stubs and `/og/` carry `data-pagefind-ignore`/are excluded.
6. **`pnpm validate`** (run in CI, not part of `astro build`): `check-content`, `validate-parity`, `validate-seo`, `validate-feeds`, `validate-dist` (asset size, no Beehiiv URLs, CNAME only when indexable, sitemap vs indexable pages, agent endpoints, robots per environment, `security.txt` expiry, staging root-relative URLs), `html-validate`. `lychee --offline` (`lychee.toml`, `include_fragments = "full"`) runs in CI.

Budgets: build under 3 minutes on a GitHub-hosted runner; no `dist/` file over 1 MB except Pagefind assets and `llms-full.txt`; no `media.beehiiv.com` string anywhere in `dist/`.

### 4.1 Environment variables

| Variable                                    | Scope      | Purpose                                                                                               |
| ------------------------------------------- | ---------- | ----------------------------------------------------------------------------------------------------- |
| `SITE_URL`                                  | build      | Absolute origin for canonicals, feeds, sitemap, OG.                                                   |
| `BASE_PATH`                                 | build      | Path prefix; `/` or `/serverless-fyi/`.                                                               |
| `PUBLIC_INDEXABLE`                          | build      | `true` enables indexing, robots allow, CNAME.                                                         |
| `PUBLIC_NEWSLETTER_PROVIDER`                | build      | Adapter selection.                                                                                    |
| `PUBLIC_NEWSLETTER_ID`                      | build      | Public form/list ID (Kit form id, listmonk list UUID, Beehiiv publication UUID).                      |
| `PUBLIC_NEWSLETTER_URL`                     | build      | listmonk base URL, or the Kit host override from the HTML embed code (default `https://app.kit.com`). |
| `PUBLIC_CF_ANALYTICS_TOKEN`                 | build      | Optional analytics.                                                                                   |
| `BEEHIIV_API_KEY`, `BEEHIIV_PUBLICATION_ID` | local only | Migration exporter. Never in CI, never committed.                                                     |

## 5. Deploy pipeline

Workflow `.github/workflows/deploy.yml`, trigger: push to `main` and manual dispatch.

1. `build` job: checkout, pnpm, Node from `.nvmrc`, `pnpm install --frozen-lockfile`, `pnpm build`, `pnpm validate`, production guard (when `PUBLIC_INDEXABLE=true`, require `dist/CNAME` and `Allow: /` in `dist/robots.txt`), `configure-pages`, `upload-pages-artifact` from `dist/`.
2. `deploy` job: `actions/deploy-pages` into the `github-pages` environment (restricted to `main`). Authentication is OIDC (`id-token: write`); no deploy secrets.
3. `smoke` job: calls `smoke.yml` against `${SITE_URL}${BASE_PATH}`. On failure it opens a GitHub issue labeled `incident`, or comments on the existing open one.
4. After a successful deploy: `indexnow.yml` pings changed post URLs (only when `PUBLIC_INDEXABLE=true`; `workflow_dispatch` input `all` pings every sitemap URL, used once at cutover), and `newsletter-draft.yml` creates listmonk draft campaigns when the provider is `listmonk`.

Other workflows: `ci.yml` (PR gate: `verify`, `e2e`, `lighthouse`, `spec-touch`, `commitlint`, plus `licenses`: `pnpm licenses:gen` must produce no diff and `pnpm audit --prod --audit-level high` must pass), `smoke.yml` (also every 6 h; target var `SMOKE_URL` or `https://www.serverless.fyi`), `links.yml` (weekly external links), `release.yml` (tag to GitHub Release), `codeql.yml`, `labeler.yml`, `newsletter-draft.yml`.

Settings: Pages source = GitHub Actions. Repo variables hold the env table above. All actions are pinned to full commit SHAs.

Test server: Playwright and Lighthouse CI serve `dist/` with `node scripts/serve-dist.mjs <port>`, a GitHub Pages emulator (base path, 301 to the trailing slash, `404.html` with status 404), because Astro 7 `astro preview` daemonizes (ADR-015, ADR-023).

Rollback: re-run the deploy workflow on the previous good commit (`workflow_dispatch` on that ref), or revert the PR on `main`. DNS rollback is covered in `docs/CONTENT_MIGRATION.md` section 11.

### 5.1 Build, test, deploy diagram

```mermaid
flowchart TD
    A[PR opened or push to main] --> B[ci.yml verify]
    B --> B1[lint: eslint, prettier, markdownlint, cspell]
    B1 --> B2[typecheck: astro check + tsc]
    B2 --> B3[unit tests: vitest]
    B3 --> B4[astro build<br/>content zod validation, pages, feeds, OG, stubs, CNAME, pagefind]
    B4 --> B5[validate: content, parity, seo, feeds, dist, html-validate]
    B5 --> B6[lychee offline internal links]
    B6 --> B7[(upload dist artifact)]
    B7 --> C[e2e: Playwright 5 projects + JS-off + axe + visual]
    B7 --> D[lighthouse CI: home, post, tag, archive]
    B -.PR only.-> E[spec-touch + commitlint]
    C --> F{all required checks green?}
    D --> F
    E --> F
    F -- no --> X[block merge]
    F -- yes, PR merged to main --> G[deploy.yml build job<br/>same build + validate with repo vars]
    G --> H[guard: CNAME + robots on production]
    H --> I[upload-pages-artifact dist/]
    I --> J[deploy-pages to github-pages env]
    J --> K[smoke.yml against live URL]
    K -- fail --> L[open incident issue]
    K -- pass --> M[indexnow.yml ping changed URLs]
    K -. every 6h .-> K
```

## 6. Base-path strategy

Staging is served under `/serverless-fyi/`; production under `/`. One codebase, two builds, differing only in env.

- `astro.config.mjs` reads `SITE_URL` and `BASE_PATH` (defaults `https://www.serverless.fyi` and `/`).
- Every internal URL is built with `url(path)` in `src/lib/urls.ts`: it prepends `import.meta.env.BASE_URL`, forces a trailing slash for page paths, and never emits `//`. Absolute URLs (canonical, OG, feeds, sitemap, JSON-LD) use `absoluteUrl(path)`, which joins `SITE_URL` + base + path.
- Raw root-relative strings in `href`/`src` are banned by an ESLint `no-restricted-syntax` rule and by a `dist/` scan in `validate-dist.ts` that fails on any root-relative link missing the base prefix when `BASE_PATH != /`. Markdown links inside post bodies are prefixed at build time by `integrations/remark-base-links.mjs` (ADR-022), so authors write plain `/p/slug/` links.
- Redirect stubs, `404.html` script, archive `?page=N` script and Pagefind all take the base from a build-time constant, never hard-code `/`.
- Staging canonicals point at the staging origin and every page is `noindex`; `robots.txt` is `Disallow: /`. No `CNAME` is emitted on staging, so it never claims the custom domain.
- Smoke tests take a base URL argument and are run against both environments.
- The `url()` unit tests run with both `/` and `/serverless-fyi/`.

## 7. GitHub Pages constraints and how each is handled

| Constraint                     | Handling                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| No server redirects            | Static stubs at `dist/<old>/index.html` generated from the manifest: `<link rel=canonical>`, `noindex`, `<meta http-equiv=refresh content="0; url=...">`, `location.replace(new + location.hash)`, visible fallback link. Slashless `/p/slug` is 301ed to `/p/slug/` natively by Pages.                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Query strings cannot be routed | `/archive/` includes a tiny inline script mapping `?page=N` to `/archive/N/` (only if that page exists in the build).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| No custom response headers     | Use `<meta>` equivalents: `<meta http-equiv="Content-Security-Policy">`, `<meta name="referrer" content="strict-origin-when-cross-origin">`, `<meta name="robots">`, `<meta name="color-scheme">`. Not possible via meta: `frame-ancestors`, `report-uri`, HSTS, X-Frame-Options, `Cache-Control`. Pages already serves HTTPS with HSTS and a default cache policy. If real headers become required, front with a Cloudflare proxy (ADR-008, not done in v1).                                                                                                                                                                                                                                                   |
| CSP shape                      | Static CSP in a `<meta>` tag (`BaseHead.astro`): `default-src 'self'`, `img-src 'self' data: https:`, `font-src 'self'`, `frame-src` limited to YouTube (nocookie) and Twitter embeds, `style-src 'self' 'unsafe-inline'`, `script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'` plus the Cloudflare analytics origin (inline scripts are the ADR-026 islands; `wasm-unsafe-eval` is for Pagefind), `base-uri 'self'`, `object-src 'none'`. `connect-src` and `form-action` list the known provider origins (`lists.serverless.fyi`, `app.kit.com`, `app.convertkit.com`, `buttondown.com`, and the legacy `magic.beehiiv.com`) rather than a single per-build origin. The Referrer-Policy is also a `<meta>`. |
| `404.html` handling            | Pages serves `404.html` with status 404 for any miss. `src/pages/404.astro` renders `dist/404.html`. Because it is served from arbitrary paths, all its asset and link URLs are absolute from the base (never relative). A small script first tries legacy rewrites (slashless `/p/<slug>`, `~` tags to hyphen) and only then shows the 404 body (search box, popular posts). It has `noindex`.                                                                                                                                                                                                                                                                                                                 |
| Case-sensitive, no rewrites    | Slugs are lowercase kebab-case; the build fails on uppercase slugs.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| Custom domain needs `CNAME`    | Generated only when `PUBLIC_INDEXABLE=true`. Domain verified in account settings by the owner.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| No MIME overrides              | `.md` twins and `.txt` endpoints are served by extension (`text/markdown`, `text/plain`). Pages may append charset; tests check content, not header exactness.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| Size / rate limits             | Site under 1 GB; `llms-full.txt` kept under 5 MB; no large binaries.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| No server-side search          | Pagefind static index.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |

## 8. Newsletter adapter

`src/lib/newsletter/index.ts` exports `provider` (from `PUBLIC_NEWSLETTER_PROVIDER`, default `none`) and `formConfig` (action URL, field names, list IDs, honeypot name, CSP origin per provider). Providers: `kit | listmonk | buttondown | beehiiv | none`. Only public IDs reach the client; no API keys. The `beehiiv` provider code stays in the adapter until its removal is done as part of decommissioning.

`Subscribe.astro` renders a plain HTML `<form>` (method per provider: `beehiiv` is `GET`, the others `POST`) that works with JS off. A small enhancement script (loaded only on pages with the form) sends the same request via `fetch`, shows success/error in an `aria-live="polite"` region, and falls back to the native form submit on any failure. Includes a honeypot field, a labelled `type=email` input with `autocomplete="email"` and `inputmode="email"`. With `provider=none` it renders the follow block (RSS, LinkedIn, YouTube) and no form.

| Phase          | When                                    | Website      | Sender                                                               | Form posts to                                                                                          |
| -------------- | --------------------------------------- | ------------ | -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| A, Kit free    | Now (ADR-028) until ~10,000 subscribers | GitHub Pages | Kit free plan (broadcasts created manually; no RSS-to-email on free) | `POST <host>/forms/<form id>/subscriptions` (`email_address`; host defaults to `https://app.kit.com`)  |
| B, self-hosted | Before ~10,000 subscribers (future)     | GitHub Pages | listmonk + Amazon SES                                                | listmonk `POST <PUBLIC_NEWSLETTER_URL>/subscription/form` (`email`, `l=<list uuid>`, `nonce` honeypot) |
| Fallback       | Any time                                | GitHub Pages | none                                                                 | none (`provider=none`)                                                                                 |

The Kit form works without JS; JS enhances it with `fetch` (`no-cors`) and an inline status. Site config for Phase A: `PUBLIC_NEWSLETTER_PROVIDER=kit`, `PUBLIC_NEWSLETTER_ID=<Kit form id>`, and optionally `PUBLIC_NEWSLETTER_URL` (the host from Kit's HTML embed code). Sending domain `serverless.fyi` is authenticated in Kit (DKIM/SPF) with DMARC `p=none`, sent from `newsletter@serverless.fyi`. Kit free has no post-to-email automation: the owner creates each broadcast in Kit, pasting from the post's `/p/<slug>.md` twin. `newsletter-draft.yml` runs only when the provider is `listmonk`.

Moving from A to B is a repo-variable change (`PUBLIC_NEWSLETTER_PROVIDER=listmonk`, `PUBLIC_NEWSLETTER_ID=<list uuid>`, `PUBLIC_NEWSLETTER_URL=<listmonk base URL>`) plus redeploy. CI builds use provider `kit` with a placeholder form id.

### 8.1 Phase B infrastructure (future, before ~10,000 subscribers)

| Piece              | Choice                                                                                                                                                                                                                                                                                                                                               |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| List manager       | listmonk (Go binary) + PostgreSQL via Docker Compose. Double opt-in, campaigns, templates, unsubscribe, bounce processing, API.                                                                                                                                                                                                                      |
| Hosting            | One small AWS instance (Terraform provisions an optional Lightsail host) at `lists.serverless.fyi`, HTTPS via Caddy. Compose: PostgreSQL 17, listmonk v6.2.0, Caddy, backup container. The Caddyfile allowlists `/admin` and `/api` (except `/api/public`) by IP, and exposes only the SES webhook and `POST /api/campaigns` (for the draft Action). |
| Delivery           | Amazon SES (SMTP or API). Production access (out of sandbox) requested at the start of Sprint 9; approval can take days.                                                                                                                                                                                                                             |
| Sending domain     | `newsletter@serverless.fyi`; SES custom MAIL FROM `mail.serverless.fyi`. SPF, DKIM (Easy DKIM), DMARC `p=none`, moved to `quarantine` after 30 clean days.                                                                                                                                                                                           |
| Bounces/complaints | SES to SNS to listmonk bounce webhook. Hard bounces and complaints are blocklisted automatically.                                                                                                                                                                                                                                                    |
| Compliance         | Double opt-in; `List-Unsubscribe` + `List-Unsubscribe-Post` (one-click); physical address in footer (`email/template.html` still has `TODO(owner)` for it; required before Phase B sends); privacy page names the ESP.                                                                                                                               |
| Backups            | Nightly `pg_dump` to a versioned, encrypted S3 bucket, 30-day retention; monthly restore test.                                                                                                                                                                                                                                                       |
| Publishing flow    | After a successful deploy, `newsletter-draft.yml` runs `scripts/newsletter-draft.ts`, which finds newly added posts and calls the listmonk API to create a **draft** campaign from `email/template.html` + the post HTML. The owner reviews and sends. Never auto-send.                                                                              |
| IaC                | `infra/newsletter/`: Compose, Caddyfile, `backup.sh`/`restore.sh`, Terraform for SES identities, SNS topic, S3 bucket, KMS key, least-privilege IAM and an optional Lightsail instance. Secrets in AWS Secrets Manager or GitHub secrets only. Terraform state and `.terraform/` are git-ignored.                                                    |

Warm-up: import the Kit list export as already-confirmed subscribers keeping their signup timestamps (consent evidence). First issues go out in batches (25% / 50% / 100%) while watching bounce under 2% and complaints under 0.1%.

Subscriber data never enters the repo (see `docs/CONTENT_MIGRATION.md` section 10).

## 9. Search

Pagefind runs after the build in `integrations/pagefind.mjs`, writing `dist/pagefind/`. The search page is `/search/` (`src/pages/search.astro`): it renders an input and results container; on first interaction or when `?q=` is present it lazily imports the Pagefind JS API (`pagefind/pagefind.js` under the base) and renders results itself, with no Pagefind UI bundle. Header search links to `/search/`. Post pages ship no search JS until interaction. Indexing is scoped with `data-pagefind-body` on post and page bodies; stubs, 404, `/og/` and listing pages are excluded. `WebSite` JSON-LD declares `SearchAction` at `/search/?q={search_term_string}`. With JS disabled, `/search/` shows a plain message linking to `/archive/` and the sitemap.

## 10. OG images

`src/lib/og.ts` + `src/pages/og/[slug].png.ts`. For each post, satori renders a JSX/HTML tree (title, subtitle or date, author, site name, brand mark) to SVG; `@resvg/resvg-js` rasterizes to a 1200x630 PNG. A default site card is generated at `/og/default.png`. Fonts: Inter 400 and 700 Latin `.woff` files from `@fontsource/inter` (satori does not read WOFF2). The site itself uses system fonts. Titles are truncated by a pure function (unit-tested) so text never overflows. `og:image` is absolute (`SITE_URL` + base + `/og/<slug>.png`) with `og:image:width/height/alt`. `/og/` is disallowed in robots, excluded from the sitemap, and not indexed by Pagefind. Output is deterministic (no timestamps), so rebuilds do not churn artifacts. Native binaries (`resvg-js`) are installed per platform by pnpm; CI runs on `ubuntu-latest`.

## 11. Agent and feed surface

`/llms.txt`, `/llms-full.txt`, `/p/<slug>.md`, `/api/posts.json`, `/rss.xml` (alias `/feed.xml`), `/atom.xml`, `/feed.json`, `/t/<tag>/rss.xml`, `/.well-known/security.txt` (static file in `public/`), `/humans.txt`, `/site.webmanifest`. Specs live in `docs/SEO_AEO.md`. All are generated from the same content collection, so they cannot drift from the HTML pages.

## 12. Client JavaScript budget

Zero JS by default and no framework runtime. Allowed inline islands (ADR-026), each well under 2 KB: theme pre-paint plus toggle, subscribe enhancement, code-block wrap toggle (posts), click-to-load YouTube facade, `?page=N` redirect (archive), legacy-URL repair (404), and search (lazily imports Pagefind only on `/search/`). A post page ships about 3 KB of JS against the 30 KB budget. Any new island needs an ADR amendment.

## 13. Security and privacy

No cookies, no third-party scripts by default, no trackers. Analytics is optional and cookieless. Secrets: none in the repo or CI for deploy (OIDC); `BEEHIIV_API_KEY` stays local. Secret scanning and push protection on; lefthook blocks key patterns in commits. Subscriber CSVs are git-ignored (`subscribers*.csv`, `*.subscribers.csv`).

## Feeds index and hidden files

- `src/pages/feeds.astro` renders `/feeds/`, a human-readable index of every feed and agent endpoint, linked from the main nav as "RSS" (ADR-030). Feeds themselves stay unstyled XML or JSON; no XSLT.
- The deploy workflow uploads the Pages artifact with `include-hidden-files: true`, so `dist/.well-known/security.txt` is published (ADR-031). Without it, `actions/upload-pages-artifact` silently drops dot-folders.
