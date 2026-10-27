---
name: new-post
description: Scaffold and draft a new 2 Minute Serverless issue. Use when asked to create a post, in any harness.
---

1. `pnpm new-post "Title"` scaffolds `src/content/posts/<slug>/index.mdx`.
2. Draft per SOUL.md, ~400–600 words, answer-first. Fill description (70–160), tldr, keyTakeaways, faq (real questions only), tags (existing first).
3. Mark owner-fact gaps with TODO(owner); never invent quotes, numbers or events. Keep such posts as drafts.
4. Internal links are root-relative (`/p/x/`).
5. `pnpm check`; open a draft PR `content(post): <title>`.

Success = `pnpm check` exits 0 and no TODO(owner) in non-draft posts.
