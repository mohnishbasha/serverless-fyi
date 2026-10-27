/** Frontmatter for migrated posts. Never invents content (ADR-018). */
import type { SourcePost } from './beehiiv';

const MIN = 70;
const MAX = 160;

const plain = (md: string) =>
  md
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/^#{1,6}\s+.*$/gm, ' ')
    .replace(/^\s*([-*+]|\d+\.)\s+/gm, ' ')
    .replace(/[*_`>|]/g, '')
    .replace(/\\([\\{}<[\]|])/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();

function cutAtWord(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  return `${cut.slice(0, cut.lastIndexOf(' ')).replace(/[\s,;:.–—-]+$/, '')}…`;
}

/**
 * Beehiiv meta description if it fits 70–160; otherwise subtitle + the author's own leading
 * body text (verbatim), cut at a word boundary. Anything not taken verbatim is flagged.
 */
export function buildDescription(src: { meta: string; subtitle: string; body: string }): {
  text: string;
  flagged: boolean;
} {
  const meta = src.meta.replace(/\s+/g, ' ').trim();
  if (meta.length >= MIN && meta.length <= MAX) return { text: meta, flagged: false };
  if (meta.length > MAX) return { text: cutAtWord(meta, MAX), flagged: true };

  const lead = (meta || src.subtitle)
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[.!?:]?$/, (m) => m || '.');
  const body = plain(src.body);
  const combined = lead ? `${lead} ${body}` : body;
  return { text: cutAtWord(combined, MAX), flagged: true };
}

export interface Frontmatter {
  title: string;
  subtitle?: string;
  description: string;
  slug: string;
  pubDate: string;
  updatedDate?: string;
  tags: string[];
  cover?: string;
  coverAlt?: string;
  tldr?: string;
  keyTakeaways?: string[];
  aeoPending: boolean;
  beehiivId?: string;
  beehiivUrl?: string;
}

const DAY = 86_400_000;

export function buildFrontmatter(o: {
  post: SourcePost;
  description: string;
  tags: string[];
  cover?: string;
}): Frontmatter {
  const { post } = o;
  const pub = new Date(post.publishDate);
  const upd = post.updatedAt ? new Date(post.updatedAt) : undefined;
  return {
    title: post.title.trim(),
    ...(post.subtitle.trim() ? { subtitle: post.subtitle.trim() } : {}),
    description: o.description,
    slug: post.slug,
    pubDate: pub.toISOString(),
    ...(upd && upd.getTime() - pub.getTime() > DAY ? { updatedDate: upd.toISOString() } : {}),
    tags: o.tags,
    ...(o.cover ? { cover: o.cover, coverAlt: `Cover image for “${post.title.trim()}”` } : {}),
    aeoPending: true,
    beehiivId: post.id,
    beehiivUrl: post.webUrl,
  };
}

const q = (s: string) => JSON.stringify(s);
/** Bare YAML only for kebab-case words containing a letter (so "2024" stays a string). */
const scalar = (s: string) => (/^[a-z0-9-]*[a-z][a-z0-9-]*$/.test(s) ? s : q(s));
const BARE = new Set(['pubDate', 'updatedDate', 'cover', 'slug']);

export function renderMdx(fm: Frontmatter, body: string): string {
  const lines: string[] = ['---'];
  for (const [k, v] of Object.entries(fm)) {
    if (v === undefined) continue;
    if (Array.isArray(v)) lines.push(`${k}:`, ...v.map((item) => `  - ${scalar(String(item))}`));
    else if (typeof v === 'boolean' || BARE.has(k)) lines.push(`${k}: ${String(v)}`);
    else lines.push(`${k}: ${q(String(v))}`);
  }
  lines.push('---', '');
  const text = body.trimEnd();
  return `${lines.join('\n')}${text ? `\n${text}\n` : ''}`;
}
