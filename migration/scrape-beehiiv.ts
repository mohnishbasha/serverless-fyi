/**
 * Sitemap-based exporter (used because no BEEHIIV_API_KEY is available; ADR-013).
 * Usage: pnpm migrate:scrape [--refresh]   (--refresh re-downloads cached pages)
 * Output: migration/raw/posts/<slug>.json, raw/publication-tags.json, raw/sitemap-paths.json
 */
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { SITE_ORIGIN, parseRemixPage, parseSitemap, type PublicationTag } from './lib/beehiiv';
import { RAW, politeFetch, writeJson } from './lib/io';

const refresh = process.argv.includes('--refresh');

async function cached(url: string, file: string): Promise<string> {
  if (!refresh && existsSync(file)) return readFile(file, 'utf8');
  const res = await politeFetch(url);
  if (!res.ok) throw new Error(`GET ${url} → ${res.status}`);
  const text = await res.text();
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, text);
  return text;
}

async function main() {
  const sitemap = await cached(`${SITE_ORIGIN}/sitemap.xml`, path.join(RAW, 'sitemap.xml'));
  const paths = parseSitemap(sitemap);
  // Archive pages can list posts the sitemap misses; union both.
  for (const page of [1, 2, 3, 4, 5]) {
    const html = await cached(`${SITE_ORIGIN}/archive?page=${page}`, path.join(RAW, `archive-${page}.html`));
    const found = [...html.matchAll(/href="(?:https:\/\/www\.serverless\.fyi)?\/p\/([a-z0-9-]+)"/g)].map(
      (m) => `/p/${m[1]}`,
    );
    if (found.length === 0) break;
    for (const p of found) if (!paths.includes(p)) paths.push(p);
  }
  await writeJson(path.join(RAW, 'sitemap-paths.json'), [...new Set(paths)].sort());

  const tags = new Map<string, PublicationTag>();
  const slugs = paths.filter((p) => p.startsWith('/p/')).map((p) => p.slice(3));
  for (const slug of slugs) {
    const page = await cached(`${SITE_ORIGIN}/p/${slug}`, path.join(RAW, 'pages', `p__${slug}.html`));
    const { post, publicationTags } = parseRemixPage(page);
    for (const t of publicationTags) tags.set(t.slug, t);
    await writeJson(path.join(RAW, 'posts', `${post.slug}.json`), post);
    console.log(`ok  ${post.slug}`);
  }
  await writeJson(
    path.join(RAW, 'publication-tags.json'),
    [...tags.values()].sort((a, b) => a.slug.localeCompare(b.slug)),
  );
  console.log(`\n${slugs.length} posts, ${tags.size} publication tags → ${path.relative(process.cwd(), RAW)}`);
}

main().catch((e: unknown) => {
  console.error(e);
  process.exit(1);
});
