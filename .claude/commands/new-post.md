---
description: Scaffold and draft a new 2 Minute Serverless issue
argument-hint: '<title or topic>'
---

Create a new post for: $ARGUMENTS

1. Run `pnpm new-post "$ARGUMENTS"` to scaffold `src/content/posts/<slug>/index.mdx`.
2. Draft in the SOUL.md voice, ~400–600 words, answer-first. Fill description (70–160), tldr, keyTakeaways, faq (only real questions), tags (existing tags first).
3. Mark sentences that need the owner's facts with TODO(owner). Do not invent quotes, numbers, or events.
4. Run `pnpm check`. Invoke the seo-aeo-reviewer subagent. Open a draft PR `content(post): <title>`.
