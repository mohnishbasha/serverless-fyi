> **Historical intent. Specs in docs/ supersede this file.**

# serverless.fyi — Beehiiv → GitHub Pages Migration & Rebuild Prompt

> **Owner:** Serverless Ventures LLC · Mohinish Shaikh (mohinish@serverlessvc.com)
> **Publication:** 2 Minute Serverless — "Data | AI | Distributed Systems | Start Ups"
> **Current host:** Beehiiv (https://www.serverless.fyi/)
> **Target host:** GitHub Pages, built by GitHub Actions, custom domain `www.serverless.fyi`
> **Repository:** `github.com/mohnishbasha/serverless-fyi`
> **Prompt version:** 1.3.0 · 2026-10-27
> **Hand this entire file to Claude Code (or any coding agent) as-is.** It is self-contained.

---

## Amendments (v1.2.0 → v1.3.0, 2026-10-27)

Owner decisions made on 2026-10-27 override the text below wherever they conflict (ADR-027 to ADR-031 in `docs/DECISIONS.md` are the source of truth):

1. **Newsletter provider = Kit (kit.com) free plan, replacing Beehiiv immediately (ADR-028).** Beehiiv's paid Lite plan (~$59/mo at 1k subscribers) is too expensive. Kit free is $0 up to 10,000 subscribers (unlimited broadcasts and forms; one basic automation, no sequences, no A/B tests, no third-party integrations, Kit branding). Site config: `PUBLIC_NEWSLETTER_PROVIDER=kit`, `PUBLIC_NEWSLETTER_ID=<Kit form id>`, optional `PUBLIC_NEWSLETTER_URL` (host from Kit's embed code, default `https://app.kit.com`); the form POSTs `email_address` to `<host>/forms/<id>/subscriptions`. Authenticate `serverless.fyi` in Kit (DKIM/SPF) and add DMARC `p=none`; send from `newsletter@serverless.fyi`. There is no automatic post-to-email on the free plan: the owner pastes each broadcast from the post's `/p/<slug>.md` twin. The self-hosted listmonk + Amazon SES stack (`infra/newsletter/`) remains the long-term target: migrate before ~10,000 subscribers. Beehiiv is decommissioned now (export, then cancel); its provider code stays in the adapter until removal is tracked.
2. **Serene UI theme (ADR-027):** calm white/mint base, sage green `#15803d`, sky-teal accent `#0e7490`, system fonts, no Tailwind.
3. **Responsive requirement (ADR-029):** every template works from 320px to 1440px+ with zero horizontal overflow and 44px tap targets, checked at 320 / 375 / 414 / 768 / 1024 / 1280 / 1440.
4. **RSS made visible (ADR-030):** the main navigation has an **RSS** link to a human-readable `/feeds/` page. It lists the RSS 2.0, Atom and JSON Feed URLs as copyable text, the per-topic RSS feeds, and the agent endpoints (`llms.txt`, `llms-full.txt`, `api/posts.json`). The subscribe page has a "Prefer RSS?" section. Feeds are **not** styled with XSLT, because Chrome is removing XSLT and warns on such pages.
5. **Dot-files must deploy (ADR-031):** the Pages artifact is uploaded with `include-hidden-files: true` so `/.well-known/security.txt` is published. `scripts/smoke.sh` checks it.
6. **SEO/AEO switch-on is a cutover step:** staging stays `noindex` with `PUBLIC_INDEXABLE=false`. At cutover set `SITE_URL=https://www.serverless.fyi`, `BASE_PATH=/`, `PUBLIC_INDEXABLE=true`, then submit the sitemap in Search Console and Bing, and run the IndexNow workflow once with `all: true`. Never set `PUBLIC_INDEXABLE=true` before DNS points to Pages, because the build would emit `CNAME`.
7. **Kit sending domain:** authenticate `serverless.fyi` in Kit (Settings → Email → Verified Sending Domains). Kit shows four records: a CNAME for SPF (`ckespa`), two DKIM CNAMEs and a DMARC TXT. Add them at GoDaddy (the DNS host); see `docs/RUNBOOK.md` § Kit domain authentication.
8. **Card thumbnails and a livelier home:** every post card shows its cover as a 16:9 thumbnail (`astro:assets` `<Picture>`, AVIF/WebP, lazy except the lead card, decorative `alt=""` because the title link names the post). Posts without a cover fall back to their OG image. The home page shows "Latest posts" first, led by a full-width **Latest issue** featured card, then "Start here".
9. **Analytics = Google Analytics 4 `G-DKDHH7T239` (ADR-032):** production builds only, loaded after the page `load` event, skipped when the browser sends Global Privacy Control or Do Not Track. Set via the `PUBLIC_GA_MEASUREMENT_ID` repo variable. The privacy page discloses GA cookies. This replaces the cookieless-analytics default in §2.1 and §9.6.


---

## 0. Execution Order (read first)

The first action you take when executing this prompt is to generate the five product specification documents listed in Step 1 below.

**If you are about to write code and Step 1 is not complete — stop.**

Rules that govern the whole build:

1. **Spec documents supersede this prompt.** Once `docs/PRD.md` exists it is the source of truth. If this prompt and a spec doc disagree, the spec doc wins, and you note the deviation in `docs/DECISIONS.md`.
2. **Every sprint ends with a gate.** Gates are hard stops. A gate is green only when every checkbox is checked and CI is green on `main`. Do not start sprint N+1 with a red gate.
3. **TDD is mandatory.** For every unit of behavior: write the failing test, run it, see it fail, implement, see it pass, refactor. Content-migration behavior is tested the same way (fixtures in, expected Markdown out).
4. **Spec Change Protocol.** Any PR that changes behavior updates the relevant spec doc *in the same PR*. A PR that changes behavior without a spec diff is rejected by review (and by the `spec-touch` CI check, §11.4).
5. **URL parity is sacred.** Every public URL that exists on the Beehiiv site today must resolve on the new site — either as the same page or as a redirect stub to its canonical replacement. Losing URLs loses search ranking and inbound links. This is enforced by an automated test (§10.3).
6. **Never break `main`.** All work lands via PR. No direct pushes, no force pushes.
7. **Ask before destroying.** Do not delete the Beehiiv publication, change DNS, or email subscribers. Those are owner actions, listed in §14 as manual steps.

---

## 1. Step 1 — Product Specification Documents (do this first)

Create these five files under `docs/`. Each must be complete enough that a new engineer could build the site from it alone.

| File | Contents |
|---|---|
| `docs/PRD.md` | Goals, non-goals, audiences (engineers, founders, AI/answer engines, search crawlers), page inventory, feature list with acceptance criteria, success metrics (§1.2), cutover definition of done. |
| `docs/ARCHITECTURE.md` | Stack (§2), directory layout (§4), build pipeline, deploy pipeline, base-path strategy for staging vs. production, newsletter provider integration, search, OG-image generation, constraints of GitHub Pages (no server redirects, no custom headers) and how each is handled. Include a Mermaid diagram of build → test → deploy. |
| `docs/CONTENT_MIGRATION.md` | Beehiiv export method (API first, sitemap scrape fallback), field mapping table, HTML→Markdown rules, image localization, tag normalization, legacy URL manifest format, subscriber export/import procedure, rollback plan. |
| `docs/SEO_AEO.md` | Every meta tag, JSON-LD type per page template, feeds, sitemap, robots policy (including AI crawlers), `llms.txt`/`llms-full.txt` spec, Markdown twins, canonical rules, redirect rules, Core Web Vitals budgets, Search Console + Bing Webmaster + IndexNow setup. |
| `docs/TEST_PLAN.md` | Test pyramid, every test suite (§10) with what it proves, tooling, thresholds, which run on PR vs. post-deploy vs. scheduled, and how to add a test for a new post template. |

Also create `docs/DECISIONS.md` (lightweight ADR log, one entry per decision in §2.2) and `docs/RUNBOOK.md` (how to publish a post, roll back a deploy, rotate secrets, fix a broken deploy).

### 1.1 Goals

- Own the content: every post lives as Markdown/MDX in git, versioned, reviewable, portable.
- Zero hosting cost: GitHub Pages + GitHub Actions.
- Rank at least as well as today, then better: preserve every URL, add structured data, feeds, sitemaps, fast pages.
- Be **agent-ready**: answer engines (ChatGPT, Claude, Perplexity, Gemini, Copilot) and coding agents can discover, read, and cite every post cleanly (§9).
- Fully responsive, accessible (WCAG 2.2 AA), dark-mode aware.
- Publishing a new issue = open a PR with one Markdown file. Merge → live in < 5 minutes.
- Keep the newsletter: email subscribers keep receiving issues (§8).

### 1.2 Success metrics (put in PRD)

| Metric | Target |
|---|---|
| Legacy URL parity | 100% of manifest URLs return 200 (page or redirect stub) |
| Lighthouse (mobile) | Performance ≥ 95, Accessibility = 100, Best Practices ≥ 95, SEO = 100 |
| LCP / CLS / INP (field, p75) | < 2.0 s / < 0.05 / < 200 ms |
| JS shipped on a post page | < 30 KB gzipped (excluding search, which lazy-loads) |
| Build time | < 3 min on GitHub-hosted runner |
| Broken links | 0 internal, 0 non-allowlisted external |
| Indexed pages (GSC) 30 days post-cutover | ≥ pre-migration count |

### 1.3 Non-goals

- No comments system, paywall, or premium tiers (v1).
- No server-side code. Everything is static.
- No CMS UI in v1 (optional Decap/Pages CMS is a v2 idea; note in PRD backlog).

---

## 2. Stack & Architectural Decisions

### 2.1 Stack

| Layer | Choice | Why |
|---|---|---|
| Static site generator | **Astro** (latest stable major; pin exact version in `package.json`) | Content collections with typed schemas, zero-JS by default, MDX, first-class sitemap/RSS, excellent Lighthouse scores. |
| Language | TypeScript, `strict: true` | Type-safe content schema and components. |
| Package manager | **pnpm** (version pinned via `packageManager` field + Corepack) | Fast, deterministic lockfile. |
| Runtime | Node.js **24 LTS** (pinned in `.nvmrc` and `engines`) | Current active LTS. |
| Styling | Plain CSS with custom properties + CSS layers; serene theme, system fonts, no Tailwind (ADR-011, ADR-027) | Small CSS, easy theming, no runtime. |
| Content | Markdown + MDX in `src/content/posts/` | Portable, diffable. |
| Search | **Pagefind** (static index built post-build, lazy-loaded UI) | Zero backend, tiny payload. |
| OG images | **satori** + **@resvg/resvg-js** at build time | Unique 1200×630 card per post. |
| Diagrams | Mermaid rendered at build time (`rehype-mermaid` or pre-rendered SVG) | No client JS for diagrams. |
| Code highlighting | Shiki (Astro built-in), dual light/dark theme | No client JS. |
| Image pipeline | `astro:assets` (`<Image>`/`<Picture>`) → AVIF/WebP, width/height always set | CLS = 0, small images. |
| Newsletter (email) | **Phased (§8):** **Kit free plan** now → **self-hosted listmonk + Amazon SES** before ~10,000 subscribers. Beehiiv decommissioned. Adapter keeps it swappable (ADR-028). | Owner wants off Beehiiv's cost now and to own the newsletter later. |
| Analytics | Cloudflare Web Analytics (cookieless) — optional, env-gated | No cookie banner needed. |
| Hosting | GitHub Pages via `actions/deploy-pages` | Free, HTTPS, custom domain. |
| CI | GitHub Actions | Already where the code lives. |
| Testing | Vitest (unit), Playwright (e2e + visual), @axe-core/playwright (a11y), Lighthouse CI, html-validate, lychee (links), custom parity/SEO validators | See §10. |
| Lint/format | ESLint (flat config) + `eslint-plugin-astro`, Prettier + `prettier-plugin-astro`, markdownlint-cli2, cspell, Vale (prose, optional) | Consistent code and prose. |
| Git hooks | lefthook + commitlint (Conventional Commits) | Enforced commit hygiene. |

### 2.2 Decisions to record in `docs/DECISIONS.md`

ADR-001 SSG = Astro · ADR-002 Hosting = GitHub Pages · ADR-003 URL scheme preserves Beehiiv paths (`/p/<slug>/`, `/t/<tag>/`) · ADR-004 Trailing slashes always · ADR-005 Canonical host = `https://www.serverless.fyi` (apex redirects to www, matching current canonical) · ADR-006 Newsletter: Kit free plan now → self-hosted listmonk + SES before ~10k subscribers; Beehiiv decommissioned now (superseded by ADR-028; §8, Sprints 9–10) · ADR-007 Redirects via static stubs (GitHub Pages has no server redirects) · ADR-008 Security headers via `<meta http-equiv>` where possible (GitHub Pages cannot set response headers; if real headers become required, front with Cloudflare proxy — documented, not done in v1) · ADR-009 AI crawlers allowed by default · ADR-010 Content license.

> **Repo visibility note:** GitHub Pages from a **private** repo requires a paid GitHub plan (Pro/Team/Enterprise). A public repo is free and also makes the content more discoverable to agents. Default: **public repo**, code MIT, content under the license chosen in ADR-010 (default: © Serverless Ventures LLC, all rights reserved, with excerpts allowed with attribution). Confirm with the owner before Sprint 1.

---

## 3. Current Site Inventory (from the live Beehiiv site)

Capture this in `docs/PRD.md` and build a machine-readable version during migration.

**Identity**
- Name: **2 Minute Serverless** · Tagline: *Freshly baked serverless nuggets in 2-minutes* · OG description: *Data | AI | Distributed Systems | Start Ups*
- Keywords: product management, software engineering, technology
- Author: Mohinish S (Mohinish Shaikh) · © Serverless Ventures LLC
- Theme color `#000000`; cloud-icon logo (download the original from Beehiiv media and commit to `public/brand/`).

**Social / sameAs**
- X/Twitter: https://twitter.com/mohinishbasha
- LinkedIn: https://www.linkedin.com/in/mohinishbasha
- YouTube: https://www.youtube.com/@TwoMinuteServerless
- GitHub: https://github.com/mohnishbasha

**Page types & URL patterns to preserve**

| Beehiiv URL | New page | Notes |
|---|---|---|
| `/` | Home: hero, latest posts, tag cloud, subscribe CTA | |
| `/p/<slug>` | Post page | Keep slug byte-for-byte (e.g. `post-quantum-cryptography-fd6d`). Serve at `/p/<slug>/`. |
| `/t/<tag>` | Tag listing | Beehiiv encodes `-` in tag slugs as `~` (`/t/distributed~systems`). Canonical new path `/t/distributed-systems/`; generate a redirect stub at `/t/distributed~systems/`. |
| `/archive`, `/archive?page=N` | Archive `/archive/`, `/archive/2/`, … | Query strings can't be routed statically: `/archive/` includes a tiny inline script that redirects `?page=N` → `/archive/N/`. |
| `/authors` | Author page with bio, photo, sameAs links | E-E-A-T signal. |
| `/subscribe` | Subscribe page with ESP form | |
| `/login`, `/upgrade`, account pages | Redirect stub → `/subscribe/` | |
| Beehiiv RSS (if enabled) | `/rss.xml`, `/feed.xml` (alias), `/atom.xml`, `/feed.json` | |

**Known tags:** video-streaming, iac, dns, apache-flink, apache-pulsar, rfm, distributed-systems, terraform, 2024, pqca, tax, qsbs, object-storage, distributed-filesystem, serverless-meetup, xrp, crypto.

**Known posts (sample — the migrator must discover all of them):**
- 2025-11-06 · Relational Foundation Models: Bridging Databases and AI — `/p/relational-foundation-models-bridging-databases-and-ai`
- 2025-11-05 · OpenHands: Declarative Automation for Developers — `/p/openhands-declarative-automation-for-developers`
- 2025-11-04 · Post-Quantum Cryptography — `/p/post-quantum-cryptography-fd6d`
- 2025-10-29 · Understanding the DNS Header — `/p/understanding-the-dns-header`
- 2025-03-24 · Netskope | Agentic AI: NextGen SRE Meetup — `/p/netskope-agentic-ai-nextgen-sre-meetup`
- 2025-02-09 · Serverless ft. AnChainAI | AI in Fintech & Security Meetup — `/p/serverless-ft-anchainai-ai-in-fintech-security-meetup`
- 2025-01-02 · Reflecting on 2024: Growth, Learning, and Milestones — `/p/reflecting-on-2024-growth-learning-and-milestones`
- 2024-12-25 · Using Terraform Null Resource vs External Data vs Custom Provider: A Deep Dive — `/p/using-terraform-null-resource-vs-external-data-vs-custom-provider-a-deep-dive`
- 2024-12-25 · Ensuring Distributed System Reliability with Jepsen — `/p/ensuring-distributed-system-reliability-with-jepsen`
- 2024-12-15 · Vector Clocks in Distributed Systems — `/p/vector-clocks-in-distributed-systems`
- 2024-12-11 · Understanding RTMP, HLS, and RTSP: A Guide to Streaming Protocols — `/p/understanding-rtmp-hls-and-rtsp-a-guide-to-streaming-protocols`
- 2024-12-09 · Distributed File System — `/p/distributed-file-system`
- …plus archive page 2 (older posts). Use the Beehiiv sitemap/API as the authoritative list.

---

## 4. Repository Layout

Generate exactly this structure (add files as needed, never remove these):

```
serverless-fyi/
├── .claude/
│   ├── settings.json              # permissions + hooks for Claude Code
│   ├── commands/                  # slash commands
│   │   ├── new-post.md
│   │   ├── migrate.md
│   │   ├── audit-seo.md
│   │   ├── ship.md
│   │   └── fix-ci.md
│   ├── agents/                    # subagents
│   │   ├── seo-aeo-reviewer.md
│   │   ├── content-migrator.md
│   │   ├── a11y-reviewer.md
│   │   └── release-manager.md
│   └── skills/                    # Claude Code skills (SKILL.md each)
│       ├── write-post/SKILL.md
│       ├── migrate-beehiiv/SKILL.md
│       ├── seo-aeo-audit/SKILL.md
│       └── release/SKILL.md
├── .agent/
│   └── skills/                    # harness-agnostic skills (Pi, Goose, OpenCode)
│       ├── run-tests/SKILL.md
│       ├── check-types/SKILL.md
│       ├── new-post/SKILL.md
│       └── verify-deploy/SKILL.md
├── .github/
│   ├── workflows/
│   │   ├── ci.yml                 # PR checks
│   │   ├── deploy.yml             # main → GitHub Pages
│   │   ├── smoke.yml              # post-deploy + every 6h against live site
│   │   ├── links.yml              # weekly external link check
│   │   ├── lighthouse.yml         # (job inside ci.yml; separate file optional)
│   │   ├── indexnow.yml           # ping IndexNow on deploy
│   │   ├── release.yml            # tag → GitHub Release
│   │   └── codeql.yml
│   ├── ISSUE_TEMPLATE/
│   │   ├── bug.yml
│   │   ├── content-idea.yml
│   │   └── config.yml
│   ├── PULL_REQUEST_TEMPLATE.md
│   ├── CODEOWNERS
│   ├── dependabot.yml
│   ├── labeler.yml
│   └── copilot-instructions.md    # for GitHub Copilot agent
├── .cursor/rules/project.mdc      # mirrors AGENTS.md essentials for Cursor
├── docs/
│   ├── PRD.md  ARCHITECTURE.md  CONTENT_MIGRATION.md  SEO_AEO.md  TEST_PLAN.md
│   ├── DECISIONS.md  RUNBOOK.md  STYLE_GUIDE.md
├── migration/
│   ├── fetch-beehiiv.ts           # API exporter
│   ├── scrape-beehiiv.ts          # sitemap-based fallback
│   ├── html-to-md.ts              # Beehiiv HTML → clean Markdown
│   ├── localize-images.ts         # download + rewrite image URLs
│   ├── build-manifest.ts          # legacy-urls.json
│   ├── fixtures/                  # sample Beehiiv HTML + expected MD
│   └── legacy-urls.json           # generated, committed
├── public/
│   ├── CNAME                      # www.serverless.fyi (added at cutover)
│   ├── brand/  (logo, favicon set, apple-touch-icon)
│   ├── .well-known/security.txt
│   └── <indexnow-key>.txt
├── scripts/
│   ├── check-versions.sh
│   ├── validate-seo.ts            # structured data + meta assertions over dist/
│   ├── validate-parity.ts         # legacy URL parity over dist/
│   ├── validate-feeds.ts
│   ├── smoke.sh                   # curl-based live checks
│   └── new-post.ts                # scaffolds a post
├── src/
│   ├── content.config.ts          # collections + zod schema
│   ├── content/posts/<slug>/index.mdx (+ images alongside)
│   ├── content/authors/mohinish.json
│   ├── components/  (BaseHead, SEO, JsonLd, PostCard, TagList, Subscribe, TOC, Tldr, Faq, Header, Footer, ThemeToggle, Search, Pagination, Breadcrumbs)
│   ├── layouts/  (BaseLayout.astro, PostLayout.astro)
│   ├── lib/  (site.ts, urls.ts, seo.ts, jsonld.ts, reading-time.ts, tags.ts, og.ts, newsletter/)
│   ├── pages/
│   │   ├── index.astro
│   │   ├── p/[slug].astro
│   │   ├── p/[slug].md.ts          # Markdown twin (agent-readable)
│   │   ├── t/[tag]/[...page].astro
│   │   ├── archive/[...page].astro
│   │   ├── authors.astro
│   │   ├── subscribe.astro
│   │   ├── about.astro  privacy.astro  404.astro  feeds.astro (v1.3.0)
│   │   ├── rss.xml.ts  atom.xml.ts  feed.json.ts
│   │   ├── llms.txt.ts  llms-full.txt.ts
│   │   ├── robots.txt.ts
│   │   ├── api/posts.json.ts        # machine index
│   │   ├── og/[slug].png.ts
│   │   └── redirects/ (generated stubs via integration, see §7.4)
│   └── styles/  (tokens.css, base.css, prose.css, components.css)
├── tests/
│   ├── unit/        (vitest)
│   ├── e2e/         (playwright)
│   ├── visual/      (playwright snapshots)
│   └── fixtures/
├── AGENTS.md  AGENT.md -> AGENTS.md (symlink)
├── CLAUDE.md  PROMPT.md  SOUL.md  SKILLS.md
├── README.md  CONTRIBUTING.md  CHANGELOG.md  CODE_OF_CONDUCT.md  SECURITY.md
├── LICENSE  CONTENT_LICENSE.md  THIRD_PARTY_LICENSES.md
├── astro.config.mjs  tsconfig.json  package.json  pnpm-lock.yaml
├── eslint.config.js  .prettierrc  .prettierignore  .markdownlint-cli2.jsonc
├── cspell.json  .vale.ini (optional)  lefthook.yml  commitlint.config.js
├── lighthouserc.json  playwright.config.ts  vitest.config.ts  .htmlvalidate.json  lychee.toml
├── .editorconfig  .nvmrc  .gitignore  .gitattributes
```

`PROMPT.md` is a verbatim copy of this file, committed so every future agent session can read the original intent.


---

## 5. Content Model

### 5.1 `src/content.config.ts`

```ts
import { defineCollection, reference } from 'astro:content';
import { glob, file } from 'astro/loaders';
import { z } from 'astro/zod';

const posts = defineCollection({
  loader: glob({ pattern: '**/index.{md,mdx}', base: './src/content/posts' }),
  schema: ({ image }) =>
    z.object({
      title: z.string().min(5).max(110),
      subtitle: z.string().max(200).optional(),
      // SEO description: 70–160 chars, enforced
      description: z.string().min(70).max(160),
      slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/), // must equal Beehiiv slug for migrated posts
      pubDate: z.coerce.date(),
      updatedDate: z.coerce.date().optional(),
      author: reference('authors').default('mohinish'),
      tags: z.array(z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)).min(1).max(6),
      cover: image().optional(),
      coverAlt: z.string().optional(),
      // AEO fields — rendered visibly AND as structured data
      tldr: z.string().min(40).max(320).optional(),    // 1–3 sentence direct answer (required unless aeoPending)
      keyTakeaways: z.array(z.string()).max(6).default([]),
      faq: z.array(z.object({ q: z.string(), a: z.string() })).max(8).default([]),
      aeoPending: z.boolean().default(false),          // migrated post awaiting owner-written tldr/takeaways
      // provenance
      beehiivId: z.string().optional(),
      beehiivUrl: z.string().url().optional(),
      canonical: z.string().url().optional(),         // only if republished elsewhere first
      draft: z.boolean().default(false),
      noindex: z.boolean().default(false),
      series: z.string().optional(),
    })
    .refine((d) => !d.cover || !!d.coverAlt, { message: 'coverAlt is required when cover is set' })
    .refine((d) => d.aeoPending || (!!d.tldr && d.keyTakeaways.length >= 2),
      { message: 'tldr and ≥2 keyTakeaways are required unless aeoPending: true' }),
});

const authors = defineCollection({
  loader: file('./src/content/authors/authors.json'),
  schema: z.object({
    id: z.string(),
    name: z.string(),
    shortName: z.string(),
    jobTitle: z.string(),
    bio: z.string(),
    avatar: z.string(),
    url: z.string().url(),
    sameAs: z.array(z.string().url()),
    knowsAbout: z.array(z.string()),
  }),
});

export const collections = { posts, authors };
```

> If the pinned Astro version's API differs (e.g. loader import paths), follow the current Astro docs and record the deviation in `docs/DECISIONS.md`. Do not downgrade Astro to match this snippet.

### 5.2 Example post frontmatter

```mdx
---
title: "Understanding the DNS Header"
subtitle: "The Tiny Packet That Runs the Internet"
description: "A byte-by-byte walkthrough of the 12-byte DNS header — ID, flags, opcodes, RCODEs and counts — and why each field matters for resolvers."
slug: understanding-the-dns-header
pubDate: 2025-10-29
tags: [dns, networking]
cover: ./cover.png
coverAlt: "Diagram of the 12-byte DNS header fields"
tldr: "Every DNS message starts with a fixed 12-byte header: a 16-bit ID, a flags word (QR, Opcode, AA, TC, RD, RA, Z, RCODE) and four 16-bit section counts."
keyTakeaways:
  - "The ID field matches responses to queries."
  - "The TC bit signals truncation and triggers a TCP retry."
faq:
  - q: "How big is a DNS header?"
    a: "Exactly 12 bytes, regardless of the message size."
beehiivUrl: https://www.serverless.fyi/p/understanding-the-dns-header
---
```

### 5.3 Authoring rules (put in `docs/STYLE_GUIDE.md`)

- One H1 per page (the title, rendered by the layout). Body starts at H2. No skipped heading levels.
- Every image has meaningful `alt`; decorative images use `alt=""`.
- First paragraph after the TL;DR answers the title's implicit question directly (answer-first writing for AEO).
- Use descriptive link text, never "click here".
- Code blocks always have a language tag.
- Target 2-minute read (≈ 400–600 words) to honor the brand; long deep-dives get a TOC automatically when > 1,200 words.

---

## 6. Migration from Beehiiv (Sprint 2)

### 6.1 Export strategy (in order of preference)

1. **Beehiiv API v2** (`migration/fetch-beehiiv.ts`)
   - `GET https://api.beehiiv.com/v2/publications/{PUBLICATION_ID}/posts?status=confirmed&limit=100&page=N&expand[]=free_web_content`
   - Auth: `Authorization: Bearer $BEEHIIV_API_KEY` (from `.env.local`, never committed; GitHub secret only if the exporter ever runs in CI — it should not).
   - Map: `title`, `subtitle`, `slug`, `web_url`, `publish_date` (unix → ISO), `content_tags`, `thumbnail_url`, `authors`, `content.free.web` (HTML), `meta_default_description`.
   - Save raw JSON to `migration/raw/` (git-ignored) for reproducibility.
2. **Sitemap scrape fallback** (`migration/scrape-beehiiv.ts`) — if the API plan doesn't allow post content:
   - Fetch `https://www.serverless.fyi/sitemap.xml` (and any child sitemaps), collect every `/p/` and `/t/` URL.
   - Fetch each post page politely (1 req/s, identify with a UA string), extract the article body container, title, subtitle, date, tags, OG image.
3. **Manual export** (Beehiiv dashboard → Settings → export posts/subscribers) as the last resort and for the subscriber CSV in any case.

### 6.2 HTML → Markdown (`migration/html-to-md.ts`)

Use `unified` + `rehype-parse` + `rehype-remark` + `remark-gfm` + `remark-stringify` (or `turndown` + `turndown-plugin-gfm`; pick one, record in ADR). Rules, each with a fixture test in `migration/fixtures/`:

- Strip Beehiiv chrome: subscribe widgets, "Powered by beehiiv", share bars, poll/survey embeds, tracking pixels, `utm_*` params on internal links.
- Unwrap Beehiiv layout `<div>`/`<table>` wrappers; keep semantic tables as GFM tables.
- Preserve code blocks; detect language from class names or content heuristics; default `text`.
- Convert Beehiiv buttons to plain links.
- Convert YouTube/X/GitHub embeds to MDX components (`<YouTube id="…" />`, `<Tweet id="…" />`) — no third-party JS until click (facade pattern).
- Rewrite internal absolute links `https://www.serverless.fyi/p/x` → `/p/x/`.
- Leave prose untouched; never "improve" the author's writing during migration.
- Generate `description` from `meta_default_description` or the subtitle; if shorter than 70 chars, flag it in `migration/report.md` for the owner to write. **Do not invent content.** For `tldr`/`keyTakeaways`, the migrator writes `TODO(owner)` placeholders and a CI check blocks production deploy until each is filled **or** the post is marked `aeoPending: true` (then those blocks are hidden and JSON-LD omits them). Add `aeoPending` to the schema.

### 6.3 Images (`migration/localize-images.ts`)

- Download every `media.beehiiv.com` / `beehiiv-images-production.s3…` image into the post folder, hashed filenames.
- Strip Cloudflare `cdn-cgi/image/...` transform prefixes to fetch the original.
- Rewrite references to relative imports so `astro:assets` optimizes them.
- Fail the migration if any remote Beehiiv image URL remains (`grep` assertion in a unit test).

### 6.4 Tags

- Normalize to kebab-case: `distributed~systems` → `distributed-systems`. Store mapping in `migration/tag-map.json` and use it to generate redirect stubs.
- Each tag gets an optional description file `src/content/tags/<tag>.md` (used for tag page intro + meta description). Default description template if missing.

### 6.5 Legacy URL manifest (`migration/legacy-urls.json`)

```json
[
  { "old": "/p/understanding-the-dns-header", "new": "/p/understanding-the-dns-header/", "type": "same" },
  { "old": "/t/distributed~systems", "new": "/t/distributed-systems/", "type": "redirect" },
  { "old": "/archive", "new": "/archive/", "type": "same" },
  { "old": "/authors", "new": "/authors/", "type": "same" },
  { "old": "/subscribe", "new": "/subscribe/", "type": "same" },
  { "old": "/login", "new": "/subscribe/", "type": "redirect" }
]
```

Built from the Beehiiv sitemap **plus** every URL seen during the scrape. This file is the input to the parity test (§10.3) and must be committed.

### 6.6 Migration report

`migration/report.md` lists: post count, image count, posts with missing descriptions, posts with `aeoPending`, embeds converted, links rewritten, warnings. The owner reviews it in the Sprint 2 PR.

---

## 7. Site Build: Pages, Layout, Responsive Design

### 7.1 `astro.config.mjs`

```js
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import legacyRedirects from './integrations/legacy-redirects.mjs';
import pagefind from './integrations/pagefind.mjs';

const SITE = process.env.SITE_URL ?? 'https://www.serverless.fyi';
const BASE = process.env.BASE_PATH ?? '/';          // '/serverless-fyi/' for staging on github.io

export default defineConfig({
  site: SITE,
  base: BASE,
  trailingSlash: 'always',
  build: { format: 'directory' },
  prefetch: { prefetchAll: false, defaultStrategy: 'hover' },
  markdown: {
    shikiConfig: { themes: { light: 'github-light', dark: 'github-dark' } },
  },
  integrations: [
    mdx(),
    sitemap({
      filter: (page) => !page.includes('/og/') && !page.includes('/redirects/'),
      changefreq: 'weekly',
      lastmod: new Date(),
    }),
    legacyRedirects(),   // writes static redirect stubs from migration/legacy-urls.json
    pagefind(),          // runs pagefind on dist/ after build
  ],
});
```

**Every internal URL goes through `src/lib/urls.ts`** (`url('/p/x/')` prepends `import.meta.env.BASE_URL`). An ESLint rule (`no-restricted-syntax` on string literals starting with `"/` in `href`) or a unit test that scans `dist/` for root-relative links not prefixed with BASE prevents staging breakage.

### 7.2 Templates

| Template | Must contain |
|---|---|
| `BaseLayout` | `<html lang="en">`, skip link, header (logo, Posts, Archive, Tags, About, Search, Subscribe button, theme toggle), `<main id="main">`, footer (social links, RSS, © Serverless Ventures LLC, privacy, llms.txt link). |
| Home | Hero (name, tagline, subscribe form), latest 10 posts as cards, tag cloud, "Start here" (3 pinned posts, configurable in `site.ts`). |
| Post | Breadcrumbs, title (H1), subtitle, author + date + updated + reading time, cover image (LCP, `fetchpriority="high"`, not lazy), **TL;DR box**, **Key takeaways**, auto TOC (> 1,200 words), body, **FAQ** section (if any), tags, prev/next, related posts (by shared tags), subscribe CTA, "Read as Markdown" link (`/p/<slug>.md`), share links (plain URLs, no SDKs). |
| Tag | Intro, paginated cards (10/page), JSON-LD `CollectionPage`. |
| Archive | All posts grouped by year, paginated (20/page) + inline `?page=N` redirect. |
| Authors | Bio, photo, `knowsAbout`, sameAs links, list of posts. JSON-LD `ProfilePage` + `Person`. |
| Subscribe | ESP form, what you get, frequency, privacy note, recent issues. |
| 404 | Search box, popular posts, and a small script that tries known legacy patterns (`/p/<slug>` without slash, `~` tags) before showing the 404 content. GitHub Pages serves `404.html` for any miss. |

### 7.3 Responsive & visual design

- Mobile-first CSS; breakpoints via container queries where components need them, media queries at `40rem`, `64rem`.
- Fluid type with `clamp()`; prose measure `max-width: 68ch`; base font size ≥ 16 px; line-height 1.6 for prose.
- Tap targets ≥ 44×44 px (standalone links and controls: `.more-link`, `.link-list`; subscribe input + button full width below `30rem`); no horizontal scroll from 320 px to 1440 px+ (audited at 320, 375, 414, 768, 1024, 1280, 1440; tested, §10.4; ADR-029). Mobile shows a second scrollable nav row.
- Serene palette (ADR-027): white/mint base, sage green brand `#15803d`, sky-teal accent `#0e7490`, soft mint → sky → lavender page-top wash, pastel pills, mint TL;DR, frosted sticky header at ≥ `64rem`, gentle card hover lift (off under `prefers-reduced-motion`), deep green-slate dark mode.
- System font stack by default (zero font requests). If a brand font is used, self-host one variable WOFF2, `font-display: swap`, preload it, subset Latin.
- Dark mode: `prefers-color-scheme` + manual toggle persisted in `localStorage` (try/catch), applied before paint via a tiny inline script to avoid flash.
- Color tokens in `tokens.css`; every text/background pair ≥ 4.5:1 contrast (tested by axe).
- Respect `prefers-reduced-motion`.
- Tables scroll horizontally inside a wrapper on small screens; code blocks wrap-toggle; images `max-width: 100%; height: auto`.
- Print stylesheet for posts (hide nav/CTA, show link URLs).
- Run the `frontend-design` mindset: distinctive but restrained — the brand is "2-minute nuggets", so prioritize scannability: big readable headings, the TL;DR box visually prominent, generous whitespace.

### 7.4 Redirect stubs (GitHub Pages has no server redirects)

`integrations/legacy-redirects.mjs` runs on `astro:build:done` and, for every manifest entry with `type: "redirect"`, writes `dist/<old>/index.html`:

```html
<!doctype html><html lang="en"><head>
<meta charset="utf-8">
<title>Redirecting…</title>
<link rel="canonical" href="https://www.serverless.fyi/t/distributed-systems/">
<meta name="robots" content="noindex">
<meta http-equiv="refresh" content="0; url=/t/distributed-systems/">
<script>location.replace('/t/distributed-systems/' + location.hash)</script>
</head><body><a href="/t/distributed-systems/">This page moved here.</a></body></html>
```

(Respect `BASE` in both URLs.) Redirect stubs are excluded from the sitemap. Unit-test the generator.

Also: legacy `/p/<slug>` (no trailing slash) is handled natively — GitHub Pages serves `/p/<slug>/index.html` with a 301 to the slash URL.

---

## 8. Newsletter (email) Integration

**Goal:** the owner runs the newsletter himself and stops paying Beehiiv (~$50/month). `serverless.fyi` stays the domain for both the website and the email sender. GitHub Pages hosts the website; email is phased:

| Phase | When | Website | Email sender | Subscribe form posts to |
|---|---|---|---|---|
| A — Kit free | Now (cutover, Sprint 7) → until ~10,000 subscribers | GitHub Pages | **Kit free plan** (manual broadcasts; Beehiiv decommissioned now) | Kit form `<host>/forms/<id>/subscriptions` (`email_address`) |
| B — Self-hosted | Before ~10,000 subscribers (Sprint 9, deferred) | GitHub Pages | **listmonk + Amazon SES** | listmonk public subscription endpoint |
| Fallback | Any time | GitHub Pages | none | — (`provider=none`: shows "issues paused, follow via RSS / LinkedIn / YouTube") |

Build an adapter so the provider is one env variable:

```ts
// src/lib/newsletter/index.ts
export type Provider = 'beehiiv' | 'listmonk' | 'buttondown' | 'kit' | 'none';
export const provider = (import.meta.env.PUBLIC_NEWSLETTER_PROVIDER ?? 'none') as Provider;
export const formConfig = { /* action URL, field names, list IDs, honeypot per provider */ };
```

- `Subscribe.astro` renders a **plain HTML `<form>`** that POSTs to the provider's public endpoint (works with JS disabled). Progressive enhancement: JS submits via `fetch` and shows inline success/error. Include a honeypot field, `autocomplete="email"`, `inputmode="email"`, labelled input, `aria-live` status region. When `provider=none`, render the RSS/social follow block instead of a form.
- No API keys in the client bundle — only public IDs (`PUBLIC_*` env).
- **Subscriber list is exported in Sprint 2** (👤 Beehiiv CSV with signup dates, status, tags) and stored in a private location outside the repo, regardless of phase. Never commit subscriber data.

### 8.1 Phase B — self-hosted stack (Sprint 9)

| Piece | Choice | Notes |
|---|---|---|
| List manager | **listmonk** (open-source, single Go binary + PostgreSQL) | Subscribers, double opt-in, campaigns, templates, unsubscribe, bounce processing, API. |
| Hosting | Small AWS instance (Lightsail/EC2 or ECS Fargate) running listmonk + Postgres via Docker Compose, at `lists.serverless.fyi` behind HTTPS (Caddy or ALB) | Owner already uses AWS. Admin UI behind strong password + IP allowlist or Cloudflare Access. |
| Delivery | **Amazon SES** (SMTP or API) | Pay-per-email; request production access (out of sandbox) early — approval can take days. |
| Sending domain | `serverless.fyi` (e.g. `newsletter@serverless.fyi`), SES custom MAIL FROM `mail.serverless.fyi` | SPF, DKIM (SES Easy DKIM), DMARC (`p=none` → `quarantine` after 30 clean days). |
| Bounces/complaints | SES → SNS → listmonk bounce webhook | Auto-blocklist hard bounces and complaints. |
| Compliance | Double opt-in, one-click `List-Unsubscribe` + `List-Unsubscribe-Post` headers, physical mailing address in footer (CAN-SPAM), privacy page update | Required by Gmail/Yahoo bulk-sender rules. |
| Backups | Nightly `pg_dump` to S3 (versioned, encrypted, 30-day retention); monthly restore test | The list is the business asset. |
| Publishing flow | GitHub Action on deploy: for each newly published post, call the listmonk API to create a **draft** campaign from the post's HTML (email template in repo at `email/template.html`). Owner reviews and sends from listmonk. | Never auto-send. |
| Infra as code | `infra/newsletter/` — Docker Compose, Caddyfile, Terraform for SES identities, SNS topic, S3 backup bucket, IAM user with least privilege | Lives in this repo; secrets only in AWS Secrets Manager / GitHub secrets. |

Warm-up: import the Beehiiv list as already-confirmed subscribers (they opted in on Beehiiv; keep their signup timestamps as consent evidence), then send the first issues in batches (e.g. 25% / 50% / 100% over three sends) while watching SES bounce and complaint rates (keep bounce < 2%, complaints < 0.1%).

## 9. SEO, AEO & Agent-Readiness

### 9.1 Per-page `<head>` (component `SEO.astro`) — assert every item in tests

- `<title>`: post `"{title} | 2 Minute Serverless"` (≤ 60 chars target; truncate site suffix if needed); home `"2 Minute Serverless — Data, AI & Distributed Systems in 2 Minutes"`.
- `<meta name="description">` 70–160 chars.
- `<link rel="canonical">` absolute, with trailing slash, built from `SITE_URL` (staging builds are `noindex`, so their canonicals never compete).
- Open Graph: `og:type` (`article`/`website`), `og:title`, `og:description`, `og:url`, `og:image` (1200×630 generated, absolute), `og:image:alt`, `og:site_name`, `article:published_time`, `article:modified_time`, `article:author`, `article:tag`.
- Twitter: `summary_large_image`, `twitter:site` / `twitter:creator` = `@mohinishbasha`.
- `<meta name="theme-color">` light + dark variants; `<meta name="color-scheme" content="light dark">`.
- `<link rel="alternate" type="application/rss+xml" href="/rss.xml">`, Atom, JSON Feed.
- `<link rel="alternate" type="text/markdown" href="/p/<slug>.md">` on posts (agent-readable twin).
- `<meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1">` (or `noindex` for drafts/staging/stubs).
- Favicons: SVG favicon, 32×32 PNG, 180×180 apple-touch-icon, `site.webmanifest`.
- `<link rel="sitemap" href="/sitemap-index.xml">`.

### 9.2 Structured data (JSON-LD, one `@graph` per page)

| Page | Types |
|---|---|
| All | `WebSite` (with `SearchAction` → `/search/?q={search_term_string}` if a search page exists), `Organization` (Serverless Ventures LLC, logo, sameAs) |
| Post | `BlogPosting` (headline, description, image[], datePublished, dateModified, author → `Person`, publisher → `Organization`, mainEntityOfPage, keywords, articleSection, wordCount, inLanguage, isPartOf → `Blog`), `BreadcrumbList`, `FAQPage` (only if `faq` non-empty and visible on page) |
| Tag | `CollectionPage` + `ItemList` + `BreadcrumbList` |
| Archive / Home | `Blog` + `ItemList` |
| Authors | `ProfilePage` with `mainEntity` → `Person` (name, jobTitle, url, image, sameAs, knowsAbout, worksFor → Organization) |

Structured data must match visible content (no hidden FAQ). `scripts/validate-seo.ts` parses every `dist/**/*.html`, extracts JSON-LD, validates required properties per type, and fails CI on any error. (Note in SEO_AEO.md: Google restricts FAQ rich results, but FAQ markup still helps answer engines parse Q&A.)

### 9.3 Feeds

- `/rss.xml` (RSS 2.0, full content via `content:encoded`, absolute URLs, categories = tags), `/atom.xml`, `/feed.json` (JSON Feed 1.1). Last 50 posts, full HTML content.
- `/t/<tag>/rss.xml` per tag.
- `/feeds/` — human-readable index of all feeds (RSS nav link). No XSLT styling (v1.3.0).
- Validate all feeds in CI (`scripts/validate-feeds.ts`: well-formed XML, required elements, absolute links, no relative image src).

### 9.4 Sitemap & robots

- `@astrojs/sitemap` → `/sitemap-index.xml` with `lastmod` from `updatedDate ?? pubDate` (implement via `serialize`).
- `robots.txt` generated from env:

```txt
# Production (PUBLIC_INDEXABLE=true)
User-agent: *
Allow: /
Disallow: /og/

# AI / answer engines — explicitly welcome
User-agent: GPTBot
Allow: /
User-agent: OAI-SearchBot
Allow: /
User-agent: ChatGPT-User
Allow: /
User-agent: ClaudeBot
Allow: /
User-agent: Claude-User
Allow: /
User-agent: Claude-SearchBot
Allow: /
User-agent: PerplexityBot
Allow: /
User-agent: Perplexity-User
Allow: /
User-agent: Google-Extended
Allow: /
User-agent: Applebot-Extended
Allow: /
User-agent: CCBot
Allow: /

Sitemap: https://www.serverless.fyi/sitemap-index.xml
```

Staging (`PUBLIC_INDEXABLE=false`) → `User-agent: *\nDisallow: /` and every page gets `noindex`. Record the AI-crawler policy in ADR-009 so the owner can flip individual bots to `Disallow`.

### 9.5 Agent-ready endpoints (AEO)

| Endpoint | Purpose |
|---|---|
| `/llms.txt` | Per the llmstxt.org convention: H1 site name, blockquote summary, sections "Start here", "Posts by topic" (each `- [Title](https://www.serverless.fyi/p/slug.md): one-line tldr`), "About", "Optional". |
| `/llms-full.txt` | All published posts concatenated as clean Markdown with title, URL, date, tags headers. Keep < 5 MB. |
| `/p/<slug>.md` | Markdown twin of each post (frontmatter-lite header + body), `Content-Type` will be `text/markdown` by extension. |
| `/api/posts.json` | Machine index: `[{slug,title,description,tldr,tags,pubDate,updatedDate,url,markdownUrl,ogImage}]`. |
| `/feed.json` | JSON Feed for agents that prefer JSON. |
| `/.well-known/security.txt` | Contact + expiry. |
| `/humans.txt` | Credits (optional). |

Writing for answer engines (enforced by the `seo-aeo-reviewer` subagent and documented in STYLE_GUIDE):
- Answer-first: TL;DR box at top states the answer in 1–3 sentences.
- Question-shaped H2s where natural ("What is a vector clock?").
- Definitions in one sentence before elaboration; concrete numbers, versions, and dates.
- Show `updatedDate` visibly when content is refreshed.
- Author entity consistency: same name, photo, and sameAs everywhere.
- Semantic HTML: `<article>`, `<time datetime>`, `<figure>/<figcaption>`, `<nav aria-label>`, `<aside>` for TL;DR.

### 9.6 Performance (Core Web Vitals)

- Zero client JS by default. Allowed islands: theme toggle (inline, < 1 KB), subscribe enhancement, Pagefind UI (loaded on first interaction with search), legacy-redirect snippet on 404/archive.
- Cover image = LCP: eager, `fetchpriority="high"`, AVIF/WebP, explicit width/height; all others `loading="lazy" decoding="async"`.
- Inline critical CSS (Astro default for small styles); total CSS < 30 KB.
- Embeds use click-to-load facades.
- Budgets enforced by Lighthouse CI (§10.5).

### 9.7 Search engine onboarding (owner + agent)

- Google Search Console: verify `serverless.fyi` as a **Domain property** via DNS TXT (survives the host change); submit sitemap after cutover; use "Change of address" not needed (same domain).
- Bing Webmaster Tools: import from GSC; enable **IndexNow** — `public/<key>.txt` + `indexnow.yml` pings changed URLs on each deploy.
- Monitor Coverage/Pages report daily for 2 weeks after cutover.


---

## 10. Testing & Sanity Checks

Test pyramid (document in `docs/TEST_PLAN.md`). All of §10.1–10.6 run on every PR; §10.7 runs post-deploy and on a schedule.

### 10.1 Static checks

- `pnpm typecheck` → `astro check && tsc --noEmit`
- `pnpm lint` → ESLint, Prettier `--check`, markdownlint-cli2, cspell (custom dictionary in `cspell.json`: Beehiiv, Jepsen, Pulsar, Flink, QSBS, PQCA, RTMP, etc.)
- Content schema validation happens in `astro build` (zod) — a malformed post fails the build.

### 10.2 Unit tests (Vitest) — `tests/unit/`

- `urls.test.ts` — `url()` respects BASE, always adds trailing slash, never double-slashes.
- `seo.test.ts` — title truncation, description bounds, canonical builder.
- `jsonld.test.ts` — BlogPosting/Person/Breadcrumb builders produce required props.
- `tags.test.ts` — `~` → `-` normalization, tag-map round trip.
- `reading-time.test.ts`.
- `html-to-md.test.ts` — every fixture in `migration/fixtures/*.html` converts to its `*.expected.md` (golden tests). Covers code blocks, tables, embeds, Beehiiv chrome stripping, internal link rewrite.
- `localize-images.test.ts` — no remote Beehiiv URLs survive.
- `redirect-stub.test.ts` — stub HTML has canonical, noindex, meta refresh, JS replace, respects BASE.
- `robots.test.ts` — staging vs production output.
- `llms.test.ts` — llms.txt structure (H1, blockquote, link list), every published post present.

### 10.3 Build-output validators (run against `dist/` after `pnpm build`)

- `scripts/validate-parity.ts` — for every entry in `migration/legacy-urls.json`, assert `dist/<path>/index.html` exists; if `type: redirect`, assert it targets `new` and `new` exists. **100% required.**
- `scripts/validate-seo.ts` — for every non-stub HTML file: exactly one `<h1>`, `<title>` present and unique across site, meta description 70–160 and unique, canonical absolute + matches path, OG/Twitter tags present, `og:image` file exists in `dist/`, JSON-LD parses and has required props, `lang` attribute, no `noindex` on production builds except stubs/drafts.
- `scripts/validate-feeds.ts` — RSS/Atom/JSON Feed validity and absolute URLs.
- `html-validate` over `dist/**/*.html` (config `.htmlvalidate.json`, extends `html-validate:recommended`, `prettier` preset).
- **Internal link check**: `lychee --offline --base dist dist` (zero broken internal links, anchors included).
- **Asset sanity**: no file in `dist/` > 1 MB except allowlisted; no `media.beehiiv.com` string anywhere in `dist/`; `CNAME` present on production builds only.
- **Sitemap sanity**: every URL in sitemap returns a file in `dist/`, no stubs/drafts/OG URLs listed, count equals published posts + listing pages.

### 10.4 E2E (Playwright) — `tests/e2e/`

Run against `pnpm preview`. Projects: Chromium desktop 1280×800, Mobile Safari (iPhone 15 emulation), Pixel 7, plus a 320 px-wide viewport.

- Home renders latest posts; nav works; skip link focuses `<main>`.
- Post page: H1 = frontmatter title, TL;DR visible, TOC links scroll to anchors, prev/next work, Markdown twin link returns text.
- Tag & archive pagination; `/archive/?page=2` redirects to `/archive/2/`.
- Legacy URLs: sample of `/t/distributed~systems` → lands on `/t/distributed-systems/`.
- 404: unknown URL shows 404 content; legacy pattern fallback works.
- Subscribe form: required validation, honeypot, success state with mocked network (`page.route`).
- Theme toggle persists across navigation; no flash (check `data-theme` set before first paint).
- Search: Pagefind returns results for a known term.
- **No horizontal overflow** at 320 px on every template (`document.documentElement.scrollWidth <= innerWidth`).
- **JS disabled** project: home, post, subscribe form all work.

### 10.5 Accessibility, performance, visual

- `@axe-core/playwright` on every template in light and dark mode → zero violations (WCAG 2.2 AA tags).
- Keyboard-only traversal test of header, search, subscribe.
- **Lighthouse CI** (`lighthouserc.json`) on home, a post, a tag page, archive — mobile preset, 3 runs, assertions: performance ≥ 0.95, accessibility = 1, best-practices ≥ 0.95, seo = 1; `total-byte-weight` ≤ 400 KB on post; `unused-javascript` warn.
- **Visual regression**: Playwright `toHaveScreenshot` for each template × (mobile, desktop) × (light, dark); snapshots committed; updated only via labeled PR (`update-snapshots`).

### 10.6 Content PR checks

- New/changed post must pass schema (build), have `description`, `tldr`, `keyTakeaways`, cover with alt (warning if no cover), slug unique, `pubDate` not in the future unless `draft: true`.
- cspell + markdownlint on changed `.md/.mdx` files.
- Optional Vale prose lint (warnings only).

### 10.7 Post-deploy smoke & monitoring

`scripts/smoke.sh` (used by `smoke.yml` after deploy and every 6 hours):

```bash
#!/usr/bin/env bash
set -euo pipefail
BASE="${1:-https://www.serverless.fyi}"
fail=0
check() { # url expected_status [must_contain]
  local code body
  body="$(curl -sSL --max-time 20 -w '\n%{http_code}' "$1")" || { echo "FAIL $1 (network)"; fail=1; return; }
  code="${body##*$'\n'}"; body="${body%$'\n'*}"
  [[ "$code" == "$2" ]] || { echo "FAIL $1 status=$code want=$2"; fail=1; return; }
  if [[ -n "${3:-}" ]] && ! grep -q -- "$3" <<<"$body"; then echo "FAIL $1 missing '$3'"; fail=1; return; fi
  echo "ok   $1"
}
check "$BASE/" 200 "2 Minute Serverless"
check "$BASE/p/understanding-the-dns-header/" 200 "application/ld+json"
check "$BASE/p/understanding-the-dns-header.md" 200 "# Understanding the DNS Header"
check "$BASE/archive/" 200
check "$BASE/authors/" 200
check "$BASE/subscribe/" 200 "<form"
check "$BASE/t/distributed~systems/" 200 "distributed-systems"
check "$BASE/rss.xml" 200 "<rss"
check "$BASE/feed.json" 200 "jsonfeed.org"
check "$BASE/sitemap-index.xml" 200 "<sitemapindex"
check "$BASE/robots.txt" 200 "Sitemap:"
check "$BASE/llms.txt" 200 "# 2 Minute Serverless"
check "$BASE/this-does-not-exist-$(date +%s)/" 404
# HTTPS + apex → www
curl -sSI http://serverless.fyi/ | grep -qi '^location: https://www.serverless.fyi/' || { echo "FAIL apex redirect"; fail=1; }
exit $fail
```

On failure the workflow opens (or updates) a GitHub issue labeled `incident` and notifies via the repo's notification settings.

---

## 11. CI/CD Workflows (GitHub Actions)

Pin third-party actions to a full commit SHA with a version comment (Dependabot keeps them fresh). Versions shown below are the major at time of writing; use the latest majors when you generate the files.

### 11.1 `.github/workflows/ci.yml`

```yaml
name: CI
on:
  pull_request:
  push:
    branches: [main]
permissions:
  contents: read
concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true
env:
  SITE_URL: https://www.serverless.fyi
  BASE_PATH: /
  PUBLIC_INDEXABLE: "true"
jobs:
  verify:
    runs-on: ubuntu-latest
    timeout-minutes: 20
    steps:
      - uses: actions/checkout@v4
        with: { fetch-depth: 0 }
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with: { node-version-file: .nvmrc, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: pnpm typecheck
      - run: pnpm test:unit -- --coverage
      - run: pnpm build
      - run: pnpm validate          # parity + seo + feeds + html-validate + sitemap + assets
      - uses: lycheeverse/lychee-action@v2
        with:
          args: --offline --include-fragments --base dist --no-progress 'dist/**/*.html'
          fail: true
      - uses: actions/upload-artifact@v4
        with: { name: dist, path: dist, retention-days: 7 }

  e2e:
    needs: verify
    runs-on: ubuntu-latest
    timeout-minutes: 25
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with: { node-version-file: .nvmrc, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - uses: actions/download-artifact@v4
        with: { name: dist, path: dist }
      - run: pnpm exec playwright install --with-deps
      - run: pnpm test:e2e
      - if: failure()
        uses: actions/upload-artifact@v4
        with: { name: playwright-report, path: playwright-report, retention-days: 7 }

  lighthouse:
    needs: verify
    runs-on: ubuntu-latest
    timeout-minutes: 15
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with: { node-version-file: .nvmrc, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - uses: actions/download-artifact@v4
        with: { name: dist, path: dist }
      - run: pnpm exec lhci autorun

  spec-touch:
    if: github.event_name == 'pull_request'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with: { fetch-depth: 0 }
      - name: Behavior change must update docs/
        run: |
          changed=$(git diff --name-only origin/${{ github.base_ref }}...HEAD)
          code=$(echo "$changed" | grep -E '^(src/(lib|layouts|components|pages)|integrations|astro.config)' || true)
          docs=$(echo "$changed" | grep -E '^docs/' || true)
          if [ -n "$code" ] && [ -z "$docs" ] && ! grep -q 'no-spec-change' <<< "${{ join(github.event.pull_request.labels.*.name, ' ') }}"; then
            echo "::error::Behavior files changed without a docs/ update. Update the spec or add label 'no-spec-change' with justification."
            exit 1
          fi

  commitlint:
    if: github.event_name == 'pull_request'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with: { fetch-depth: 0 }
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with: { node-version-file: .nvmrc, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm exec commitlint --from ${{ github.event.pull_request.base.sha }} --to ${{ github.event.pull_request.head.sha }}
      - name: PR title is a Conventional Commit (squash-merge subject)
        run: echo "${{ github.event.pull_request.title }}" | pnpm exec commitlint
```

### 11.2 `.github/workflows/deploy.yml`

```yaml
name: Deploy to GitHub Pages
on:
  push:
    branches: [main]
  workflow_dispatch:
permissions:
  contents: read
  pages: write
  id-token: write
concurrency:
  group: pages
  cancel-in-progress: false
jobs:
  build:
    runs-on: ubuntu-latest
    timeout-minutes: 15
    env:
      SITE_URL: ${{ vars.SITE_URL }}             # staging: https://mohnishbasha.github.io  · prod: https://www.serverless.fyi
      BASE_PATH: ${{ vars.BASE_PATH }}           # staging: /serverless-fyi/ · prod: /
      PUBLIC_INDEXABLE: ${{ vars.PUBLIC_INDEXABLE }}
      PUBLIC_NEWSLETTER_PROVIDER: ${{ vars.PUBLIC_NEWSLETTER_PROVIDER }}
      PUBLIC_NEWSLETTER_ID: ${{ vars.PUBLIC_NEWSLETTER_ID }}
      PUBLIC_CF_ANALYTICS_TOKEN: ${{ vars.PUBLIC_CF_ANALYTICS_TOKEN }}
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with: { node-version-file: .nvmrc, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm build
      - run: pnpm validate
      - name: Guard production indexability
        if: vars.PUBLIC_INDEXABLE == 'true'
        run: test -f dist/CNAME && grep -q 'Allow: /' dist/robots.txt
      - uses: actions/configure-pages@v5
      - uses: actions/upload-pages-artifact@v3
        with: { path: dist, include-hidden-files: true } # publish /.well-known/ (v1.3.0)
  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
  smoke:
    needs: deploy
    uses: ./.github/workflows/smoke.yml
    with:
      base_url: ${{ vars.SITE_URL }}${{ vars.BASE_PATH == '/' && '' || vars.BASE_PATH }}
```

`public/CNAME` is generated by the build **only** when `PUBLIC_INDEXABLE=true` (staging must not claim the domain). Repo Settings → Pages → Source = **GitHub Actions**.

### 11.3 `.github/workflows/smoke.yml`

```yaml
name: Smoke
on:
  workflow_call:
    inputs: { base_url: { type: string, required: true } }
  schedule: [{ cron: '17 */6 * * *' }]
  workflow_dispatch:
permissions:
  contents: read
  issues: write
jobs:
  smoke:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Wait for CDN propagation
        run: for i in $(seq 1 20); do curl -fsS "${{ inputs.base_url || 'https://www.serverless.fyi' }}/" >/dev/null && break; sleep 15; done
      - run: bash scripts/smoke.sh "${{ inputs.base_url || 'https://www.serverless.fyi' }}"
      - if: failure()
        uses: actions/github-script@v7
        with:
          script: |
            const title = 'Smoke test failing on live site';
            const { data } = await github.rest.issues.listForRepo({ ...context.repo, state: 'open', labels: 'incident' });
            if (!data.find(i => i.title === title)) {
              await github.rest.issues.create({ ...context.repo, title, labels: ['incident'],
                body: `Run: ${context.serverUrl}/${context.repo.owner}/${context.repo.repo}/actions/runs/${context.runId}` });
            }
```

### 11.4 Other workflows

- `links.yml` — weekly (Mon 09:00 UTC) `lychee` external link check against `dist`, opens an issue listing dead links (doesn't block PRs; external sites flake). Allowlist in `lychee.toml` (linkedin.com returns 999 to bots).
- `indexnow.yml` — after successful deploy on main, diff changed `src/content/posts/**` paths, map to URLs, POST to `https://api.indexnow.org/indexnow` with the key from `public/<key>.txt`.
- `release.yml` — on tag `v*.*.*`: verify `scripts/check-versions.sh`, extract the CHANGELOG section, create a GitHub Release.
- `codeql.yml` — JS/TS default setup (or enable default CodeQL in repo settings).
- `labeler.yml` workflow — auto-label PRs `content` (posts), `infra` (.github, config), `design` (styles, components), `migration`.
- `dependabot.yml` — npm weekly (grouped: astro, testing, lint), github-actions weekly.

### 11.5 Repo settings (owner applies; document in RUNBOOK)

- Branch protection on `main`: require PR, 1 approval (CODEOWNERS = @mohnishbasha; agents' PRs need the human's approval), required checks `verify`, `e2e`, `lighthouse`, `spec-touch`, `commitlint`; require linear history; squash merge only; auto-delete head branches; no force push; require conversation resolution.
- Environments: `github-pages` restricted to `main`.
- Variables (Settings → Secrets and variables → Actions → Variables): `SITE_URL`, `BASE_PATH`, `PUBLIC_INDEXABLE`, `PUBLIC_NEWSLETTER_PROVIDER`, `PUBLIC_NEWSLETTER_ID`, `PUBLIC_CF_ANALYTICS_TOKEN`.
- Secrets: none required for deploy (OIDC). `BEEHIIV_API_KEY` stays local.
- Enable secret scanning + push protection, Dependabot alerts, private vulnerability reporting.

---

## 12. Git, PR & Commit Workflow

### 12.1 Branches

`main` (protected, always deployable) · `feat/<scope>-<desc>` · `fix/…` · `content/<slug>` · `chore/…` · `docs/…` · `migration/…`. One concern per branch.

### 12.2 Conventional Commits

`<type>(<scope>): <subject>` — types: `feat`, `fix`, `content`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`. Scopes: `seo`, `aeo`, `layout`, `post`, `feeds`, `migration`, `newsletter`, `search`, `deps`, `a11y`.

```js
// commitlint.config.js
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [2, 'always', ['feat','fix','content','docs','style','refactor','perf','test','build','ci','chore','revert']],
    'subject-case': [2, 'never', ['upper-case', 'pascal-case']],
    'header-max-length': [2, 'always', 100],
  },
};
```

### 12.3 `lefthook.yml`

```yaml
pre-commit:
  parallel: true
  commands:
    prettier:
      glob: "*.{js,ts,mjs,astro,json,md,mdx,css,yml,yaml}"
      run: pnpm exec prettier --write {staged_files}
      stage_fixed: true
    eslint:
      glob: "*.{js,ts,mjs,astro}"
      run: pnpm exec eslint --fix {staged_files}
      stage_fixed: true
    markdownlint:
      glob: "*.{md,mdx}"
      run: pnpm exec markdownlint-cli2 {staged_files}
    cspell:
      glob: "*.{md,mdx,astro}"
      run: pnpm exec cspell --no-progress {staged_files}
    secrets:
      run: git diff --cached | grep -E '(BEEHIIV_API_KEY|sk-[A-Za-z0-9]{20,})' && exit 1 || exit 0
commit-msg:
  commands:
    commitlint:
      run: pnpm exec commitlint --edit {1}
pre-push:
  commands:
    typecheck:
      run: pnpm typecheck
    unit:
      run: pnpm test:unit
```

### 12.4 `.github/PULL_REQUEST_TEMPLATE.md`

```markdown
## What & why
<!-- One paragraph. Link the issue: Closes #123 -->

## Type
- [ ] feat  - [ ] fix  - [ ] content  - [ ] docs  - [ ] chore/ci  - [ ] migration

## Checklist
- [ ] PR title is a Conventional Commit (it becomes the squash commit)
- [ ] Tests written first and passing (`pnpm test`)
- [ ] `pnpm build && pnpm validate` green locally
- [ ] Spec doc updated in `docs/` (or label `no-spec-change` + reason)
- [ ] CHANGELOG `[Unreleased]` updated (user-visible changes)
- [ ] Screenshots (mobile + desktop, light + dark) for UI changes
- [ ] For posts: description, tldr, keyTakeaways, cover + alt, tags; previewed the `.md` twin
- [ ] No secrets, no remote Beehiiv image URLs

## How to verify
<!-- Steps / URLs on preview -->
```

### 12.5 Issue templates

`bug.yml` (URL, expected, actual, device/browser, screenshot), `content-idea.yml` (working title, question it answers, target keyword, tags, sources), `config.yml` (blank issues disabled, link to SECURITY.md).

### 12.6 Merge policy

Squash merge only; the PR title becomes the commit. Agents open PRs as **draft**, mark ready when CI is green, and never merge their own PRs.

---

## 13. Versioning & Releases

- **SemVer** for the site codebase. Version source of truth: `package.json` `version`. Content-only changes do not bump the version (they're tracked by post dates and the `content` commit type).
- `CHANGELOG.md` follows **Keep a Changelog** (`[Unreleased]`, Added/Changed/Fixed/Removed/Security).
- `scripts/check-versions.sh` — asserts `package.json` version == latest tag (on release) and that CHANGELOG has a section for it; also asserts `src/lib/site.ts` `SITE_VERSION` (exposed in footer `<meta name="generator">` and `/api/posts.json`) matches.

```bash
#!/usr/bin/env bash
set -euo pipefail
PKG=$(node -p "require('./package.json').version")
SITE=$(grep -oE "SITE_VERSION = '[0-9]+\.[0-9]+\.[0-9]+'" src/lib/site.ts | grep -oE '[0-9]+\.[0-9]+\.[0-9]+')
[[ "$PKG" == "$SITE" ]] || { echo "package.json ($PKG) != site.ts ($SITE)"; exit 1; }
grep -q "^## \[$PKG\]" CHANGELOG.md || { echo "CHANGELOG missing [$PKG]"; exit 1; }
if [[ -n "${GITHUB_REF_NAME:-}" && "$GITHUB_REF_NAME" == v* ]]; then
  [[ "v$PKG" == "$GITHUB_REF_NAME" ]] || { echo "tag $GITHUB_REF_NAME != v$PKG"; exit 1; }
fi
echo "versions consistent: $PKG"
```

- Tags: **annotated** `vX.Y.Z` for releases; **lightweight** `sprint-N` at each sprint gate.
- Milestones: `v0.1.0` scaffold+CI · `v0.2.0` migrated content · `v0.3.0` templates+responsive · `v0.4.0` SEO/AEO · `v0.5.0` newsletter · `v0.9.0` staging RC · **`v1.0.0` production cutover**.
- Release checklist (in RUNBOOK): CI green → bump version → CHANGELOG move Unreleased → `check-versions.sh` → PR `chore(release): vX.Y.Z` → merge → `git tag -a vX.Y.Z -m "…"` → push tag → release workflow → verify smoke.

---

## 14. Cutover Plan (Sprint 7) — owner actions marked 👤

1. Staging live at `https://mohnishbasha.github.io/serverless-fyi/` (`BASE_PATH=/serverless-fyi/`, `PUBLIC_INDEXABLE=false`). Full test suite + smoke green against staging.
2. 👤 Content review: owner signs off on `migration/report.md`, spot-checks 10 posts side by side with Beehiiv.
3. 👤 Newsletter (Phase A): confirm the subscriber CSV export from Sprint 2 is backed up; import it into Kit as confirmed subscribers and set `PUBLIC_NEWSLETTER_PROVIDER=kit` and `PUBLIC_NEWSLETTER_ID=<Kit form id>` so the new site's form feeds the Kit list (ADR-028).
4. 👤 Search Console: confirm Domain property is verified via DNS TXT (before touching DNS).
5. Lower DNS TTL on `www` and apex to 300 s **24 h before** cutover.
6. Flip repo variables: `SITE_URL=https://www.serverless.fyi`, `BASE_PATH=/`, `PUBLIC_INDEXABLE=true` → deploy (build emits `CNAME`).
7. 👤 Repo Settings → Pages → Custom domain `www.serverless.fyi`; verify the domain for the account (Settings → Pages → Verified domains) to prevent takeover.
8. 👤 DNS (at the registrar/Cloudflare — if Cloudflare, set records **DNS only/grey cloud** until HTTPS cert is issued):
   - `www` CNAME → `mohnishbasha.github.io`
   - apex `serverless.fyi` A → `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`; AAAA → `2606:50c0:8000::153`, `2606:50c0:8001::153`, `2606:50c0:8002::153`, `2606:50c0:8003::153`
   - Remove the Beehiiv web-hosting records for the domain. Keep any Beehiiv/ESP email DNS records the ESP still needs.
9. 👤 Wait for the TLS certificate, then tick **Enforce HTTPS**.
10. 👤 In Beehiiv: disconnect the custom domain from web hosting, then — once Kit is verified (domain authenticated, test broadcast received) — export and cancel Beehiiv. Kit, not Beehiiv, is the sender.
11. Run `smoke.yml` against production; run parity check against the live site (`scripts/validate-parity.ts --live`, which fetches every legacy URL and asserts 200 after redirects).
12. Submit sitemap in GSC + Bing; IndexNow ping all URLs once.
13. Tag `v1.0.0`. Monitor GSC Pages/Coverage, 404s, and CWV for 14 days; daily scheduled smoke continues.

**Rollback:** re-point DNS to Beehiiv's records (keep a copy in `docs/RUNBOOK.md` before step 8). Because the TTL is 300 s, rollback completes in minutes.

---

## 15. Agent & Harness Files (generate all of these in Sprint 1)

### 15.1 `AGENTS.md` (canonical; `AGENT.md` is a symlink to it)

```markdown
# AGENTS.md — serverless.fyi

Static site for the "2 Minute Serverless" newsletter (Astro → GitHub Pages).
Source of truth for requirements: docs/PRD.md and the other docs/*.md specs. PROMPT.md is the original build prompt.

## Commands
- Install: `pnpm install`
- Dev: `pnpm dev` (http://localhost:4321)
- Build: `pnpm build` · Preview: `pnpm preview`
- All checks: `pnpm check` (= lint + typecheck + test:unit + build + validate)
- Unit: `pnpm test:unit` · E2E: `pnpm test:e2e` · Lighthouse: `pnpm lhci`
- New post: `pnpm new-post "Title"`
- Staging build: `SITE_URL=https://mohnishbasha.github.io BASE_PATH=/serverless-fyi/ PUBLIC_INDEXABLE=false pnpm build`

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

## Layout
src/content/posts/<slug>/index.mdx · src/pages · src/lib · migration/ · scripts/ · tests/ · docs/
```

### 15.2 `CLAUDE.md`

```markdown
# CLAUDE.md

@AGENTS.md
@SOUL.md

## Claude Code specifics
- Use the slash commands in .claude/commands (/new-post, /migrate, /audit-seo, /ship, /fix-ci).
- Delegate reviews to subagents: seo-aeo-reviewer before any PR touching posts or <head>; a11y-reviewer for UI changes; release-manager for releases.
- Skills live in .claude/skills (Claude Code) and .agent/skills (other harnesses) — see SKILLS.md.
- Use plan mode for anything touching > 5 files or the migration scripts.
- After editing, the PostToolUse hook runs Prettier; don't fight it.
- When CI fails, read the failing job log with `gh run view --log-failed` before changing code.
- Keep responses about this repo terse; put long explanations in docs/.
```

### 15.3 `SOUL.md` — voice, values, taste

```markdown
# SOUL.md — the spirit of 2 Minute Serverless

**Promise:** freshly baked serverless nuggets in two minutes. Respect the reader's time above all.

**Voice:** a senior platform engineer explaining to a sharp peer over coffee. Direct, concrete, a little playful. No hype words ("revolutionary", "game-changer"), no filler intros. Numbers, versions, trade-offs, diagrams.

**Values**
- Clarity over cleverness. Answer first, then explain.
- Accuracy over speed. Cite sources; date claims that can go stale.
- Ownership. Content lives in git; the reader's inbox and privacy are sacred (no trackers, no dark patterns).
- Craft. Fast pages, accessible to everyone, beautiful on a phone.
- Durability. URLs are promises — never break them.

**Taste for agents**
- Prefer deleting code to adding it. Prefer platform features to dependencies.
- If a choice makes the page slower, heavier, or less accessible, it needs a written reason.
- When unsure, ask the owner rather than guess; when guessing is unavoidable, write the assumption in the PR.

**Owner:** Mohinish Shaikh · Serverless Ventures LLC
```

### 15.4 `SKILLS.md` — index of skills for any harness

```markdown
# SKILLS.md

| Skill | Claude Code | Other harnesses | Use when |
|---|---|---|---|
| write-post | .claude/skills/write-post | .agent/skills/new-post | Drafting/scaffolding a new issue |
| migrate-beehiiv | .claude/skills/migrate-beehiiv | — | Re-running or extending the Beehiiv import |
| seo-aeo-audit | .claude/skills/seo-aeo-audit | — | Before publishing; periodic audits |
| release | .claude/skills/release | — | Cutting vX.Y.Z |
| run-tests | — | .agent/skills/run-tests | Running the right test subset |
| check-types | — | .agent/skills/check-types | Type errors / astro check |
| verify-deploy | — | .agent/skills/verify-deploy | After deploy or when the site looks wrong |
```

### 15.5 `.claude/settings.json`

```json
{
  "$schema": "https://json.schemastore.org/claude-code-settings.json",
  "permissions": {
    "allow": [
      "Bash(pnpm install)", "Bash(pnpm dev)", "Bash(pnpm build)", "Bash(pnpm preview)",
      "Bash(pnpm check)", "Bash(pnpm lint:*)", "Bash(pnpm typecheck)", "Bash(pnpm test:*)",
      "Bash(pnpm validate)", "Bash(pnpm new-post:*)", "Bash(pnpm exec playwright:*)",
      "Bash(git status)", "Bash(git diff:*)", "Bash(git log:*)", "Bash(git checkout -b:*)",
      "Bash(git add:*)", "Bash(git commit:*)", "Bash(gh pr create:*)", "Bash(gh pr view:*)",
      "Bash(gh run view:*)", "Bash(gh run list:*)"
    ],
    "deny": [
      "Bash(git push --force:*)", "Bash(git push -f:*)", "Bash(git push origin main)",
      "Bash(gh pr merge:*)", "Bash(rm -rf:*)",
      "Read(.env)", "Read(.env.*)", "Edit(migration/legacy-urls.json)"
    ]
  },
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit|Write|MultiEdit",
        "hooks": [
          { "type": "command",
            "command": "jq -r '.tool_input.file_path // empty' | xargs -r pnpm exec prettier --write --ignore-unknown >/dev/null 2>&1 || true" }
        ]
      }
    ]
  }
}
```

(`legacy-urls.json` is edit-denied for agents: only the migration script writes it, and append-only changes go through the owner.)

### 15.6 `.claude/commands/` (slash commands)

`new-post.md`
```markdown
---
description: Scaffold and draft a new 2 Minute Serverless issue
argument-hint: "<title or topic>"
---
Create a new post for: $ARGUMENTS
1. Run `pnpm new-post "$ARGUMENTS"` to scaffold src/content/posts/<slug>/index.mdx.
2. Draft in the SOUL.md voice, ~400–600 words, answer-first. Fill description (70–160), tldr, keyTakeaways, faq (only real questions), tags (existing tags first).
3. Mark sentences that need the owner's facts with TODO(owner). Do not invent quotes, numbers, or events.
4. Run `pnpm check`. Invoke the seo-aeo-reviewer subagent. Open a draft PR `content(post): <title>`.
```

`migrate.md` — run the export → convert → localize → manifest pipeline, then `pnpm validate`, then summarize `migration/report.md`.
`audit-seo.md` — build, run `scripts/validate-seo.ts`, Lighthouse on 4 templates, invoke seo-aeo-reviewer on the 5 most recent posts, write findings to `docs/audits/<date>.md`, open issues for fixes.
`ship.md` — ensure branch, run `pnpm check`, update CHANGELOG/specs, commit (Conventional), push, `gh pr create --draft --fill`.
`fix-ci.md` — `gh run list --limit 5`, `gh run view <id> --log-failed`, reproduce locally, write failing test, fix, push.

### 15.7 `.claude/agents/` (subagents)

`seo-aeo-reviewer.md`
```markdown
---
name: seo-aeo-reviewer
description: Reviews posts and <head>/JSON-LD changes for SEO and answer-engine readiness. Use before any PR that adds/edits posts or SEO components.
tools: Read, Grep, Glob, Bash
---
You review against docs/SEO_AEO.md. For each changed post/page report PASS/FAIL with fixes for:
title ≤ 60 chars & keyword-first · description 70–160 & unique · one H1, logical H2s (question-shaped where natural) ·
TL;DR answers the title in ≤ 3 sentences · keyTakeaways concrete · FAQ real and visible · internal links to 2+ related posts ·
alt text · JSON-LD matches visible content · .md twin renders · no thin content (< 300 words) without reason.
Never rewrite the author's prose; propose edits as suggestions.
```

`content-migrator.md` (owns `migration/`, golden-test discipline, never invents content), `a11y-reviewer.md` (WCAG 2.2 AA, keyboard, contrast, reduced motion, axe output triage), `release-manager.md` (runs §13 checklist, check-versions, CHANGELOG, tag instructions — never pushes tags itself; prints commands for the owner).

### 15.8 `.claude/skills/*/SKILL.md` and `.agent/skills/*/SKILL.md`

Each has YAML frontmatter `name` + `description` (when to use) and a body with exact commands and success criteria. Example:

```markdown
---
name: run-tests
description: Run the right test subset for the files you changed in serverless.fyi and interpret failures.
---
- Changed src/lib or migration/ → `pnpm test:unit`
- Changed components/layouts/pages/styles → `pnpm build && pnpm validate && pnpm test:e2e`
- Changed posts → `pnpm build && pnpm validate`
- Before PR → `pnpm check`
Visual diffs: inspect playwright-report; only update snapshots with `pnpm test:e2e --update-snapshots` when the change is intentional and say so in the PR.
Success = exit code 0 and no new warnings.
```

`check-types` (astro check + tsc, common fixes), `new-post` (harness-agnostic version of /new-post), `verify-deploy` (`bash scripts/smoke.sh <url>`, how to read GitHub Pages deploy status with `gh api repos/:owner/:repo/pages/builds/latest`), `write-post`, `migrate-beehiiv`, `seo-aeo-audit`, `release`.

### 15.9 Other harnesses

- `.github/copilot-instructions.md` — condensed AGENTS.md rules.
- `.cursor/rules/project.mdc` — `alwaysApply: true`, same rules.
- Goose / OpenCode / Pi read `AGENTS.md` and `.agent/skills/` natively or via config; add a short "Harnesses" section to README with how to point each at the repo. No MCP server is needed for v1 (static site); the agent-facing surface is `llms.txt`, `.md` twins, `api/posts.json`, and feeds.

### 15.10 `PROMPT.md`

Verbatim copy of this prompt. Header note: "Historical intent. Specs in docs/ supersede this file."

---

## 16. Supporting Repository Files

- `README.md` — badges (CI, deploy, smoke), what this is, quickstart, publish-a-post in 5 steps, architecture diagram link, harnesses section, license.
- `CONTRIBUTING.md` — branches, commits, PR checklist, how to run tests, how to write a post, how to update visual snapshots.
- `CODE_OF_CONDUCT.md` (Contributor Covenant), `SECURITY.md` (report to mohinish@serverlessvc.com, response window), `public/.well-known/security.txt` (Contact, Expires one year out, Preferred-Languages: en, Canonical).
- `LICENSE` — MIT for code, © Serverless Ventures LLC.
- `CONTENT_LICENSE.md` — per ADR-010 (default all rights reserved; quoting with attribution and link allowed).
- `THIRD_PARTY_LICENSES.md` — generated with `pnpm licenses list --prod --json` → script formats to Markdown; regenerated in CI and diff-checked on dependency PRs.
- `.gitignore` — `node_modules/`, `dist/`, `.astro/`, `.env*` (not `.env.example`), `migration/raw/`, `playwright-report/`, `test-results/`, `.lighthouseci/`, `coverage/`, `.DS_Store`, `*.log`, `.pagefind/`, `*.subscribers.csv`, `subscribers*.csv`, `infra/**/*.tfstate*`, `infra/**/.terraform/`.
- `.gitattributes` — `* text=auto eol=lf`, images binary, `pnpm-lock.yaml -diff linguist-generated`.
- `.editorconfig`, `.nvmrc` (`24`), `.env.example` (all `PUBLIC_*` vars + `BEEHIIV_API_KEY=` + `BEEHIIV_PUBLICATION_ID=` with comments).
- `package.json` scripts:

```json
{
  "scripts": {
    "dev": "astro dev",
    "build": "astro build",
    "preview": "astro preview",
    "typecheck": "astro check && tsc --noEmit",
    "lint": "eslint . && prettier --check . && markdownlint-cli2 \"**/*.{md,mdx}\" \"#node_modules\" && cspell --no-progress \"src/**/*.{md,mdx,astro}\"",
    "format": "prettier --write .",
    "test:unit": "vitest run",
    "test:e2e": "playwright test",
    "lhci": "lhci autorun",
    "validate": "tsx scripts/validate-parity.ts && tsx scripts/validate-seo.ts && tsx scripts/validate-feeds.ts && html-validate \"dist/**/*.html\"",
    "check": "pnpm lint && pnpm typecheck && pnpm test:unit && pnpm build && pnpm validate",
    "new-post": "tsx scripts/new-post.ts",
    "migrate:fetch": "tsx migration/fetch-beehiiv.ts",
    "migrate:scrape": "tsx migration/scrape-beehiiv.ts",
    "migrate:convert": "tsx migration/html-to-md.ts && tsx migration/localize-images.ts && tsx migration/build-manifest.ts",
    "versions": "bash scripts/check-versions.sh",
    "prepare": "lefthook install"
  }
}
```

---

## 17. Sprint Plan (each gate is a hard stop)

### Sprint 0 — Specs
Start protocol: read this prompt end to end; inventory the live site (sitemap, a few posts) to ground the specs.
Deliverables: the five spec docs, DECISIONS.md (ADR-001…010), RUNBOOK.md skeleton, STYLE_GUIDE.md.
**Gate 0:** ☐ five specs complete ☐ every ADR has a decision or an explicit "owner to confirm" ☐ owner approves PRD (PR merged) ☐ tag `sprint-0`.

### Sprint 1 — Scaffold, tooling, CI, agent files
Astro project, TS strict, lint/format, lefthook, commitlint, Vitest, Playwright, LHCI config, html-validate, lychee, all workflows (§11), all agent files (§15), supporting files (§16), placeholder home page, `url()` helper with tests.
**Gate 1:** ☐ `pnpm check` green ☐ CI green on a PR ☐ deploy to staging URL works with `BASE_PATH` ☐ smoke passes on staging ☐ all §15 files exist ☐ branch protection documented ☐ tag `v0.1.0`.

### Sprint 2 — Migration
Golden fixtures first → exporter → converter → image localizer → manifest → report. Import all posts.
**Gate 2:** ☐ post count equals Beehiiv published count ☐ 0 remote Beehiiv images ☐ parity validator 100% ☐ owner reviewed report ☐ 👤 subscriber CSV exported and stored privately (not in repo) ☐ tag `v0.2.0`.

### Sprint 3 — Templates & responsive design
All templates (§7.2), design tokens, dark mode, TOC, related posts, pagination, 404 logic, redirect stubs, Pagefind.
**Gate 3:** ☐ e2e green on 4 viewports ☐ no overflow at 320 px ☐ axe 0 violations light/dark ☐ visual snapshots committed ☐ JS-disabled project green ☐ tag `v0.3.0`.

### Sprint 4 — SEO, AEO, agent-readiness
SEO component, JSON-LD graph, OG image generation, feeds, sitemap lastmod, robots (env), llms.txt/llms-full.txt, .md twins, api/posts.json, security.txt, IndexNow wiring.
**Gate 4:** ☐ validate-seo 0 errors ☐ feeds valid ☐ Lighthouse thresholds met on 4 templates ☐ Rich Results Test passes on 3 sample posts (owner runs manually on staging URL, screenshots in PR) ☐ tag `v0.4.0`.

### Sprint 5 — Newsletter
Provider adapter, Subscribe component (no-JS + enhanced), subscribe page, Kit (free plan) as the Phase A provider; RSS-to-email is a paid Kit feature, so broadcasts are created manually from the `/p/<slug>.md` twin.
**Gate 5:** ☐ form works JS on/off (mocked in e2e) ☐ real test subscription to Kit succeeds on staging (owner) ☐ privacy page lists the ESP ☐ tag `v0.5.0`.

### Sprint 6 — Hardening
Performance pass, final a11y pass, link check clean, RUNBOOK complete, CONTRIBUTING complete, THIRD_PARTY_LICENSES generated, CHANGELOG complete, dependency audit (`pnpm audit --prod` no high/critical).
**Gate 6:** ☐ every CI job green ☐ external link check clean or allowlisted ☐ RUNBOOK rehearsed (rollback dry run on staging) ☐ tag `v0.9.0` (release candidate).

### Sprint 7 — Cutover (§14)
**Gate 7:** ☐ production smoke green ☐ live parity 100% ☐ HTTPS enforced ☐ apex → www ☐ sitemap submitted ☐ subscribe form feeds the Kit list ☐ tag `v1.0.0`.

### Sprint 8 — Post-launch (2 weeks)
Monitor GSC, fix 404s by adding manifest entries (owner-approved), tune CWV, write the "we moved to GitHub" issue as the first post on the new stack.
**Gate 8:** ☐ indexed pages ≥ pre-migration ☐ no open `incident` issues ☐ retro written in docs/.

**Sprint start protocol (every sprint):** re-read relevant specs → write the sprint's tests first (red) → implement → green → refactor → update specs/CHANGELOG → PR → gate checklist in the PR description.

---

### Sprint 9 — Self-hosted newsletter (listmonk + SES) — deferred until ~10,000 subscribers
The stack in `infra/newsletter/` is built; applying it waits until the list nears Kit's free-plan ceiling (ADR-028).
Start protocol: 👤 request SES production access at the start of the sprint. Tests first: adapter unit tests for `listmonk`, e2e for the form against a local listmonk in Docker, a unit test that the draft-campaign Action builds correct HTML from a post.
Deliverables: `infra/newsletter/` (Compose, Caddy, Terraform), DNS records for DKIM/SPF/DMARC/MAIL FROM, bounce webhook, backups, `email/template.html`, draft-campaign Action, RUNBOOK sections (send an issue, restore backup, handle a complaint spike).
👤 Import the Kit subscriber export; send a test to yourself (Gmail, Outlook, Apple Mail); check headers show SPF/DKIM/DMARC pass and one-click unsubscribe; send the first real issue in batches.
**Gate 9:** ☐ SES out of sandbox ☐ mail-tester / Gmail "show original" all pass ☐ double opt-in + unsubscribe verified end to end ☐ bounce webhook blocklists a test bounce ☐ backup restored successfully once ☐ first issue sent to the full list with bounce < 2% and complaints < 0.1% ☐ `PUBLIC_NEWSLETTER_PROVIDER=listmonk` live on the site ☐ tag `v1.1.0`.

### Sprint 10 — Decommission Beehiiv (can run now; Kit is the sender)
1. 👤 Final exports: subscribers (already imported into Kit; keep signup dates), per-post stats and open/click history, raw post JSON — stored privately.
2. 👤 Optionally keep the Beehiiv publication paused (no sends) for a short rollback window.
3. 👤 Remove every remaining Beehiiv DNS record (web and email); confirm `dig` shows only GitHub Pages and Kit records.
4. 👤 Cancel the Beehiiv paid plan; after the rollback window, delete the publication.
5. Remove the `beehiiv` provider branch from the adapter (or keep it behind a test, record in DECISIONS.md); grep the repo and `dist/` for `beehiiv` — only migration provenance fields and docs may mention it.
Known side effect (note in RUNBOOK): issues already in subscribers' inboxes load images from Beehiiv's servers and will show broken images after deletion; the web archive on serverless.fyi is unaffected.
**Gate 10:** ☐ all exports archived ☐ no Beehiiv DNS ☐ subscription cancelled ☐ smoke + parity still green ☐ tag `v1.2.0`.

## 18. Definition of Done (whole project)

- Every Beehiiv URL resolves on `https://www.serverless.fyi`.
- Publishing = merge a PR with one MDX file; live with feeds/sitemap/IndexNow updated in < 5 min.
- Lighthouse mobile ≥ 95/100/95/100 on all templates; axe clean; no overflow at 320 px.
- `llms.txt`, `llms-full.txt`, `.md` twins, `api/posts.json`, RSS/Atom/JSON feeds, sitemap, robots all live and validated.
- Subscribers receive new issues from the self-hosted listmonk + SES stack; Beehiiv is fully decommissioned (no account, no DNS, no cost).
- All agent files present and accurate; a fresh Claude Code session can run `/new-post` end to end.
- Docs, CHANGELOG, and RUNBOOK current. `v1.0.0` tagged.
