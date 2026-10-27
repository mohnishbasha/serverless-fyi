// Lightweight frontmatter scan used at config time (sitemap lastmod, empty-tag filtering).
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

const field = (fm, k) => new RegExp(`^${k}:\\s*(.+)$`, 'm').exec(fm)?.[1]?.trim().replace(/^"|"$/g, '');

/** @returns {{ slug: string, pubDate: Date, updatedDate?: Date, tags: string[], draft: boolean, noindex: boolean }[]} */
export function scanPosts(root = process.cwd()) {
  const dir = path.join(root, 'src/content/posts');
  if (!existsSync(dir)) return [];
  const out = [];
  for (const slug of readdirSync(dir)) {
    const f = ['index.mdx', 'index.md'].map((n) => path.join(dir, slug, n)).find(existsSync);
    if (!f) continue;
    const src = readFileSync(f, 'utf8');
    const fm = /^---\n([\s\S]*?)\n---/.exec(src)?.[1] ?? '';
    const tagBlock = /^tags:\s*\n((?:\s+- .+\n?)+)/m.exec(fm)?.[1];
    const inline = /^tags:\s*\[(.*)\]/m.exec(fm)?.[1];
    const tags = tagBlock
      ? [...tagBlock.matchAll(/- "?([a-z0-9-]+)"?/g)].map((m) => m[1])
      : (inline ?? '')
          .split(',')
          .map((t) => t.trim().replace(/^"|"$/g, ''))
          .filter(Boolean);
    const upd = field(fm, 'updatedDate');
    out.push({
      slug: field(fm, 'slug') ?? slug,
      pubDate: new Date(field(fm, 'pubDate') ?? 0),
      ...(upd ? { updatedDate: new Date(upd) } : {}),
      tags,
      draft: field(fm, 'draft') === 'true',
      noindex: field(fm, 'noindex') === 'true',
    });
  }
  return out;
}

export function scanTags(root = process.cwd()) {
  const dir = path.join(root, 'src/content/tags');
  return existsSync(dir)
    ? readdirSync(dir)
        .filter((f) => f.endsWith('.md'))
        .map((f) => f.slice(0, -3))
    : [];
}
