# CONTENT_MIGRATION — Beehiiv to Astro/MDX

Scope: move 23 posts, 17 tags, the authors page and all legacy URLs from Beehiiv to `src/content/posts/<slug>/index.mdx` without changing the author's prose, and preserve URL parity. Also covers the subscriber export/import and rollback.

Principles:

- Never invent content. Never "improve" the author's writing.
- Every conversion rule has a golden fixture (`migration/fixtures/*.html` in, `*.expected.md` out). Tests first.
- Raw exports are reproducible and git-ignored (`migration/raw/`). Converted output is committed.
- Subscriber data is owner-only and never in the repo.

## 1. Facts from the live site inventory

- Sitemap `https://www.serverless.fyi/sitemap.xml` lists 44 URLs: `/`, `/subscribe`, `/authors`, `/authors/mohinish-s`, 23 posts at `/p/<slug>`, 17 tags at `/t/<tag>`.
- Tags: 2024, apache-flink, apache-pulsar, crypto, distributed-filesystem, distributed-systems, dns, iac, object-storage, pqca, qsbs, rfm, serverless-meetup, tax, terraform, video-streaming, xrp. Live slugs use hyphens. The `~` form (`/t/distributed~systems`) is a legacy Beehiiv encoding that is still stub-redirected.
- `/archive?page=1` and `?page=2` together list the same 23 posts.
- No Beehiiv RSS feed is enabled (publication `rss_feeds = []`), so legacy feed URLs need no parity.
- The Beehiiv API key is not available to the agent. The sitemap scrape is therefore the primary export path in use. The API exporter is implemented and used when the owner supplies `BEEHIIV_API_KEY`.

## 2. Export methods

Order of preference per `Prompt.md`; actual order used is 2 then 1 when a key appears.

| #   | Method                                 | Script                        | Status                                                                                                   |
| --- | -------------------------------------- | ----------------------------- | -------------------------------------------------------------------------------------------------------- |
| 1   | Beehiiv API v2                         | `migration/fetch-beehiiv.ts`  | Implemented; runs only if owner provides `BEEHIIV_API_KEY` and `BEEHIIV_PUBLICATION_ID` in `.env.local`. |
| 2   | Sitemap scrape of embedded Remix state | `migration/scrape-beehiiv.ts` | **Primary path used.**                                                                                   |
| 3   | Manual dashboard export                | Owner                         | Required for the subscriber CSV in any case.                                                             |

### 2.1 Sitemap scrape (primary)

1. Fetch `https://www.serverless.fyi/sitemap.xml` (and any child sitemaps). Collect every `/p/`, `/t/` and static URL. Record all in the URL set for the manifest.
2. Fetch each `/p/<slug>` page politely: 1 request per second, `User-Agent: serverless-fyi-migration/1.0 (+https://github.com/mohnishbasha/serverless-fyi)`, retry with backoff on 429/5xx, stop on repeated failure.
3. Each post page embeds `window.__remixContext = {...}`. Extract the script text, take the JSON object (brace-balanced parse, not a greedy regex), and read `state.loaderData["routes/p/$slug"]`. This is more reliable than DOM scraping, so DOM scraping is not used for post content.
4. From that object take `post` and `html` (below). Save the whole loader object as `migration/raw/posts/<slug>.json` (git-ignored) and the raw page as `migration/raw/html/<slug>.html`.
5. Also fetch `/archive?page=1` and `/archive?page=2`; assert the union of `/p/` links equals the sitemap post set (23). Mismatch is a hard error listed in the report.
6. Fetch `/authors` and `/authors/mohinish-s` for the author bio and photo; the same Remix state technique applies, and the DOM is the fallback.
7. Download the logo, favicon set and author avatar to `public/brand/`.

Parse failures (missing `__remixContext`, missing loader key, empty `html`) fail the run for that slug and appear in `migration/report.md`. No partial post is written.

### 2.2 API exporter (when key supplied)

`GET https://api.beehiiv.com/v2/publications/{PUBLICATION_ID}/posts?status=confirmed&limit=100&page=N&expand[]=free_web_content` with `Authorization: Bearer $BEEHIIV_API_KEY`. Paginate to exhaustion. Map `title`, `subtitle`, `slug`, `web_url`, `publish_date` (unix to ISO), `content_tags`, `thumbnail_url`, `authors`, `content.free.web` (HTML), `meta_default_description`. Save raw JSON to `migration/raw/`. The key lives only in `.env.local`, is never committed, and the exporter never runs in CI.

Both exporters normalize into one intermediate record (`migration/raw/normalized/<slug>.json`) so `html-to-md.ts` has a single input shape.

## 3. Field mapping

Scrape source: `loaderData["routes/p/$slug"].post` unless noted. API source column shows the equivalent field.

| Target (frontmatter / body)   | Scrape source                         | API source                   | Rule                                                                                                                                                                                                                                |
| ----------------------------- | ------------------------------------- | ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `title`                       | `post.web_title`                      | `title`                      | Verbatim. Must be 5-110 chars; if longer, fail and list in report (never truncate silently).                                                                                                                                        |
| `subtitle`                    | `post.web_subtitle`                   | `subtitle`                   | Verbatim; omit if empty; max 200.                                                                                                                                                                                                   |
| `slug`                        | `post.slug`                           | `slug`                       | Byte for byte (e.g. `post-quantum-cryptography-fd6d`). Must match `^[a-z0-9]+(?:-[a-z0-9]+)*$`; folder name equals slug.                                                                                                            |
| `pubDate`                     | `post.override_scheduled_at` (ISO)    | `publish_date` (unix to ISO) | Fall back to `created_at` if `override_scheduled_at` is null; log it. Written as `YYYY-MM-DD`.                                                                                                                                      |
| `updatedDate`                 | `post.updated_at`                     | n/a                          | Set only if more than 24 h after `pubDate` instant; otherwise omit.                                                                                                                                                                 |
| `description`                 | `post.meta_default_description`       | `meta_default_description`   | See section 3.1. 70-160 chars.                                                                                                                                                                                                      |
| `tags`                        | `post.content_tags[].slug`            | `content_tags`               | Normalize per section 6. At least 1 (build requires). Posts with none get flagged and need an owner choice; the migrator does not guess.                                                                                            |
| `author`                      | `post.authors[0]`                     | `authors`                    | Map to `mohinish`; any other author is flagged.                                                                                                                                                                                     |
| `cover`                       | `post.image_url`                      | `thumbnail_url`              | Download to `./cover.<ext>` per section 5 (Unsplash covers included). Omit if absent.                                                                                                                                               |
| `coverAlt`                    | none                                  | none                         | Not available from Beehiiv. If the page has an `<img alt>` for the cover use it; else use the post title and flag `coverAlt: placeholder` in the report for owner review (required by schema; not invented prose beyond the title). |
| `beehiivId`                   | `post.id`                             | `id`                         | Provenance.                                                                                                                                                                                                                         |
| `beehiivUrl`                  | `https://www.serverless.fyi/p/<slug>` | `web_url`                    | Provenance.                                                                                                                                                                                                                         |
| reading time                  | `post.estimated_reading_time`         | n/a                          | Not stored; computed at build from body. Reported for comparison only.                                                                                                                                                              |
| `aeoPending`                  | n/a                                   | n/a                          | Always `true` for migrated posts.                                                                                                                                                                                                   |
| `tldr`, `keyTakeaways`, `faq` | n/a                                   | n/a                          | Omitted. Owner writes later. No `TODO(owner)` placeholders are written into rendered fields; `aeoPending: true` hides those blocks and omits them from JSON-LD.                                                                     |
| `draft`, `noindex`            | n/a                                   | `status`                     | `draft: false`. API: only `confirmed` posts are exported.                                                                                                                                                                           |
| body                          | `html` (loader data)                  | `content.free.web`           | Converted per section 4.                                                                                                                                                                                                            |

### 3.1 Description rule (no invented content)

Order of attempts, first that yields 70-160 chars wins:

1. `meta_default_description` if it is 70-160 chars.
2. `web_subtitle` if 70-160 chars.
3. Compose from the author's own words only: subtitle (if any) followed by the first sentence(s) of the converted body text, joined with a single space, then truncated at a word boundary to at most 160 chars (trailing punctuation cleaned, no ellipsis added). If the result is still under 70 chars, add further body sentences until the limit is reached or the body is exhausted.
4. If still under 70 chars (very short post), fail the description check for that post: write the best available text, mark `description` as needing review.

Every post whose description came from step 2 or later, or that fell back, is listed in `migration/report.md` under "Descriptions to review" with the source step used. Nothing is paraphrased or generated. The owner reviews and may overwrite any description in the Sprint 2 PR. Duplicate descriptions across posts are also flagged (SEO validator requires unique descriptions).

## 4. HTML to Markdown rules

Pipeline in `migration/html-to-md.ts`: `unified` + `rehype-parse` (fragment mode) + custom rehype transforms + `rehype-remark` + `remark-gfm` + `remark-stringify`. Output is MDX-safe Markdown. Each rule below has at least one fixture.

| #   | Rule                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Strip Beehiiv chrome**: subscribe widgets and forms, "Powered by beehiiv", share bars, poll/survey embeds, referral blocks, tracking pixels (1x1 images, `beacon` URLs), preheader text, footer/unsubscribe blocks.                                                                                                                                                                                                                                                                                                                                                                                          |
| 2   | **Unwrap layout wrappers**: inline-styled `<div>`, `<span>`, and layout `<table>` wrappers (single-cell or presentation tables with `role=presentation`). Keep their children. Remove all `style`, `class`, `data-*`, `id` attributes except where needed for rule 6/7.                                                                                                                                                                                                                                                                                                                                        |
| 3   | **Semantic tables** (with `<th>` or multiple rows and columns of data) become GFM tables. Cells containing block content that GFM cannot express fall back to inline HTML table and are listed in the report.                                                                                                                                                                                                                                                                                                                                                                                                  |
| 4   | **Headings**: body starts at H2. Beehiiv H1 in the body is demoted to H2, H2 to H3, and so on, preserving order; no skipped levels (if a skip would occur, close the gap and log it). Page title H1 comes from the layout.                                                                                                                                                                                                                                                                                                                                                                                     |
| 5   | **Code blocks**: `<pre><code>` becomes fenced code. Language from `class="language-x"`/`lang-x`/`data-language`; otherwise a content heuristic (shebang, `{`/`:` JSON, `FROM` (leading), `resource "`, `package`, `def`, `apply plugin`, YAML `key:` lines); default `text`. Inline `<code>` stays inline backticks. Whitespace inside code is preserved exactly.                                                                                                                                                                                                                                              |
| 6   | **Buttons** (`<a>` styled as buttons, `role=button`, wrapped in button tables) become plain links with the same text.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| 7   | **Embeds**: YouTube iframes/links become `<YouTube id="..." />`; X/Twitter blocks become `<Tweet id="..." />`; GitHub gist/repo cards become a plain link. Embeds are click-to-load facades; no third-party JS until click. Imports for these components are added to the MDX file. Unrecognized iframes become a plain link and are logged.                                                                                                                                                                                                                                                                   |
| 8   | **Links**: strip `utm_*` (and `_bhlid`, `ref`, `fbclid`, `gclid`) query parameters from all links; drop empty `?`. Rewrite internal absolute links `https://www.serverless.fyi/p/x` to `/p/x/` and `/t/a~b` to `/t/a-b/`, `/authors/mohinish-s` to `/authors/`. Rewritten internal links are written as root-relative Markdown; the build resolves them through the base-path plugin so staging works (see ARCHITECTURE section 6). Beehiiv redirect-tracked links (`link.beehiiv.com`, `*.beehiiv.com/c/...`) are resolved once to their target and the target is used; unresolved ones are kept and flagged. |
| 9   | **Images**: `<img>` and `<figure>` become `![alt](./<hashed>.<ext>)`; `<figcaption>` becomes an italic line under the image. Empty alt is kept as `alt=""` (decorative) and counted in the report as missing alt for owner review. Linked images keep the link. See section 5.                                                                                                                                                                                                                                                                                                                                 |
| 10  | **Lists, blockquotes, emphasis, hr**: standard mapping. Beehiiv "callout" divs become blockquotes. Nested lists preserved.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| 11  | **MDX safety**: escape `{`, `}`, `<` outside code that would be parsed as JSX/expressions. Raw leftover HTML that is not valid MDX is escaped or removed with a report entry.                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| 12  | **Whitespace and entities**: normalize non-breaking spaces and zero-width characters (including Beehiiv spacers) to nothing/normal spaces; keep typographic quotes and dashes exactly as authored.                                                                                                                                                                                                                                                                                                                                                                                                             |
| 13  | **Empty nodes**: remove empty paragraphs, `<br>`-only blocks, empty headings.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| 14  | **No editing of prose**: no spelling fixes, rewording, reflow of sentences, or heading rewrites. Line wrapping is left to the stringifier with no hard wrap.                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| 15  | **Diagrams**: no Mermaid conversion. Any image is treated as an image. (No migrated post uses Mermaid.)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |

Golden fixtures to write first (names): `code-blocks`, `gfm-table`, `layout-table-unwrapped`, `button-to-link`, `youtube-embed`, `tweet-embed`, `internal-link-rewrite`, `utm-stripped`, `beehiiv-chrome`, `heading-demotion`, `image-figure-caption`, `callout-blockquote`, `mdx-escape`, `tracking-link`. A snapshot test over all 23 real converted posts asserts: no `utm_`, no `style=`, no `beehiiv` string except provenance fields, no `<div`.

## 5. Image localization

`migration/localize-images.ts`, run after conversion:

1. Collect every image URL from the converted body, `post.image_url` (cover), and author/brand assets. Hosts handled: `media.beehiiv.com`, `beehiiv-images-production.s3.amazonaws.com`, `*.beehiiv.com`, and `images.unsplash.com` (covers). All are downloaded; none stay remote.
2. Strip Cloudflare transform prefixes `cdn-cgi/image/<opts>/` to fetch the original. For Unsplash, request the original file with a fixed width param sufficient for the OG/cover (e.g. `w=2000&q=85&fm=jpg`), not the thumbnail variant already in the URL; record the final URL used.
3. Download with the same polite client (1 req/s), verify `content-type` starts with `image/`, verify non-zero size, retry with backoff. Failure of any image fails the post.
4. Store in `src/content/posts/<slug>/` as `<name>-<hash8>.<ext>` where `hash8` is the first 8 hex of the SHA-256 of the bytes and `<name>` is a slugified source basename (fallback `img`). Same bytes in one post reuse one file. The cover is stored as `cover-<hash8>.<ext>`. Identical filenames across posts are fine (folders differ).
5. Rewrite references to relative paths (`./cover-ab12cd34.jpg`). Frontmatter `cover` uses the relative path so `astro:assets` optimizes it. Body images use the same relative form.
6. Preserve animated GIFs as-is (no conversion). SVGs are copied untouched.
7. Write an image manifest `migration/raw/images.json` (url to file, bytes, hash) for reproducibility. Unsplash covers keep attribution: if the Unsplash URL carries photographer info it is recorded in the report; the owner decides whether to add a credit line.
8. Fail the migration if any `media.beehiiv.com`, `beehiiv-images-production`, or `cdn-cgi/image` string remains in any MDX or frontmatter. This is enforced by `localize-images.test.ts` (grep over `src/content`) and again by the `dist/` asset-sanity check.
9. Re-running is idempotent: existing files with matching hash are not re-downloaded.

## 6. Tag normalization

- Live tag slugs already use hyphens; normalize by: lowercase, replace `~` and spaces and underscores with `-`, collapse repeats, trim. Result must match `^[a-z0-9]+(?:-[a-z0-9]+)*$`.
- `migration/tag-map.json` records `{ "legacy": "distributed~systems", "slug": "distributed-systems", "display": "Distributed Systems" }` for every tag. `display` comes from `content_tags[].display`.
- Expected set (17): 2024, apache-flink, apache-pulsar, crypto, distributed-filesystem, distributed-systems, dns, iac, object-storage, pqca, qsbs, rfm, serverless-meetup, tax, terraform, video-streaming, xrp. Any tag seen in a post that is not in this set is added and reported; any in the set but unused by a post is reported.
- Each post gets 1-6 tags. More than 6 is cut to the 6 in Beehiiv order and the dropped ones are reported (owner decides).
- Optional `src/content/tags/<tag>.md` descriptions; a default template is used if absent (70-160 chars): "Posts on {display} from 2 Minute Serverless: short, practical notes on data, AI and distributed systems."
- The `~` legacy forms for every hyphenated tag are generated as redirect entries in the manifest (section 7). Tags without a hyphen have no `~` variant.

## 7. Legacy URL manifest (`migration/legacy-urls.json`)

Generated by `migration/build-manifest.ts`, committed, append-only after the first commit (agents cannot edit it; the owner approves additions). It is the input to `legacy-redirects.mjs` and `validate-parity.ts`.

Schema (JSON array):

```json
[
  { "old": "/p/understanding-the-dns-header", "new": "/p/understanding-the-dns-header/", "type": "same" },
  { "old": "/t/distributed~systems", "new": "/t/distributed-systems/", "type": "redirect" },
  { "old": "/authors/mohinish-s", "new": "/authors/", "type": "redirect" },
  { "old": "/login", "new": "/subscribe/", "type": "redirect" }
]
```

Fields:

| Field  | Type                     | Rule                                                                                                                                                                                      |
| ------ | ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `old`  | string                   | Path only, starts with `/`, no host, no query, no trailing slash except `/`. Percent-encoding kept as served (`~` is literal).                                                            |
| `new`  | string                   | Destination path with trailing slash, root-relative without base. Must exist in `dist/`.                                                                                                  |
| `type` | `"same"` or `"redirect"` | `same`: `new` is the page itself (old path plus slash); parity asserts the page exists. `redirect`: a stub is generated at `old`, parity asserts the stub targets `new` and `new` exists. |

Contents (expected at current volume):

| Group               | old                              | new           | type     | Count                                                                                                                                                     |
| ------------------- | -------------------------------- | ------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Home                | `/`                              | `/`           | same     | 1                                                                                                                                                         |
| Posts               | `/p/<slug>`                      | `/p/<slug>/`  | same     | 23                                                                                                                                                        |
| Tags                | `/t/<tag>`                       | `/t/<tag>/`   | same     | 17                                                                                                                                                        |
| Tag legacy encoding | `/t/<a~b>`                       | `/t/<a-b>/`   | redirect | one per hyphenated tag (distributed-systems, apache-flink, apache-pulsar, distributed-filesystem, object-storage, serverless-meetup, video-streaming = 7) |
| Archive             | `/archive`                       | `/archive/`   | same     | 1                                                                                                                                                         |
| Authors             | `/authors`                       | `/authors/`   | same     | 1                                                                                                                                                         |
| Author detail       | `/authors/mohinish-s`            | `/authors/`   | redirect | 1                                                                                                                                                         |
| Subscribe           | `/subscribe`                     | `/subscribe/` | same     | 1                                                                                                                                                         |
| Account paths       | `/login`, `/upgrade`, `/account` | `/subscribe/` | redirect | 3                                                                                                                                                         |

Construction: union of the sitemap URLs, every URL found while scraping (internal links in post bodies, archive links), and the static rows above. Duplicates collapse. Any `old` that is also a page the site generates and has `type: redirect` is an error (a stub would overwrite a real page); the builder fails on collisions. Archive page `/archive/2/` is a new page and is not a legacy URL.

Redirect stubs are generated into `dist/` with canonical, `noindex`, meta refresh and JS replace, honoring `BASE_PATH` (ARCHITECTURE section 7). Query-string legacy URLs (`/archive?page=N`) are handled by the inline script on `/archive/`, not the manifest. If Search Console later shows additional 404s, the owner approves new manifest entries (Sprint 8).

Parity checks: `scripts/validate-parity.ts` (against `dist/`, 100% required) and `scripts/validate-parity.ts --live` (fetches every `old` on `https://www.serverless.fyi`, follows redirects, asserts final 200 and, for stubs, that the final page equals `new`).

## 8. Migration report (`migration/report.md`)

Generated on every run and reviewed by the owner in the Sprint 2 PR. Sections:

- Counts: posts exported (expect 23), tags (17), images downloaded, bytes, embeds converted by type, links rewritten, utm params stripped.
- Posts with `aeoPending` (all).
- Descriptions to review, with source step (section 3.1) and character count; duplicate descriptions.
- Cover alt placeholders.
- Images with empty alt.
- Posts with fallback `pubDate`, dropped tags, unknown authors, unresolved tracking links, unrecognized iframes, tables that fell back to HTML, heading level fixes.
- Archive vs sitemap reconciliation result.
- Warnings and errors; any error makes the process exit non-zero.

## 9. Commands

```text
pnpm migrate:scrape      # tsx migration/scrape-beehiiv.ts     (primary; no key needed)
pnpm migrate:fetch       # tsx migration/fetch-beehiiv.ts      (needs BEEHIIV_API_KEY in .env.local)
pnpm migrate:convert     # html-to-md, localize-images, build-manifest
pnpm test:unit           # golden fixtures and image/manifest assertions
pnpm build && pnpm validate
```

Acceptance for the migration (Gate 2): post count equals 23 (the Beehiiv published count), 0 remote Beehiiv images, parity 100%, owner reviewed the report, subscriber CSV exported and stored privately.

## 10. Subscriber export and import (owner-only; never in the repo)

Agents never see subscriber data. These steps are performed by the owner.

### 10.1 Export (Sprint 2)

1. Beehiiv dashboard, Audience, Export (all statuses). Include: email, status, created/signup date, source, tags/custom fields, unsubscribe date if present.
2. Save the CSV to an encrypted private location (encrypted disk image or password manager vault attachment, plus one encrypted offline backup). Name it `beehiiv-subscribers-YYYYMMDD.csv`. Never place it inside the repo directory. `.gitignore` also blocks `subscribers*.csv` and `*.subscribers.csv` and lefthook scans for key patterns, as a safety net only.
3. Record row counts by status (active, unsubscribed, bounced, complained) in a private note. Compare to the Beehiiv dashboard totals.
4. Repeat a final export in Sprint 10 to catch anyone who joined during Phase A (and unsubscribes since).

### 10.2 Import to listmonk (Sprint 9)

1. Preconditions: SES out of sandbox; SPF/DKIM/DMARC passing; listmonk running with the bounce webhook; Postgres backup job working.
2. Prepare the file: keep only `email`, `name` (if any), `attributes` JSON (signup date, source), and only rows with status active. Do not import unsubscribed, bounced or complained addresses; import them into the listmonk blocklist instead so they are never re-added.
3. Keep original signup timestamps as consent evidence: store in `attribs` (for example `{"consent_at":"2024-03-02T10:00:00Z","consent_source":"beehiiv"}`).
4. In listmonk: Subscribers, Import. Mode "Subscribe", list "Newsletter", overwrite off, subscription status **confirmed** (they opted in on Beehiiv). Run a small 20-row test file first and inspect.
5. Verify: imported count equals active count; sample 10 addresses; check the blocklist count equals bounced + complained + unsubscribed.
6. Warm-up: first sends in batches of 25% / 50% / 100% across three issues, watching SES bounce under 2% and complaint under 0.1%; pause on breach.
7. Send a test to personal Gmail, Outlook and Apple Mail; confirm "show original" shows SPF, DKIM, DMARC pass and one-click unsubscribe.
8. After the final import (Sprint 10 delta), securely delete working copies; keep one encrypted archive.

## 11. Rollback plan

Layers, from least to most disruptive:

| Situation                                               | Action                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| ------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Bad deploy (build, content, layout)                     | Revert the PR on `main` (or re-run the deploy workflow on the last good commit). Live again in under 5 minutes.                                                                                                                                                                                                                                                                                                                                    |
| Single bad post or conversion error                     | Fix the MDX in a PR; for a systemic converter bug, add a failing fixture, fix `html-to-md.ts`, re-run `pnpm migrate:convert` on the preserved `migration/raw/` data, review the diff.                                                                                                                                                                                                                                                              |
| Wrong or missing URL after cutover                      | Add a manifest entry (owner approved), redeploy; verify with `validate-parity.ts --live`.                                                                                                                                                                                                                                                                                                                                                          |
| Cutover failure (site down, TLS issue, mass 404s)       | Re-point DNS to the Beehiiv records. The previous records (CNAME/A for Beehiiv web hosting) are saved in `docs/RUNBOOK.md` **before** DNS step 8 of the cutover. TTL was lowered to 300 s 24 h earlier, so rollback completes in minutes. Re-attach the custom domain on Beehiiv if it was disconnected (Beehiiv publication must still exist: do not delete it until the 30-60 day window after Sprint 10). Pause the GitHub Pages custom domain. |
| Newsletter Phase B problem (deliverability, complaints) | Set `PUBLIC_NEWSLETTER_PROVIDER=beehiiv`, redeploy; keep sending from Beehiiv, which stays paused-but-intact until Sprint 10's rollback window ends. Stop sending from listmonk.                                                                                                                                                                                                                                                                   |
| After Beehiiv deletion                                  | No rollback; mitigated by the final exports (subscribers, stats, raw post JSON) archived privately. Old emails will show broken images; the web archive is unaffected.                                                                                                                                                                                                                                                                             |

Retention: keep `migration/raw/` locally (or in private storage) until Gate 8 so conversions can be redone. The migration scripts are idempotent, so a rerun reproduces the committed output byte for byte (modulo any owner edits made in git afterwards, which review diffs reveal).

Safety rules: do not delete the Beehiiv publication, change DNS, or email subscribers as an agent. These are owner actions listed in the cutover plan.
