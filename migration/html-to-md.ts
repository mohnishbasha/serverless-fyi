/**
 * raw/posts/<slug>.json → src/content/posts/<slug>/index.mdx (remote images still remote; see localize-images.ts).
 * Usage: tsx migration/html-to-md.ts [--force]   Existing posts are skipped unless --force (protects owner edits).
 */
import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { SourcePost } from './lib/beehiiv';
import { convertHtml, type ConvertStats } from './lib/convert';
import { buildDescription, buildFrontmatter, renderMdx } from './lib/frontmatter';
import { POSTS_DIR, RAW, ROOT, listJson, readJson, writeJson } from './lib/io';

const force = process.argv.includes('--force');

export interface PostReport {
  slug: string;
  title: string;
  descriptionFlagged: boolean;
  tagsOverridden: boolean;
  tags: string[];
  stats: Omit<ConvertStats, 'warnings'>;
  warnings: string[];
  remoteCover?: string;
  emptyAltImages: number;
}

async function main() {
  const overrides = await readJson<Record<string, string[]>>(path.join(ROOT, 'migration/tag-overrides.json'));
  const reports: PostReport[] = [];
  for (const file of await listJson(path.join(RAW, 'posts'))) {
    const post = await readJson<SourcePost>(file);
    const out = path.join(POSTS_DIR, post.slug, 'index.mdx');
    const { markdown, stats } = await convertHtml(post.html);
    const desc = buildDescription({ meta: post.description, subtitle: post.subtitle, body: markdown });
    const tagsOverridden = post.tags.length === 0 && Array.isArray(overrides[post.slug]);
    const tags = tagsOverridden ? (overrides[post.slug] ?? []) : post.tags;
    if (tags.length === 0) throw new Error(`${post.slug}: no tags and no entry in migration/tag-overrides.json`);

    const fm = buildFrontmatter({
      post,
      description: desc.text,
      tags,
      ...(post.coverUrl ? { cover: post.coverUrl } : {}),
    });
    const { warnings, ...rest } = stats;
    reports.push({
      slug: post.slug,
      title: post.title,
      descriptionFlagged: desc.flagged,
      tagsOverridden,
      tags,
      stats: rest,
      warnings,
      ...(post.coverUrl ? { remoteCover: post.coverUrl } : {}),
      emptyAltImages: [...markdown.matchAll(/!\[]\(/g)].length,
    });
    if (existsSync(out) && !force) {
      console.log(`skip ${post.slug} (exists; --force to overwrite)`);
      continue;
    }
    await mkdir(path.dirname(out), { recursive: true });
    await writeFile(out, renderMdx(fm, markdown));
    console.log(`wrote ${path.relative(ROOT, out)}`);
  }
  await writeJson(path.join(RAW, 'convert-report.json'), reports);
}

main().catch((e: unknown) => {
  console.error(e);
  process.exit(1);
});
