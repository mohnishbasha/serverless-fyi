---
name: write-post
description: Draft a new 2 Minute Serverless issue in the house voice. Use when asked to write, scaffold or draft a post.
---

1. Scaffold: `pnpm new-post "Title"` creates `src/content/posts/<slug>/index.mdx`.
2. Draft in the SOUL.md voice: answer-first, ~400–600 words, concrete numbers and trade-offs, no hype words.
3. Fill frontmatter: description (70–160 chars, unique), tldr (at most 3 sentences), keyTakeaways, faq (real questions only), tags (reuse existing first).
4. Use root-relative links (`/p/x/`) for internal links; link to 2+ related posts.
5. Mark anything needing owner facts with TODO(owner). Never invent quotes, numbers or events. Posts with TODO(owner) must stay `draft`.
6. Run `pnpm check`, then the seo-aeo-reviewer subagent.

Success = `pnpm check` exits 0 and the reviewer reports no FAIL.
