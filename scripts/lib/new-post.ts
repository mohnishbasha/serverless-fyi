/** Scaffold for a new post (pnpm new-post "Title"). Owner-only facts are marked TODO(owner). */
export function slugify(title: string): string {
  return title
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function scaffoldPost(title: string, now = new Date()): string {
  const slug = slugify(title);
  return `---
title: ${JSON.stringify(title)}
subtitle: "TODO(owner): one-line hook"
description: "TODO(owner): 70–160 characters that answer the title's question for search results and link previews."
slug: ${slug}
pubDate: ${now.toISOString().slice(0, 10)}
tags:
  - todo-owner
tldr: "TODO(owner): 1–3 sentences that directly answer the title. This is what answer engines quote."
keyTakeaways:
  - "TODO(owner): concrete takeaway with a number, version or trade-off."
  - "TODO(owner): second takeaway."
faq: []
draft: true
---

TODO(owner): first paragraph answers the title's implicit question directly (answer-first).

## What is it?

## How does it work?

## When should you use it?
`;
}
