# Style Guide

How posts are written, structured and marked up for 2 Minute Serverless. Covers authoring rules, writing for answer engines, the frontmatter field reference, and voice.

## 1. Voice (from SOUL.md)

**Promise:** freshly baked serverless nuggets in two minutes. Respect the reader's time above all.

**Voice:** a senior platform engineer explaining to a sharp peer over coffee. Direct, concrete, a little playful. No hype words ("revolutionary", "game-changer"), no filler intros. Numbers, versions, trade-offs, diagrams.

**Values**

- Clarity over cleverness. Answer first, then explain.
- Accuracy over speed. Cite sources; date claims that can go stale.
- Ownership. Content lives in git; the reader's inbox and privacy are sacred (no trackers, no dark patterns).
- Craft. Fast pages, accessible to everyone, beautiful on a phone.
- Durability. URLs are promises: never break them.

**Taste for agents (and editors)**

- Prefer deleting words to adding them. Prefer platform features to dependencies.
- If a choice makes the page slower, heavier, or less accessible, it needs a written reason.
- When unsure, ask the owner rather than guess; when guessing is unavoidable, write the assumption in the PR.
- Do not edit the author's prose unless asked. Do not invent quotes, numbers, events, or sources. Mark gaps `TODO(owner)`.

Owner: Mohinish Shaikh, Serverless Ventures LLC.

## 2. Authoring rules

1. One H1 per page: the title, rendered by the layout. The body starts at H2. No skipped heading levels (H2 then H4 is a violation).
2. Every image has meaningful `alt`. Decorative images use `alt=""`. Diagrams get alt that states what the diagram shows and a caption when useful (`<figure>/<figcaption>`).
3. The first paragraph after the TL;DR answers the title's implicit question directly (answer-first).
4. Use descriptive link text, never "click here" or "this link". Links to external sources name the source.
5. Code blocks always have a language tag (`ts`, `go`, `bash`, `text` when none applies). Prefer short, runnable snippets. State versions.
6. Length: target a 2-minute read, about 400 to 600 words. Long deep-dives are allowed; a table of contents is generated automatically above 1,200 words.
7. Images live beside the post (`src/content/posts/<slug>/`), referenced relatively so `astro:assets` optimizes them. No hotlinked images, including Unsplash (ADR-017). No `media.beehiiv.com` URLs.
8. Diagrams: commit an SVG (ADR-014). No Mermaid in posts.
9. Internal links use root-relative canonical form with trailing slash (`/p/other-post/`); build code converts via `url()`. Link to at least 2 related posts where relevant.
10. Tags: reuse existing tags first (video-streaming, iac, dns, apache-flink, apache-pulsar, rfm, distributed-systems, terraform, 2024, pqca, tax, qsbs, object-storage, distributed-filesystem, serverless-meetup, xrp, crypto, plus any added since). New tags are kebab-case, 1 to 6 per post.
11. Tables: use GFM tables for tabular data; keep them narrow enough to scroll inside the wrapper on phones.
12. Embeds: use `<YouTube id="…" />` and `<Tweet id="…" />` facades. No third-party scripts.
13. Dates and numbers: write absolute dates ("2025-11-06" or "6 November 2025"), not "recently". Put version numbers on tools.
14. Spelling and lint: `pnpm lint` runs cspell and markdownlint; add proper nouns to `cspell.json`.
15. Never change a published `slug`.

## 3. Writing for answer engines (AEO)

Enforced by the `seo-aeo-reviewer` subagent and documented here. Technical details in `docs/SEO_AEO.md`.

1. **Answer-first.** The TL;DR box at the top states the answer in 1 to 3 sentences (40 to 320 characters). A reader and an LLM should be able to quote it alone.
2. **Question-shaped H2s where natural**, for example "What is a vector clock?", "How big is a DNS header?". Do not force it when a noun phrase is clearer.
3. **Define in one sentence before elaborating.** "A vector clock is a list of counters, one per node, used to order events without a shared clock."
4. **Concrete facts.** Numbers, versions, dates, limits, units. "12 bytes" beats "small".
5. **Date what can go stale.** Show `updatedDate` (rendered visibly) when you refresh content, and write "as of 2025-11" for volatile claims.
6. **Visible FAQ only.** Add `faq` entries only for real questions a reader would ask; each answer is 1 to 3 sentences. They render on the page and into `FAQPage` JSON-LD. Do not add FAQs just to carry markup. Google restricts FAQ rich results; FAQ still helps answer engines parse Q&A.
7. **Author entity consistency.** Same name (Mohinish Shaikh / Mohinish S), photo, and `sameAs` everywhere: byline, authors page, JSON-LD.
8. **Semantic structure.** The templates emit `<article>`, `<time datetime>`, `<figure>/<figcaption>`, `<nav aria-label>`, and `<aside>` for the TL;DR. Authors do not hand-write layout HTML in MDX.
9. **Cite sources** with descriptive links; prefer primary sources (RFCs, papers, project docs).
10. **No thin content.** Under 300 words needs a reason (for example a meetup recap).
11. **Unique title and description per post.** Title keyword-first, 60 characters or fewer for title + site suffix when possible.
12. **`aeoPending` posts** (migrated, awaiting owner-written content): TL;DR and Key takeaways are hidden and omitted from JSON-LD, the Markdown twin, `llms.txt` one-liners (description is used), and the API (`tldr: null`). Remove `aeoPending` once `tldr` and at least 2 `keyTakeaways` are written. Production deploy blocks on leftover `TODO(owner)` unless `aeoPending: true`.

Reviewer checklist (per post): title ≤ 60 and keyword-first; description 70 to 160 and unique; one H1, logical H2s; TL;DR answers the title in ≤ 3 sentences; takeaways concrete; FAQ real and visible; 2+ internal links; alt text; JSON-LD matches visible content; `.md` twin renders; not thin.

## 4. Frontmatter field reference

Schema lives in `src/content.config.ts` (zod). The build fails on violations. Posts live at `src/content/posts/<slug>/index.md|mdx`.

| Field          | Type                   | Required                           | Rules                                                                                                                                              |
| -------------- | ---------------------- | ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `title`        | string                 | yes                                | 5 to 110 chars. Rendered as the single H1.                                                                                                         |
| `subtitle`     | string                 | no                                 | Up to 200 chars. Shown under the title.                                                                                                            |
| `description`  | string                 | yes                                | 70 to 160 chars, unique. Used for meta description, OG, feeds. Migrated posts: see ADR-018.                                                        |
| `slug`         | string                 | yes                                | Regex `^[a-z0-9]+(?:-[a-z0-9]+)*$`. Equals directory name. For migrated posts, equals the Beehiiv slug byte-for-byte. Never changes after publish. |
| `pubDate`      | date                   | yes                                | `YYYY-MM-DD` (coerced to date). Not in the future unless `draft: true`.                                                                            |
| `updatedDate`  | date                   | no                                 | Set when content is materially revised. Drives `dateModified`, sitemap `lastmod`, visible "Updated" label.                                         |
| `author`       | reference to `authors` | no                                 | Defaults to `mohinish`.                                                                                                                            |
| `tags`         | string[]               | yes                                | 1 to 6 kebab-case tags. First tag is `articleSection`.                                                                                             |
| `cover`        | image                  | no                                 | Local file beside the post. LCP image; width/height from the file.                                                                                 |
| `coverAlt`     | string                 | required if `cover`                | Describes the image.                                                                                                                               |
| `tldr`         | string                 | required unless `aeoPending`       | 40 to 320 chars, 1 to 3 sentences, direct answer.                                                                                                  |
| `keyTakeaways` | string[]               | required (≥ 2) unless `aeoPending` | Up to 6, concrete, one sentence each.                                                                                                              |
| `faq`          | `{ q, a }[]`           | no                                 | Up to 8. Rendered visibly and emitted as `FAQPage`. Omitted from JSON-LD if `aeoPending`.                                                          |
| `aeoPending`   | boolean                | no, default `false`                | `true` hides TL;DR/takeaways and omits them from JSON-LD, twin, llms, API.                                                                         |
| `beehiivId`    | string                 | no                                 | Provenance for migrated posts. Not rendered, not in twin.                                                                                          |
| `beehiivUrl`   | URL                    | no                                 | Provenance. May mention `beehiiv`; allowed by the Sprint 10 grep.                                                                                  |
| `canonical`    | URL                    | no                                 | Only if the post was published elsewhere first. Overrides `<link rel="canonical">` (SEO_AEO section 9).                                            |
| `draft`        | boolean                | no, default `false`                | Drafts are excluded from build outputs, feeds, sitemap, llms, API.                                                                                 |
| `noindex`      | boolean                | no, default `false`                | Page builds with `noindex`; excluded from sitemap, feeds, llms.                                                                                    |
| `series`       | string                 | no                                 | Series name for grouping and related links.                                                                                                        |

Cross-field rules: `cover` requires `coverAlt`; unless `aeoPending`, `tldr` and at least 2 `keyTakeaways` are required.

Authors (`src/content/authors/authors.json`): `id`, `name`, `shortName`, `jobTitle`, `bio`, `avatar`, `url`, `sameAs[]`, `knowsAbout[]`. Keep identical to JSON-LD `Person`.

Tags may have an optional description file `src/content/tags/<tag>.md` used for the tag page intro and meta description (70 to 160 chars). Without it, the default template is used.

### Example

```mdx
---
title: 'Understanding the DNS Header'
subtitle: 'The Tiny Packet That Runs the Internet'
description: 'A byte-by-byte walkthrough of the 12-byte DNS header — ID, flags, opcodes, RCODEs and counts — and why each field matters for resolvers.'
slug: understanding-the-dns-header
pubDate: 2025-10-29
tags: [dns, networking]
cover: ./cover.png
coverAlt: 'Diagram of the 12-byte DNS header fields'
tldr: 'Every DNS message starts with a fixed 12-byte header: a 16-bit ID, a flags word (QR, Opcode, AA, TC, RD, RA, Z, RCODE) and four 16-bit section counts.'
keyTakeaways:
  - 'The ID field matches responses to queries.'
  - 'The TC bit signals truncation and triggers a TCP retry.'
faq:
  - q: 'How big is a DNS header?'
    a: 'Exactly 12 bytes, regardless of the message size.'
beehiivUrl: https://www.serverless.fyi/p/understanding-the-dns-header
---
```

## 5. Post body skeleton

```md
(TL;DR and Key takeaways are rendered from frontmatter; do not repeat them in the body)

First paragraph: answer the title's implicit question in plain words.

## What is <thing>?

One-sentence definition, then detail.

## How it works

Steps, a diagram (SVG with alt), a short code block with a language tag.

## Trade-offs and gotchas

Numbers, versions, limits.

## Related reading

- [Descriptive link text](/p/related-post/)
```

## 6. Pre-PR checklist for a post

- [ ] `description` 70 to 160; unique
- [ ] `tldr` and ≥ 2 `keyTakeaways` (or `aeoPending: true` with reason in the PR)
- [ ] `cover` + `coverAlt`, image committed locally
- [ ] Tags reuse existing ones where they fit
- [ ] H2 start, no skipped levels, code fences have languages
- [ ] 2+ internal links, descriptive link text
- [ ] No `TODO(owner)` left (unless `aeoPending`)
- [ ] `pnpm check` is green; `.md` twin previewed
