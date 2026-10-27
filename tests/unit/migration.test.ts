import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { normalizeApiPost, parseRemixPage, parseSitemap } from '../../migration/lib/beehiiv';
import { buildDescription, buildFrontmatter, renderMdx } from '../../migration/lib/frontmatter';
import { buildManifest } from '../../migration/lib/manifest';

const FIX = path.resolve(__dirname, '../../migration/fixtures');

describe('parseRemixPage', () => {
  const page = readFileSync(path.join(FIX, 'page-understanding-the-dns-header.remix.html'), 'utf8');
  const { post, publicationTags } = parseRemixPage(page);

  it('extracts the normalised post', () => {
    expect(post.slug).toBe('understanding-the-dns-header');
    expect(post.title).toBe('Understanding the DNS Header');
    expect(post.subtitle).toBe('The Tiny Packet That Runs the Internet');
    expect(post.publishDate).toBe('2025-10-29T21:57:35.155Z');
    expect(post.tags).toEqual(['dns']);
    expect(post.coverUrl).toMatch(/^https:\/\/images\.unsplash\.com\//);
    expect(post.webUrl).toBe('https://www.serverless.fyi/p/understanding-the-dns-header');
    expect(post.html).toContain('content-blocks');
    expect(post.id).toBe('a131d454-1929-4b96-b631-6728b1a483a3');
  });

  it('extracts publication tags with descriptions', () => {
    expect(publicationTags).toContainEqual({ slug: 'dns', description: 'Domain Name System' });
  });

  it('throws on a page without remix context', () => {
    expect(() => parseRemixPage('<html></html>')).toThrow(/remixContext/);
  });
});

describe('normalizeApiPost', () => {
  it('maps API v2 fields', () => {
    const p = normalizeApiPost({
      id: 'post_1',
      title: 'T',
      subtitle: 'S',
      slug: 'abc',
      web_url: 'https://www.serverless.fyi/p/abc',
      publish_date: 1730000000,
      content_tags: ['Distributed Systems'],
      thumbnail_url: 'https://x/y.png',
      meta_default_description: 'D',
      content: { free: { web: '<p>x</p>' } },
    });
    expect(p).toMatchObject({
      id: 'post_1',
      slug: 'abc',
      title: 'T',
      tags: ['distributed-systems'],
      publishDate: new Date(1730000000 * 1000).toISOString(),
      html: '<p>x</p>',
    });
  });
});

describe('parseSitemap', () => {
  it('returns paths', () => {
    const xml = `<urlset><url><loc>https://www.serverless.fyi/</loc></url><url><loc>https://www.serverless.fyi/p/a</loc></url></urlset>`;
    expect(parseSitemap(xml)).toEqual(['/', '/p/a']);
  });
});

describe('buildDescription', () => {
  it('uses the Beehiiv meta description when it is 70+ chars', () => {
    const d = 'x'.repeat(30) + ' ' + 'y'.repeat(50);
    expect(buildDescription({ meta: d, subtitle: 's', body: 'b' })).toEqual({ text: d, flagged: false });
  });

  it('composes subtitle + verbatim leading body words when too short, and flags it', () => {
    const r = buildDescription({
      meta: 'Short sub',
      subtitle: 'Short sub',
      body: 'The **DNS header** is a compact 12-byte structure that drives every query and response on the internet today. More text here that will be cut.',
    });
    expect(r.flagged).toBe(true);
    expect(r.text.startsWith('Short sub. The DNS header is a compact 12-byte structure')).toBe(true);
    expect(r.text.length).toBeGreaterThanOrEqual(70);
    expect(r.text.length).toBeLessThanOrEqual(160);
  });

  it('trims a long meta description at a word boundary', () => {
    const r = buildDescription({ meta: 'word '.repeat(50), subtitle: '', body: '' });
    expect(r.text.length).toBeLessThanOrEqual(160);
    expect(r.flagged).toBe(true);
  });
});

describe('buildFrontmatter / renderMdx', () => {
  const fm = buildFrontmatter({
    post: {
      id: 'a1',
      slug: 'understanding-the-dns-header',
      title: 'Understanding the DNS Header',
      subtitle: 'The Tiny Packet That Runs the Internet',
      description: '',
      publishDate: '2025-10-29T21:57:35.155Z',
      updatedAt: '2025-10-29T21:57:35Z',
      tags: ['dns'],
      coverUrl: 'https://images.unsplash.com/photo',
      webUrl: 'https://www.serverless.fyi/p/understanding-the-dns-header',
      html: '',
    },
    description: 'A description that is long enough to pass the seventy character minimum bound.',
    tags: ['dns'],
    cover: './cover.jpg',
  });

  it('marks migrated posts aeoPending and keeps provenance', () => {
    expect(fm.aeoPending).toBe(true);
    expect(fm.beehiivId).toBe('a1');
    expect(fm.beehiivUrl).toBe('https://www.serverless.fyi/p/understanding-the-dns-header');
    expect(fm.pubDate).toBe('2025-10-29T21:57:35.155Z');
    expect(fm.updatedDate).toBeUndefined();
    expect(fm.coverAlt).toBe('Cover image for “Understanding the DNS Header”');
    expect(fm.tldr).toBeUndefined();
  });

  it('renders YAML frontmatter followed by the body', () => {
    const mdx = renderMdx(fm, 'Body text.\n');
    expect(mdx.startsWith('---\ntitle: "Understanding the DNS Header"\n')).toBe(true);
    expect(mdx).toContain('\ntags:\n  - dns\n');
    expect(mdx).toContain('\naeoPending: true\n');
    expect(mdx.endsWith('---\n\nBody text.\n')).toBe(true);
  });

  it('quotes numeric-looking tags so YAML keeps them as strings', () => {
    const mdx = renderMdx({ ...fm, tags: ['2024', 'dns'] }, '');
    expect(mdx).toContain('\ntags:\n  - "2024"\n  - dns\n');
  });

  it('escapes quotes in YAML strings', () => {
    const mdx = renderMdx({ ...fm, title: 'He said "hi"' }, '');
    expect(mdx).toContain('title: "He said \\"hi\\""');
  });
});

describe('buildManifest', () => {
  const m = buildManifest({
    sitemapPaths: ['/', '/p/a', '/t/distributed-systems', '/authors', '/authors/mohinish-s', '/subscribe'],
    postSlugs: ['a', 'b'],
    tags: ['distributed-systems', 'dns'],
  });
  const find = (old: string) => m.find((e) => e.old === old);

  it('maps posts, tags and static pages as same', () => {
    expect(find('/p/a')).toEqual({ old: '/p/a', new: '/p/a/', type: 'same' });
    expect(find('/p/b')).toEqual({ old: '/p/b', new: '/p/b/', type: 'same' });
    expect(find('/t/dns')).toEqual({ old: '/t/dns', new: '/t/dns/', type: 'same' });
    expect(find('/archive')?.type).toBe('same');
  });

  it('adds ~ tag stubs and account redirects', () => {
    expect(find('/t/distributed~systems')).toEqual({
      old: '/t/distributed~systems',
      new: '/t/distributed-systems/',
      type: 'redirect',
    });
    expect(find('/login')).toEqual({ old: '/login', new: '/subscribe/', type: 'redirect' });
    expect(find('/authors/mohinish-s')).toEqual({ old: '/authors/mohinish-s', new: '/authors/', type: 'redirect' });
  });

  it('includes home and is sorted and unique', () => {
    expect(find('/')).toEqual({ old: '/', new: '/', type: 'same' });
    const olds = m.map((e) => e.old);
    expect(new Set(olds).size).toBe(olds.length);
    expect([...olds].sort()).toEqual(olds);
  });

  it('preserves entries from a previous manifest (append-only)', () => {
    const next = buildManifest({ sitemapPaths: [], postSlugs: [], tags: [], previous: m });
    for (const e of m) expect(next).toContainEqual(e);
  });
});
