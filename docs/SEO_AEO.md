# SEO, AEO and Agent-Readiness Specification

Status: source of truth for everything in `<head>`, structured data, feeds, sitemap, robots, agent endpoints, redirects and performance budgets. If code and this document disagree, fix one of them in the same PR (Spec Change Protocol).

Related: `docs/PRD.md`, `docs/ARCHITECTURE.md`, `docs/TEST_PLAN.md`, `docs/DECISIONS.md`.

## 1. Definitions and constants

| Name                           | Value                                                                                                                           |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| Production origin (`SITE_URL`) | `https://www.serverless.fyi`                                                                                                    |
| Staging origin                 | `https://mohnishbasha.github.io`, with `BASE_PATH=/serverless-fyi/` (full URL `https://mohnishbasha.github.io/serverless-fyi/`) |
| Site name                      | `2 Minute Serverless`                                                                                                           |
| Tagline                        | `Freshly baked serverless nuggets in 2-minutes`                                                                                 |
| Short description              | `Data \| AI \| Distributed Systems \| Start Ups`                                                                                |
| Author                         | Mohinish Shaikh (alternate name Mohinish S), id `mohinish`, page `/authors/`                                                    |
| Publisher                      | Serverless Ventures LLC                                                                                                         |
| Twitter handle                 | `@mohinishbasha`                                                                                                                |
| Theme colors                   | light `#ffffff`, dark `#0b0d10` (`SITE.themeColorLight/Dark`); web manifest `theme_color` `#000000` (legacy brand color)        |
| Current inventory              | 23 posts, 22 tags (17 Beehiiv + 5 from ADR-020), `/authors/mohinish-s` legacy URL (redirects to `/authors/`)                    |
| Env switches                   | `SITE_URL`, `BASE_PATH`, `PUBLIC_INDEXABLE` (`true` = production, `false` = staging)                                            |

Rules that apply everywhere:

1. All URLs emitted into HTML, feeds, JSON-LD, sitemap, llms files and the API are absolute and built from `SITE_URL` plus `BASE_PATH`. Never hand-concatenate; use `src/lib/urls.ts` (`url()` for root-relative with base, `absoluteUrl()` for absolute).
2. All page URLs end with a trailing slash (ADR-004). Exceptions are file-like endpoints: `/rss.xml`, `/atom.xml`, `/feed.json`, `/llms.txt`, `/llms-full.txt`, `/robots.txt`, `/sitemap-index.xml`, `/api/posts.json`, `/p/<slug>.md`, `/og/<slug>.png`, `/humans.txt`.
3. Structured data and `<head>` content must match visible page content. No hidden FAQ, no invented ratings.
4. Staging builds (`PUBLIC_INDEXABLE=false`) are `noindex` everywhere and `robots.txt` disallows all. Staging canonicals still point at the staging origin so they never compete with production.

## 2. Per-page `<head>` (component `src/components/SEO.astro`)

`validate-seo.ts` asserts the core rows (lang, one `<h1>`, unique title, description 70 to 160 and unique, absolute canonical equal to the path, OG and Twitter tags, `og:image` file exists, JSON-LD required properties, robots meta per environment) for every non-stub HTML file in `dist/`. The remaining rows are covered by unit tests and review.

| Tag                                                                                                 | Spec                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| --------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `<html lang="en">`                                                                                  | Always present.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `<meta charset="utf-8">` and `<meta name="viewport" content="width=device-width, initial-scale=1">` | Always.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `<title>`                                                                                           | Post: `"{title} \| 2 Minute Serverless"`. Target 60 characters or fewer for the whole string; if over, drop the site suffix (never truncate the title mid-word). Home: `2 Minute Serverless — Data, AI & Distributed Systems in 2 Minutes`. Tag: `{Tag name} posts \| 2 Minute Serverless` (page N: `{Tag name} posts — page N`). Archive: `Archive: every post \| 2 Minute Serverless` (page N: `Archive — page N`). Fixed pages use their short title plus the suffix, for example `All topics`, `Search`, `Subscribe to the newsletter`. The suffix is added only when the whole string fits in 60 characters. Unique across the site. |
| `<meta name="description">`                                                                         | 70 to 160 characters, unique across the site. Source: post `description`; tag description file or default template; static text for fixed pages.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `<link rel="canonical">`                                                                            | Absolute, trailing slash (except file-like URLs), built from `SITE_URL`. See section 9.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `<meta name="robots">`                                                                              | Production indexable page: `index,follow,max-image-preview:large,max-snippet:-1`. Drafts, `noindex: true` posts, empty tag pages (ADR-021), `/search/`, 404 and redirect stubs: `noindex,follow`. Staging: `noindex,nofollow`.                                                                                                                                                                                                                                                                                                                                                                                                            |
| Open Graph                                                                                          | `og:type` (`article` for posts, `website` otherwise), `og:title`, `og:description`, `og:url` (= canonical), `og:image` (absolute, 1200x630 PNG from `/og/<slug>.png`), `og:image:width` 1200, `og:image:height` 630, `og:image:alt`, `og:site_name` = `2 Minute Serverless`, `og:locale` = `en_US`.                                                                                                                                                                                                                                                                                                                                       |
| Open Graph, article only                                                                            | `article:published_time` (ISO 8601 with offset), `article:modified_time` (`updatedDate ?? pubDate`), `article:author` (absolute URL of `/authors/`), `article:tag` (one meta per tag), `article:section` (first tag).                                                                                                                                                                                                                                                                                                                                                                                                                     |
| Twitter                                                                                             | `twitter:card` = `summary_large_image`, `twitter:site` = `@mohinishbasha`, `twitter:creator` = `@mohinishbasha`, `twitter:title`, `twitter:description`, `twitter:image`, `twitter:image:alt`.                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| Theme                                                                                               | `<meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)">`, `<meta name="theme-color" content="#0b0d10" media="(prefers-color-scheme: dark)">`, `<meta name="color-scheme" content="light dark">`.                                                                                                                                                                                                                                                                                                                                                                                                               |
| Generator                                                                                           | `<meta name="generator" content="serverless-fyi {SITE_VERSION}">`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| Author                                                                                              | `<meta name="author" content="Mohinish Shaikh">`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Feeds                                                                                               | `<link rel="alternate" type="application/rss+xml" title="2 Minute Serverless (RSS)" href="/rss.xml">`, `application/atom+xml` for `/atom.xml`, `application/feed+json` for `/feed.json`. Tag pages additionally link their own `/t/<tag>/rss.xml`.                                                                                                                                                                                                                                                                                                                                                                                        |
| Markdown twin (posts only)                                                                          | `<link rel="alternate" type="text/markdown" href="/p/<slug>.md">`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| Sitemap                                                                                             | `<link rel="sitemap" href="/sitemap-index.xml">`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Favicons                                                                                            | SVG favicon (`rel="icon" type="image/svg+xml"`), 32x32 PNG (`rel="icon" sizes="32x32"`), 180x180 `apple-touch-icon`, `<link rel="manifest" href="/site.webmanifest">`. Assets in `public/brand/`.                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Pagination                                                                                          | Paginated listings emit `rel="prev"` and `rel="next"` on the pagination links (not in `<head>`). Google ignores them; Bing and others still read them.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| Security meta (ADR-008)                                                                             | `<meta http-equiv="Content-Security-Policy">` (shape in ARCHITECTURE section 7; no `frame-ancestors`, no `report-uri`), `<meta name="referrer" content="strict-origin-when-cross-origin">`. Real response headers are not possible on GitHub Pages.                                                                                                                                                                                                                                                                                                                                                                                       |
| Analytics                                                                                           | Cloudflare Web Analytics beacon only when `PUBLIC_CF_ANALYTICS_TOKEN` is set. Cookieless.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |

All internal hrefs in `<head>` go through `url()` so staging with `BASE_PATH` works. Absolute URLs (canonical, og:url, og:image) include `BASE_PATH` on staging.

## 3. Structured data (JSON-LD)

One `<script type="application/ld+json">` per page containing a single `@graph`. Builders live in `src/lib/jsonld.ts` and are unit-tested. Use stable `@id`s so nodes reference each other:

- Organization: `https://www.serverless.fyi/#organization`
- WebSite: `https://www.serverless.fyi/#website`
- Person (author): `https://www.serverless.fyi/authors/#mohinish`
- Blog: `https://www.serverless.fyi/#blog`
- Post BlogPosting: `<canonical>#article`
- Breadcrumb: `<canonical>#breadcrumb`

### 3.1 Types by template

| Template                          | Graph nodes                                                                                                                                 |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Every page                        | `WebSite` (`name`, `url`, `description`, `inLanguage: "en"`, `publisher` -> Organization, `potentialAction` `SearchAction`), `Organization` |
| Post                              | `BlogPosting`, `BreadcrumbList`, `FAQPage` (conditional)                                                                                    |
| Tag                               | `CollectionPage`, `ItemList`, `BreadcrumbList`                                                                                              |
| Archive (all pages)               | `Blog`, `ItemList`, `BreadcrumbList`                                                                                                        |
| Home                              | `Blog`, `ItemList` (latest 10 posts)                                                                                                        |
| Authors                           | `ProfilePage` with `mainEntity` -> `Person`, `Person`, `BreadcrumbList`                                                                     |
| Tags index (`/tags/`)             | `CollectionPage`, `BreadcrumbList`                                                                                                          |
| Subscribe, About, Privacy, Search | `BreadcrumbList` (plus the "every page" nodes). No `WebPage` node is emitted.                                                               |
| 404, redirect stubs               | No JSON-LD.                                                                                                                                 |

### 3.2 Required properties

`WebSite`: `@type`, `@id`, `name`, `url`, `inLanguage`, `publisher`, `potentialAction`.

`SearchAction` (emitted because `/search/` exists, ADR-019):

```json
{
  "@type": "SearchAction",
  "target": { "@type": "EntryPoint", "urlTemplate": "https://www.serverless.fyi/search/?q={search_term_string}" },
  "query-input": "required name=search_term_string"
}
```

The search page reads `?q=` and runs the query on load; `search.spec.ts` asserts `?q=` pre-fills and returns results. `/search/` itself is `noindex` and not in the sitemap.

`Organization`: `name` = `Serverless Ventures LLC`, `url`, `logo` (`ImageObject` with absolute `url`, `width`, `height`), `sameAs` (the four profiles below).

`sameAs` list (identical on Organization and Person):

- `https://twitter.com/mohinishbasha`
- `https://www.linkedin.com/in/mohinishbasha`
- `https://www.youtube.com/@TwoMinuteServerless`
- `https://github.com/mohnishbasha`

`BlogPosting`: `@id`, `headline` (the post title, max 110), `description`, `image` (array: absolute OG image URL, plus the cover image URL if present), `datePublished`, `dateModified` (`updatedDate ?? pubDate`), `author` -> Person `@id`, `publisher` -> Organization `@id`, `mainEntityOfPage` (`WebPage` with canonical `@id`), `url`, `keywords` (comma-joined tags), `articleSection` (first tag), `wordCount` (words in rendered body), `inLanguage: "en"`, `isPartOf` -> Blog `@id`. When a TL;DR exists and `aeoPending` is false, add `abstract` = `tldr`. Do not add `speakable` (low value, limited support). The Blog node in the graph is on home and archive pages; posts reference its `@id` through `isPartOf`.

`BreadcrumbList`: `ItemList` elements with `position`, `name`, `item` (absolute). Post: Home > Archive > Title (the last item may omit `item`). Tag: Home > Tags > Tag. Names must equal the visible breadcrumb text.

`FAQPage`: emitted only if `faq` is non-empty, `aeoPending` is false, and the FAQ section is visibly rendered. Each `Question` has `name` and `acceptedAnswer` `Answer` with `text` equal to the visible answer (plain text or the same minimal HTML).

`CollectionPage` (Tag): `name`, `description`, `url`, `isPartOf` -> WebSite, `mainEntity` -> `ItemList`.

`ItemList`: `itemListElement` of `ListItem` with `position`, `url`. Only the posts on that page of the listing. `numberOfItems` is the count on the page.

`Blog`: `@id`, `name`, `url`, `description`, `publisher`, `inLanguage`.

`ProfilePage`: `mainEntity` -> `Person` with `name`, `alternateName` (`Mohinish S`), `jobTitle`, `url`, `image` (absolute avatar), `sameAs`, `knowsAbout` (array from `authors.json`), `worksFor` -> Organization. Optional `dateModified`.

### 3.3 `aeoPending` and answer-engine fields

Posts with `aeoPending: true` (migrated posts awaiting owner-written content):

- The TL;DR box and Key takeaways blocks are not rendered.
- `abstract` is omitted from `BlogPosting`.
- `FAQPage` is omitted even if `faq` is populated.
- `/llms.txt` entry for that post uses the post `description` as the one-liner instead of `tldr`.
- `/api/posts.json` returns `tldr: null` for the post and `aeoPending: true`.
- `llms-full.txt` and the Markdown twin omit the TL;DR and takeaways blocks.
- `scripts/check-content.ts` (first step of `pnpm validate`) fails if a post that is not `aeoPending` contains `TODO(owner)` markers in its source; `validate-seo.ts` does not repeat this check.

### 3.4 FAQ and rich results

Google restricted FAQ rich results in 2023 to well-known authoritative government and health sites. This site will not get FAQ rich snippets in Google. We still emit `FAQPage` and render FAQs visibly because answer engines and LLM-based crawlers parse Q&A pairs well, and visible FAQs help human readers. Do not add FAQs for ranking tricks: only real questions a reader would ask, with answers that match the visible text. Expect no Rich Results Test "FAQ" enhancement; the test passing for `BlogPosting` and `BreadcrumbList` is the gate (Sprint 4).

### 3.5 Validation (`scripts/validate-seo.ts`)

Parses every `dist/**/*.html`, extracts all JSON-LD blocks, and fails the build when JSON-LD does not parse, a required property for any emitted type is missing or empty, a `FAQPage` question is not visible in `.faq`, a post lacks `BlogPosting` or exactly one Markdown alternate, the authors page lacks `ProfilePage`, or a tag page lacks `CollectionPage`. The wider rules below are enforced by the JSON-LD unit tests (`jsonld.test.ts`):

- JSON does not parse, or there is more than one JSON-LD script per page.
- A required property for any emitted type is missing or empty.
- Any URL in the graph is relative, or lacks the expected origin and base path.
- `FAQPage` is present but the page has no visible FAQ section with the same question count.
- Breadcrumb names differ from visible breadcrumb text.
- `datePublished` or `dateModified` is not valid ISO 8601, or `dateModified < datePublished`.

## 4. Feeds

All feeds list the 50 most recent published, non-draft, non-`noindex` posts, newest first, with full HTML content and absolute URLs. Relative `src`/`href` in content are rewritten to absolute at render time.

| Endpoint           | Format              | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| ------------------ | ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/rss.xml`         | RSS 2.0             | `<channel>` has `title`, `link`, `description`, `language` (`en-us`), `lastBuildDate`, `atom:link rel="self"`, `generator`, `managingEditor`. Each `<item>`: `title`, `link`, `guid isPermaLink="true"` (canonical URL), `pubDate` (RFC 822), `description` (the post description), `content:encoded` (full HTML, CDATA), `category` (one per tag), `dc:creator`. Enclosure for cover image optional. Declares `xmlns:content`, `xmlns:atom`, `xmlns:dc`. |
| `/feed.xml`        | Alias of `/rss.xml` | Same bytes. Static copy, not a redirect.                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `/atom.xml`        | Atom 1.0            | `feed` with `id`, `title`, `updated`, `link rel="self"` and `rel="alternate"`, `author`. Each `entry`: `id` (canonical URL), `title`, `link`, `published`, `updated`, `summary`, `content type="html"`, `category term`.                                                                                                                                                                                                                                  |
| `/feed.json`       | JSON Feed 1.1       | `version: "https://jsonfeed.org/version/1.1"`, `title`, `home_page_url`, `feed_url`, `description`, `language`, `authors`, `items[]` with `id` (canonical URL), `url`, `title`, `summary`, `content_html`, `date_published`, `date_modified`, `tags`, `image`.                                                                                                                                                                                            |
| `/t/<tag>/rss.xml` | RSS 2.0             | One per tag. Same rules, filtered to the tag, channel title `2 Minute Serverless — {Tag}`. Linked from the tag page.                                                                                                                                                                                                                                                                                                                                      |

No Beehiiv RSS feed was ever enabled on the live site, so there is no legacy feed URL to preserve. The first feed URLs are new. Do not add redirects for `/rss` or `/feed` unless the owner confirms inbound traffic.

`scripts/validate-feeds.ts` asserts: well-formed XML (and valid JSON for JSON Feed), required elements present, every item link and content URL absolute, and the JSON Feed version. Item-count and per-tag-feed checks are in the backlog (`docs/TEST_PLAN.md` section 4).

## 5. Sitemap

- Integration: `@astrojs/sitemap`, output `/sitemap-index.xml` and `/sitemap-0.xml`.
- `lastmod` is set per URL via `serialize`:
  - post pages: `updatedDate ?? pubDate`
  - tag pages: date of the newest post in the tag
  - archive pages, home: date of the newest post overall
  - authors, subscribe, about, privacy: the newest post date (no `new Date()` build-time stamps for static pages, because that makes every deploy look like a change)
- `changefreq` is set to `weekly` by the integration; `priority` is omitted (Google ignores both).
- `filter` excludes: `/og/`, `/redirects/`, redirect stubs (every `legacy-urls.json` entry with `type: redirect`), `/404/`, `/search/` (utility page, `noindex` is not set, but it is not listed), drafts, `noindex` posts, `.md` twins and API files.
- Included: home, each post, each tag page with posts (and paginated tag pages), `/tags/`, archive pages, authors, subscribe, about, privacy. Empty tag pages (`object-storage`, `xrp`; ADR-021) are excluded.
- Sanity (asserted in `validate-dist.ts`): every sitemap URL exists in `dist/`, none is a stub, an OG image or (on production) `noindex`, and the URL count equals the number of indexable pages in `dist/`.
- Staging builds still generate a sitemap (for tests) but `robots.txt` disallows all and the sitemap is not submitted anywhere.

## 6. robots.txt policy

Generated at build by `src/pages/robots.txt.ts` from `PUBLIC_INDEXABLE`.

### 6.1 Production (`PUBLIC_INDEXABLE=true`)

```txt
User-agent: *
Allow: /
Disallow: /og/

# AI / answer engines: explicitly welcome (ADR-009)
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

# Social link previews (need /og/ images)
User-agent: Twitterbot
Allow: /

User-agent: facebookexternalhit
Allow: /

User-agent: LinkedInBot
Allow: /

User-agent: Slackbot
Allow: /

User-agent: Discordbot
Allow: /

User-agent: WhatsApp
Allow: /

Sitemap: https://www.serverless.fyi/sitemap-index.xml
```

Notes:

- Named groups do not inherit from `User-agent: *`, which is why the AI bots have their own `Allow: /`. Because they do not inherit `Disallow: /og/`, add `Disallow: /og/` to each named group too if the owner wants OG images hidden from AI crawlers. Default: leave `/og/` open for named AI bots (they are harmless card images); the `*` group disallows them for general crawlers to save crawl budget. Social platforms fetch OG images with their own user agents, which would fall under `*` and be blocked by `Disallow: /og/`, so the generator (`SOCIAL_CRAWLERS` in `src/lib/robots.ts`) emits explicit `Allow: /` groups for `Twitterbot`, `facebookexternalhit`, `LinkedInBot`, `Slackbot`, `Discordbot` and `WhatsApp`.
- Each bot's role: `GPTBot` (OpenAI training), `OAI-SearchBot` (ChatGPT search index), `ChatGPT-User` (user-initiated fetch), `ClaudeBot` (Anthropic training crawl), `Claude-User` (user-initiated fetch), `Claude-SearchBot` (Anthropic search index), `PerplexityBot` (Perplexity index), `Perplexity-User` (user-initiated fetch), `Google-Extended` (opt-in token controlling Gemini training and grounding; does not affect Search), `Applebot-Extended` (Apple AI training token), `CCBot` (Common Crawl, feeds many models).
- The owner can flip any individual bot to `Disallow: /` by removing it from `AI_CRAWLERS` (a list of names in `src/lib/robots.ts`) and adding an explicit `Disallow: /` group; changing the policy requires an ADR-009 update.
- robots.txt is advisory. Not all agents obey it. It is not an access control.

### 6.2 Staging (`PUBLIC_INDEXABLE=false`)

```txt
User-agent: *
Disallow: /
```

No `Sitemap:` line. Every page also carries `<meta name="robots" content="noindex,nofollow">`.

### 6.3 Tests

`tests/unit/robots.test.ts` covers production output (AI bots, social preview bots, sitemap line with the right origin) and the staging disallow-all form. `validate-dist.ts` checks `robots.txt` against the environment.

## 7. Agent-ready endpoints (AEO)

### 7.1 `/llms.txt`

Follows the llmstxt.org convention. Plain Markdown, `text/plain` by extension, UTF-8, generated from the content collection.

Structure, in order:

1. `# 2 Minute Serverless` (H1, exact text; smoke test greps for it).
2. Blockquote summary: `> Freshly baked serverless nuggets in 2-minutes. Data, AI, distributed systems and start-ups, written by Mohinish Shaikh.`
3. `## Start here`: the 3 pinned posts from `site.ts`.
4. `## Posts by topic`: for each tag (alphabetical, display label) an `### {Tag}` subsection listing its posts newest first. Each line: `- [Title](https://www.serverless.fyi/p/slug.md): summary`. The summary is `tldr`, or `description` for `aeoPending` posts. A post is listed under its first tag only.
5. `## About`: links to `/about/`, `/authors/`, `/subscribe/`.
6. `## Optional`: `llms-full.txt`, `/api/posts.json`, `/feed.json`, `/rss.xml`.

Rules: only published, non-draft posts. Links point at the `.md` twin. Absolute URLs. Staging builds use staging origin. `tests/unit/llms.test.ts` asserts the structure; `validate-dist.ts` asserts the H1 and that every post's twin is linked.

### 7.2 `/llms-full.txt`

All published posts concatenated as clean Markdown, newest first. The file starts with `# 2 Minute Serverless` and a blockquote. Per post:

```md
---

# {title}

URL: https://www.serverless.fyi/p/{slug}/
Published: {YYYY-MM-DD}
Tags: {tag1}, {tag2}

{body markdown}
```

Heading demotion: body headings keep their levels (body starts at H2 already). Remove MDX components and replace with plain Markdown equivalents (see 7.3). Size limit: under 5 MB, asserted in `validate-dist.ts`. If it ever approaches 4 MB, split: keep `llms-full.txt` as the newest 100 posts and link `llms-full-archive.txt` from `llms.txt` (record in ADR).

### 7.3 Markdown twin `/p/<slug>.md`

Generated by `src/pages/p/[slug].md.ts` (static endpoint). Served as `text/markdown` by file extension on GitHub Pages (the server maps `.md` to `text/markdown; charset=utf-8`; the smoke test checks content, not the header).

Content:

```md
---
title: '{title}'
url: https://www.serverless.fyi/p/{slug}/
author: Mohinish Shaikh
published: { YYYY-MM-DD }
updated: { YYYY-MM-DD } # omitted if empty
tags: [tag1, tag2]
description: '{description}'
---

# {title}

> **TL;DR:** {tldr}

**Key takeaways**

- ...

{body}

## Frequently asked questions

### {q}

{a}
```

Rules: frontmatter-lite only (the fields above, no internal fields like `beehiivId`, `draft`; no `subtitle`). Relative image paths become absolute URLs. Internal links become absolute canonical URLs. MDX embed components become plain links (`<YouTube>` to a watch URL, `<Tweet>` to a status URL). `aeoPending` posts omit TL;DR, takeaways and FAQ. Mermaid blocks (none in v1, ADR-014) remain as fenced code. The smoke test checks `# Understanding the DNS Header` appears in the twin. Covered by `markdown.test.ts`.

### 7.4 `/api/posts.json`

Static JSON, one array element per published post, newest first.

```json
{
  "version": "0.1.0",
  "generated": "2026-10-26T00:00:00.000Z",
  "count": 23,
  "posts": [
    {
      "slug": "understanding-the-dns-header",
      "title": "Understanding the DNS Header",
      "description": "...",
      "tldr": null,
      "tags": ["dns", "..."],
      "pubDate": "2025-10-29T00:00:00.000Z",
      "updatedDate": null,
      "url": "https://www.serverless.fyi/p/understanding-the-dns-header/",
      "markdownUrl": "https://www.serverless.fyi/p/understanding-the-dns-header.md",
      "ogImage": "https://www.serverless.fyi/og/understanding-the-dns-header.png"
    }
  ]
}
```

Schema notes: `version` is `SITE_VERSION`. `tldr` is `null` for `aeoPending` posts. Dates are ISO 8601 timestamps. `generated` is the build time (this file is the one place a build timestamp is acceptable). Adding fields is non-breaking; removing or renaming requires a spec change. Presence of the endpoint and of every post is asserted by `validate-dist.ts`. Not built (backlog): `subtitle`, `keyTakeaways`, `wordCount`, `readingTimeMinutes`, `aeoPending` fields and a JSON Schema fixture.

### 7.5 Other endpoints

| Endpoint                    | Spec                                                                                                                                                                                                                                                                                                                   |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/feed.json`                | JSON Feed 1.1 (section 4).                                                                                                                                                                                                                                                                                             |
| `/.well-known/security.txt` | Static file `public/.well-known/security.txt`: `Contact: mailto:mohinish@serverlessvc.com`, `Expires: 2027-10-26` (renewed yearly; `validate-dist.ts` fails when it is within 30 days), `Preferred-Languages: en`, `Canonical: https://www.serverless.fyi/.well-known/security.txt`, `Policy` (SECURITY.md on GitHub). |
| `/humans.txt`               | Credits (generated).                                                                                                                                                                                                                                                                                                   |
| `/site.webmanifest`         | name, short_name, icons, theme_color, background_color, display `minimal-ui`.                                                                                                                                                                                                                                          |
| `/<indexnow-key>.txt`       | Contains only the key (section 12.3).                                                                                                                                                                                                                                                                                  |

## 8. Writing for answer engines (summary)

The authoring rules live in `docs/STYLE_GUIDE.md`. The technical hooks are: visible TL;DR in an `<aside>`, Key takeaways list, question-shaped H2s, visible FAQ, visible `updatedDate`, semantic HTML (`<article>`, `<time datetime>`, `<figure>/<figcaption>`, `<nav aria-label>`), and consistent author entity (same name, photo, `sameAs` in JSON-LD, authors page and bylines).

## 9. Canonical rules

1. Self-referencing canonical on every indexable page: `{SITE_URL}{BASE_PATH}{path}/`.
2. Host is always `https://www.serverless.fyi` in production (ADR-005). The apex `serverless.fyi` redirects to `www` (GitHub Pages does this when the custom domain is `www.serverless.fyi` and apex A records are configured).
3. A post with frontmatter `canonical` set (published elsewhere first) uses that URL as `<link rel="canonical">`, `og:url` remains the on-site URL, and JSON-LD `mainEntityOfPage` uses the canonical value. This is the only case where canonical is not self-referencing.
4. Paginated pages canonicalize to themselves (`/archive/2/` canonical is `/archive/2/`), not to page 1. Page 1 is `/archive/`, never `/archive/1/` (the page generator must not emit `/archive/1/`).
5. Query strings are never part of a canonical (`/archive/?page=2` canonicalizes to `/archive/`; the inline script then moves visitors to `/archive/2/`).
6. Redirect stubs canonicalize to their target (section 10).
7. Tag canonical uses the kebab-case slug (`/t/distributed-systems/`), never the Beehiiv `~` form.
8. Markdown twins and API/feed files are not HTML and carry no canonical `<link>`. For twins, send readers back via the `Source:` line. Optionally add an HTTP `Link: rel=canonical` header only if a proxy is ever added; not possible on GitHub Pages.
9. Staging canonical points at the staging origin and every page is `noindex`.
10. `validate-seo.ts` asserts canonical is absolute and matches the file path in `dist/` (the `canonical` frontmatter override is not yet validated).

## 10. Redirect rules

GitHub Pages cannot issue server redirects (ADR-007). Redirects are static stub pages generated by `integrations/legacy-redirects.mjs` on `astro:build:done` from `migration/legacy-urls.json` (entries with `type: "redirect"`). The manifest is append-only; agents cannot edit it (see `AGENTS.md`).

### 10.1 Stub HTML (exact shape)

Written to `dist/<old>/index.html` (with `~` kept literally in the directory name):

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Redirecting…</title>
    <link rel="canonical" href="https://www.serverless.fyi/t/distributed-systems/" />
    <meta name="robots" content="noindex" />
    <meta http-equiv="refresh" content="0; url=/t/distributed-systems/" />
    <script>
      location.replace('/t/distributed-systems/' + location.hash);
    </script>
  </head>
  <body>
    <a href="/t/distributed-systems/">This page moved here.</a>
  </body>
</html>
```

Four mechanisms, all required, each for a reason: `canonical` consolidates ranking signals to the target; `noindex` keeps the stub out of the index; `meta refresh` works with JS disabled; `location.replace` is instant for browsers and preserves the URL hash (replace avoids a back-button loop). On staging, `canonical`, the refresh URL and the script all include `BASE_PATH`; the canonical uses the staging origin.

The `<title>` of stubs is exempt from the "unique title" check, and stubs are exempt from the single-H1 and description checks. `validate-seo.ts` identifies stubs by the manifest, not by sniffing.

### 10.2 Known redirects

| Old                                                      | New                   | Mechanism                                                                                                                                  |
| -------------------------------------------------------- | --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `/t/<tag-with-~>` (for example `/t/distributed~systems`) | `/t/<tag-with-dash>/` | Stub, generated from `migration/legacy-urls.json`                                                                                          |
| `/authors/mohinish-s`                                    | `/authors/`           | Stub                                                                                                                                       |
| `/login`, `/signup`, `/upgrade`, `/account`              | `/subscribe/`         | Stub                                                                                                                                       |
| `/archive?page=N`                                        | `/archive/N/`         | Inline script in `/archive/` (query strings cannot be routed statically). The script runs `location.replace` for N >= 2 and is not a stub. |
| `/p/<slug>` (no trailing slash)                          | `/p/<slug>/`          | Native: GitHub Pages serves a 301 to the directory URL.                                                                                    |
| `/feed`, `/rss`                                          | not provided          | No legacy feed existed.                                                                                                                    |

Only tags that contain `-` in the new slug need a `~` stub (9 today); all 22 tags are listed in the manifest regardless, with `type: same` for the canonical form. The manifest has 63 entries, 14 of them redirect stubs.

### 10.3 404 fallback

`404.html` includes a small script that tries known legacy patterns before showing 404 content: `/p/<slug>` without slash, `~` in `/t/` paths, `/archive?page=N`. If none match, show the 404 content with search and popular posts, with `noindex`. GitHub Pages returns HTTP 404 for the file, which the smoke test checks.

### 10.4 Rules

- Never delete or change a published slug. If a post must be retired, keep the URL and mark `noindex` or add an on-page notice; do not 404.
- Stubs are excluded from the sitemap and never linked from site navigation.
- Parity (`validate-parity.ts`): every `old` path exists as `dist/<old>/index.html`; for `redirect`, the stub targets `new` and `new` exists. 100 percent required, both on `dist/` and live (`--live`, which follows redirects and requires final 200).

## 11. Core Web Vitals and performance budgets

### 11.1 Targets

| Metric                        | Target                                             | Where measured                                              |
| ----------------------------- | -------------------------------------------------- | ----------------------------------------------------------- |
| Lighthouse mobile Performance | >= 95                                              | LHCI on PR                                                  |
| Lighthouse Accessibility      | 100                                                | LHCI on PR                                                  |
| Lighthouse Best Practices     | >= 95                                              | LHCI on PR                                                  |
| Lighthouse SEO                | 100                                                | LHCI on PR                                                  |
| LCP (field p75)               | < 2.0 s                                            | Search Console Core Web Vitals report, CrUX                 |
| CLS (field p75)               | < 0.05                                             | same                                                        |
| INP (field p75)               | < 200 ms                                           | same                                                        |
| Total byte weight, post page  | <= 400 KB (`resource-summary:total:size`)          | LHCI assertion (measured 80 KB)                             |
| JS on a post page             | < 30 KB gzipped (excludes lazy-loaded Pagefind)    | by construction (about 3 KB inline); no automated check yet |
| Total CSS                     | < 30 KB                                            | by construction; no automated check yet                     |
| Any `dist/` file              | <= 1 MB except Pagefind assets and `llms-full.txt` | `validate-dist.ts`                                          |
| Build time                    | < 3 min                                            | CI job duration                                             |

### 11.2 Implementation requirements

- Zero client JS by default. Allowed islands are listed in ADR-026: theme script, Subscribe enhancement, code-block wrap toggle, YouTube facade, archive and 404 redirect snippets, and the search page, which lazily imports Pagefind (not on page load).
- Cover image is the LCP element: `loading="eager"`, `fetchpriority="high"`, explicit `width` and `height`, AVIF/WebP via `astro:assets`, and `sizes` set. All other images `loading="lazy" decoding="async"` with dimensions.
- Remote cover images (for example Unsplash) are downloaded and committed beside the post (ADR-017). No hotlinking.
- System font stack by default. If a brand font is added: one self-hosted variable WOFF2, `font-display: swap`, preload, Latin subset.
- Embeds use click-to-load facades (YouTube, tweets); no third-party JS before interaction.
- Inline critical CSS (Astro inlines small stylesheets); `@layer` ordering keeps specificity predictable (ADR-011).
- `astro:assets` generates responsive `srcset`; never ship an image wider than 2x its largest display size.
- Prefetch is `hover` strategy only; `prefetchAll` stays false.

### 11.3 Enforcement

`lighthouserc.json`: pages = home, `/p/understanding-the-dns-header/`, `/t/distributed-systems/`, archive; mobile; `numberOfRuns: 3`; assertions `categories:performance >= 0.95`, `categories:accessibility = 1`, `categories:best-practices >= 0.95`, `categories:seo = 1`, `resource-summary:total:size <= 409600` on post URLs, `unused-javascript` warn. Measured locally: 100/100/100/100 on all four, LCP 1.0 to 1.4 s, CLS <= 0.002. Field metrics are monitored in Search Console after launch; regression below target for 28 days opens a GitHub issue labeled `perf`.

## 12. Search engine onboarding

### 12.1 Google Search Console (owner)

1. Add property type **Domain** `serverless.fyi` and verify with a DNS TXT record. A domain property survives the host change and covers apex, `www`, http and https.
2. Verify before touching DNS at cutover (cutover step 4).
3. After cutover, submit `https://www.serverless.fyi/sitemap-index.xml`. No "Change of address" is needed (same domain).
4. Monitor Pages (indexing) and Core Web Vitals daily for 14 days. Success: indexed pages 30 days after cutover >= pre-migration count.
5. Use URL Inspection on the home page, three posts, one `~` stub, and request indexing for the home page and newest post.
6. Record the pre-migration indexed-page count in `docs/PRD.md` before cutover.

### 12.2 Bing Webmaster Tools (owner)

1. Sign in and **Import from Google Search Console** (this verifies the site).
2. Submit the same sitemap.
3. Confirm IndexNow shows as active in the Bing dashboard after the first ping.

### 12.3 IndexNow (agent builds, owner verifies)

1. Generate a key: 8 to 128 characters, `[a-zA-Z0-9-]`. Create `public/<key>.txt` whose content is exactly the key. Commit it (the key is public by design). Store the key name in the repo variable `INDEXNOW_KEY`.
2. `.github/workflows/indexnow.yml` runs after a successful `Deploy to GitHub Pages` run on `main` (skipped unless `vars.PUBLIC_INDEXABLE == 'true'`) and on manual dispatch. The key file is found by name (32 hex characters) in `public/`.
3. `scripts/indexnow.sh` diffs added or modified `src/content/posts/*/index.md*` files in the last commit, maps each to its `/p/<slug>/` URL (plus `/` and `/archive/`), and POSTs JSON to `https://api.indexnow.org/indexnow`:

   ```json
   {
     "host": "www.serverless.fyi",
     "key": "<key>",
     "keyLocation": "https://www.serverless.fyi/<key>.txt",
     "urlList": ["..."]
   }
   ```

4. Expect HTTP 200 or 202. 4xx fails the job with a warning, not a block.
5. At cutover, ping every URL once from `sitemap-0.xml` (manual `workflow_dispatch` with input `all: true`).
6. IndexNow is honored by Bing, Yandex, Seznam, Naver and others; Google does not use it.

## 13. Acceptance checklist (Sprint 4 gate)

- `validate-seo.ts` reports 0 errors across all templates.
- `validate-feeds.ts` reports 0 errors, including per-tag feeds.
- Lighthouse thresholds met on home, post, tag, archive.
- Rich Results Test passes for `BlogPosting` and `BreadcrumbList` on three sample posts (owner runs on staging, screenshots in PR). `FAQPage` is not expected to produce a rich result (section 3.4).
- `robots.txt` production and staging outputs match sections 6.1 and 6.2.
- `llms.txt`, `llms-full.txt`, twins and `api/posts.json` present and validated.
- No `media.beehiiv.com` string in `dist/`.

## Feeds page

`/feeds/` is a human-readable index of every feed: site-wide RSS 2.0, Atom and JSON Feed URLs as copyable text, a per-topic RSS list, and the agent endpoints (`llms.txt`, `llms-full.txt`, `api/posts.json`). It is linked from the main navigation ("RSS"). Feeds are not styled with XSLT, because Chrome is removing XSLT support and already shows a warning on XSLT pages.
