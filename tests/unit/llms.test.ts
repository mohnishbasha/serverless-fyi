import { describe, expect, it } from 'vitest';
import { llmsFullTxt, llmsTxt, type LlmsPost } from '../../src/lib/llms';

const posts: LlmsPost[] = [
  {
    slug: 'vector-clocks-in-distributed-systems',
    title: 'Vector Clocks in Distributed Systems',
    description: 'How vector clocks track causality across processes without a global clock in distributed systems.',
    summary: 'Vector clocks track causality.',
    tags: ['distributed-systems'],
    pubDate: new Date('2024-12-15T00:00:00Z'),
    markdown: '## What is a vector clock?\n\nA list of counters.\n',
  },
  {
    slug: 'understanding-the-dns-header',
    title: 'Understanding the DNS Header',
    description: 'A walkthrough of the 12-byte DNS header and what each field does for resolvers and servers alike.',
    summary: 'The DNS header is 12 bytes.',
    tags: ['dns'],
    pubDate: new Date('2025-10-29T00:00:00Z'),
    markdown: 'Body.\n',
  },
];

const ctx = { site: 'https://www.serverless.fyi', base: '/', startHere: ['understanding-the-dns-header'] };

describe('llmsTxt', () => {
  const txt = llmsTxt(posts, ctx);

  it('starts with an H1 and a blockquote summary', () => {
    const lines = txt.split('\n');
    expect(lines[0]).toBe('# 2 Minute Serverless');
    expect(lines[2]?.startsWith('> ')).toBe(true);
  });

  it('has the required sections in order', () => {
    const order = ['## Start here', '## Posts by topic', '## About', '## Optional'].map((h) => txt.indexOf(h));
    expect(order.every((i) => i > 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
  });

  it('lists every published post as a .md link with a one-line summary', () => {
    for (const p of posts) {
      expect(txt).toContain(`- [${p.title}](https://www.serverless.fyi/p/${p.slug}.md): ${p.summary}`);
    }
  });

  it('groups posts under topic headings', () => {
    expect(txt).toContain('### Distributed Systems');
    expect(txt).toContain('### DNS');
  });
});

describe('llmsFullTxt', () => {
  it('concatenates every post with title, URL, date and tags headers', () => {
    const full = llmsFullTxt(posts, ctx);
    expect(full.startsWith('# 2 Minute Serverless')).toBe(true);
    expect(full).toContain(
      '# Understanding the DNS Header\n\nURL: https://www.serverless.fyi/p/understanding-the-dns-header/\nPublished: 2025-10-29\nTags: dns\n',
    );
    expect(full).toContain('## What is a vector clock?');
    expect(full.indexOf('Understanding the DNS Header')).toBeLessThan(full.indexOf('# Vector Clocks'));
  });
});
