/** /llms.txt and /llms-full.txt builders (llmstxt.org convention). See docs/SEO_AEO.md. */
import { SITE } from './site';
import { tagLabel } from './tags';
import { absoluteUrl } from './urls';

export interface LlmsPost {
  slug: string;
  title: string;
  description: string;
  /** tldr when written, otherwise the description. */
  summary: string;
  tags: string[];
  pubDate: Date;
  markdown: string;
}

interface Ctx {
  site: string;
  base: string;
  startHere: readonly string[];
}

const fileUrl = (p: string, c: Ctx) => c.site.replace(/\/+$/, '') + `/${c.base}/${p}`.replace(/\/{2,}/g, '/');
const mdLink = (p: LlmsPost, c: Ctx) =>
  `- [${p.title}](${fileUrl(`p/${p.slug}.md`, c)}): ${p.summary.replace(/\s+/g, ' ')}`;
const newestFirst = (a: LlmsPost, b: LlmsPost) => b.pubDate.getTime() - a.pubDate.getTime();

export function llmsTxt(posts: LlmsPost[], c: Ctx): string {
  const sorted = [...posts].sort(newestFirst);
  const start = c.startHere.map((s) => sorted.find((p) => p.slug === s)).filter((p): p is LlmsPost => !!p);

  const byTopic = new Map<string, LlmsPost[]>();
  for (const p of sorted) {
    const t = p.tags[0] ?? 'general';
    byTopic.set(t, [...(byTopic.get(t) ?? []), p]);
  }

  const out = [
    `# ${SITE.name}`,
    '',
    `> ${SITE.tagline}. Short, answer-first explainers on data, AI, distributed systems and startups by Mohinish Shaikh (Serverless Ventures LLC). Every post is available as Markdown at /p/<slug>.md.`,
    '',
    '## Start here',
    '',
    ...(start.length ? start : sorted.slice(0, 3)).map((p) => mdLink(p, c)),
    '',
    '## Posts by topic',
    '',
  ];
  for (const [tag, list] of [...byTopic.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    out.push(`### ${tagLabel(tag)}`, '', ...list.map((p) => mdLink(p, c)), '');
  }
  out.push(
    '## About',
    '',
    `- [About ${SITE.name}](${absoluteUrl('/about/', c.site, c.base)}): what the newsletter covers and who writes it`,
    `- [Author: Mohinish Shaikh](${absoluteUrl('/authors/', c.site, c.base)}): bio and profiles`,
    `- [Subscribe](${absoluteUrl('/subscribe/', c.site, c.base)}): get new issues by email`,
    '',
    '## Optional',
    '',
    `- [All posts as one Markdown file](${fileUrl('llms-full.txt', c)}): full text of every post`,
    `- [Machine index (JSON)](${fileUrl('api/posts.json', c)}): slug, title, summary, tags and dates for every post`,
    `- [JSON Feed](${fileUrl('feed.json', c)}): latest posts with full content`,
    `- [RSS](${fileUrl('rss.xml', c)}): latest posts with full content`,
    '',
  );
  return out.join('\n');
}

export function llmsFullTxt(posts: LlmsPost[], c: Ctx): string {
  const parts = [`# ${SITE.name}`, '', `> ${SITE.tagline}. Full text of every published post.`, ''];
  for (const p of [...posts].sort(newestFirst)) {
    parts.push(
      '---',
      '',
      `# ${p.title}`,
      '',
      `URL: ${absoluteUrl(`/p/${p.slug}/`, c.site, c.base)}`,
      `Published: ${p.pubDate.toISOString().slice(0, 10)}`,
      `Tags: ${p.tags.join(', ')}`,
      '',
      p.markdown.trim(),
      '',
    );
  }
  return parts.join('\n');
}
