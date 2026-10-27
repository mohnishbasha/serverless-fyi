# Changelog

All notable changes to the site codebase are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses [Semantic Versioning](https://semver.org/). Content-only changes (posts) do not bump the version.

## [Unreleased]

### Changed

- The home page is livelier. Post cards show cover thumbnails (AVIF/WebP, lazy, 16:9, with a gentle zoom on hover). "Latest posts" comes first and leads with a large **Latest issue** featured card. Tag and listing cards get thumbnails too.

## [1.0.0] - 2026-10-27

Production cutover: `https://www.serverless.fyi` is served from GitHub Pages instead of Beehiiv.

### Changed

- DNS points to GitHub Pages, with the custom domain `www.serverless.fyi`, HTTPS enforced, and the apex redirecting to www.
- Production build is indexable (`PUBLIC_INDEXABLE=true`); IndexNow was pinged with all 52 sitemap URLs.
- A serene, calm color theme adapted from serverlessvc.com. It has a white and mint base, sage green accents, a soft gradient wash, pastel tag pills, a frosted sticky header, and a matching dark mode. OG cards, the favicon and the email template follow suit (ADR-027).
- The newsletter provider is now Kit's free plan, replacing Beehiiv (`PUBLIC_NEWSLETTER_PROVIDER=kit`); self-hosted listmonk + SES is the planned migration before ~10,000 subscribers (ADR-028).
- Responsive refinements: every template works from 320px to 1440px+ with no horizontal overflow, 44px tap targets (`.more-link`, `.link-list`), a full-width subscribe form below 30rem and a second scrollable nav row on mobile (ADR-029).

### Added

- `/feeds/` page with RSS 2.0, Atom and JSON Feed URLs, per-topic feeds and agent endpoints. It is linked as "RSS" in the main navigation, and the subscribe page has a "Prefer RSS?" section.

### Fixed

- `/.well-known/security.txt` returned 404 on GitHub Pages because the Pages artifact excluded dot-folders. The deploy now includes hidden files, and smoke checks the file.

## [0.1.0] - 2026-10-27

### Added

- Product specs in `docs/`: PRD, architecture, content migration, SEO/AEO, test plan, ADR log (ADR-001 to ADR-026), runbook and style guide.
- An Astro 7 static site with TypeScript strict mode, content collections with a zod schema, MDX, Shiki dual themes, and responsive templates (home, post, tag, archive, tags, authors, subscribe, about, privacy, search, 404) with dark mode.
- Migration pipeline (scrape and API exporters, HTML to MDX converter with golden fixtures, image localizer, legacy URL manifest, report). It imported all 23 Beehiiv posts and 50 images.
- Legacy URL parity: 63 manifest entries, including 14 static redirect stubs.
- SEO and AEO: per-page meta, a JSON-LD `@graph` on every page, OG images built with satori, RSS/Atom/JSON Feed plus per-tag RSS, a sitemap with `lastmod`, an environment-aware `robots.txt`, `llms.txt`, `llms-full.txt`, Markdown twins and `/api/posts.json`.
- Pagefind static search, loaded lazily on `/search/`.
- A newsletter provider adapter (`beehiiv`, `listmonk`, `buttondown`, `kit`, `none`) and a subscribe form that works without JS.
- Infrastructure as code for the self-hosted newsletter stack (listmonk + Amazon SES) in `infra/newsletter/`, an email template, and a workflow that creates draft campaigns.
- Tests and checks:
  - Vitest unit tests.
  - Playwright E2E on 4 viewports plus a no-JS project.
  - axe in light and dark mode.
  - Linux-rendered visual snapshots.
  - Lighthouse CI.
  - `html-validate`, lychee, and the parity, SEO, feed and dist validators.
- CI/CD: CI, Pages deploy, smoke tests every 6 hours, weekly link check, IndexNow, release, CodeQL, labeler, Dependabot.
- Agent and harness files: AGENTS.md, CLAUDE.md, SOUL.md, SKILLS.md, Claude Code commands, agents and skills, `.agent/skills`, Copilot and Cursor rules.

[Unreleased]: https://github.com/mohnishbasha/serverless-fyi/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/mohnishbasha/serverless-fyi/compare/v0.1.0...v1.0.0
[0.1.0]: https://github.com/mohnishbasha/serverless-fyi/releases/tag/v0.1.0
