import { describe, expect, it } from 'vitest';
import { markdownToHtml, mdxToMarkdown, twinDocument } from '../../src/lib/markdown';

const images = new Map([['./img-abc.jpg', '/_astro/img-abc.123.jpg']]);
const ctx = { site: 'https://www.serverless.fyi', base: '/' };

describe('mdxToMarkdown', () => {
  it('rewrites relative images to absolute URLs', () => {
    const md = mdxToMarkdown('![Panel](./img-abc.jpg)\n', images, ctx);
    expect(md).toBe('![Panel](https://www.serverless.fyi/_astro/img-abc.123.jpg)\n');
  });

  it('turns embed components into plain links', () => {
    expect(mdxToMarkdown('<YouTube id="Sn6fVsOzrSU" />\n', images, ctx)).toBe(
      '[Watch on YouTube](https://www.youtube.com/watch?v=Sn6fVsOzrSU)\n',
    );
    expect(mdxToMarkdown('<Tweet id="123" />\n', images, ctx)).toBe('[View post on X](https://x.com/i/status/123)\n');
  });

  it('makes root-relative links absolute', () => {
    expect(mdxToMarkdown('[a](/p/x/) and [b](https://e.com)\n', images, ctx)).toBe(
      '[a](https://www.serverless.fyi/p/x/) and [b](https://e.com)\n',
    );
  });

  it('unescapes MDX-only escapes', () => {
    expect(mdxToMarkdown('a \\{b} \\< c\n', images, ctx)).toBe('a {b} < c\n');
  });
});

describe('markdownToHtml', () => {
  it('renders GFM with absolute URLs only', async () => {
    const html = await markdownToHtml('## Hi\n\n| a | b |\n| - | - |\n| 1 | 2 |\n\n![x](https://e.com/i.png)\n');
    expect(html).toContain('<h2>Hi</h2>');
    expect(html).toContain('<table>');
    expect(html).toContain('src="https://e.com/i.png"');
  });
});

describe('twinDocument', () => {
  it('prefixes a frontmatter-lite header and H1', () => {
    const doc = twinDocument(
      {
        title: 'Understanding the DNS Header',
        url: 'https://www.serverless.fyi/p/understanding-the-dns-header/',
        description: 'D',
        pubDate: new Date('2025-10-29T21:57:35Z'),
        tags: ['dns'],
        author: 'Mohinish Shaikh',
      },
      'Body.\n',
    );
    expect(doc).toBe(
      [
        '---',
        'title: "Understanding the DNS Header"',
        'url: https://www.serverless.fyi/p/understanding-the-dns-header/',
        'author: Mohinish Shaikh',
        'published: 2025-10-29',
        'tags: [dns]',
        'description: "D"',
        '---',
        '',
        '# Understanding the DNS Header',
        '',
        'Body.',
        '',
      ].join('\n'),
    );
  });
});
