/** Content collection helpers used by pages and endpoints. */
import type { ImageMetadata } from 'astro';
import { type CollectionEntry, getCollection, getEntry } from 'astro:content';
import { ctx } from './env';
import { mdxToMarkdown } from './markdown';
import { wordCount } from './reading-time';

export type Post = CollectionEntry<'posts'>;
export type Author = CollectionEntry<'authors'>['data'];

const byDateDesc = (a: Post, b: Post) => b.data.pubDate.getTime() - a.data.pubDate.getTime();

/** Published posts, newest first. Drafts are visible in `astro dev` only. */
export async function getPosts(): Promise<Post[]> {
  const all = await getCollection('posts', (p) => import.meta.env.DEV || !p.data.draft);
  return all.sort(byDateDesc);
}

export async function getAuthor(post?: Post): Promise<Author> {
  const id = post?.data.author.id ?? 'mohinish';
  const a = await getEntry('authors', id);
  if (!a) throw new Error(`Unknown author ${id}`);
  return a.data;
}

export const postPath = (p: Post) => `/p/${p.data.slug}/`;
export const postMdPath = (p: Post) => `/p/${p.data.slug}.md`;
export const ogPath = (slug: string) => `/og/${slug}.png`;
export const postWords = (p: Post) => wordCount(p.body ?? '');
export const summaryOf = (p: Post) => (!p.data.aeoPending && p.data.tldr ? p.data.tldr : p.data.description);

export function tagCounts(posts: Post[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const p of posts) for (const t of p.data.tags) m.set(t, (m.get(t) ?? 0) + 1);
  return new Map([...m.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])));
}

export function relatedPosts(post: Post, all: Post[], n = 3): Post[] {
  return all
    .filter((p) => p.id !== post.id)
    .map((p) => ({ p, score: p.data.tags.filter((t) => post.data.tags.includes(t)).length }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || byDateDesc(a.p, b.p))
    .slice(0, n)
    .map((x) => x.p);
}

export function prevNext(post: Post, all: Post[]): { prev?: Post; next?: Post } {
  const i = all.findIndex((p) => p.id === post.id);
  // `all` is newest-first: "previous" is the older post, "next" the newer one.
  const prev = all[i + 1];
  const next = i > 0 ? all[i - 1] : undefined;
  return { ...(prev ? { prev } : {}), ...(next ? { next } : {}) };
}

const postImages = import.meta.glob<ImageMetadata>('/src/content/posts/**/*.{jpg,jpeg,png,gif,webp,avif,svg}', {
  eager: true,
  import: 'default',
});

/** Map of `./file.ext` → built asset path (base stripped) for one post. */
export function imageMapFor(p: Post): Map<string, string> {
  const dir = `/src/content/posts/${p.id}/`;
  const dirBySlug = `/src/content/posts/${p.data.slug}/`;
  const m = new Map<string, string>();
  const base = `/${ctx.base}/`.replace(/\/{2,}/g, '/');
  for (const [file, meta] of Object.entries(postImages)) {
    const prefix = file.startsWith(dir) ? dir : file.startsWith(dirBySlug) ? dirBySlug : null;
    if (!prefix) continue;
    const src = base !== '/' && meta.src.startsWith(base) ? `/${meta.src.slice(base.length)}` : meta.src;
    m.set(`./${file.slice(prefix.length)}`, src);
  }
  return m;
}

/** Plain Markdown body with absolute URLs (for .md twins, llms-full.txt and feeds). */
export function postMarkdown(p: Post): string {
  return mdxToMarkdown(p.body ?? '', imageMapFor(p), ctx);
}
