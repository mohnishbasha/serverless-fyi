import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { cleanUrl, convertHtml, detectLanguage } from '../../migration/lib/convert';

const FIXTURES = path.resolve(__dirname, '../../migration/fixtures');

describe('html-to-md golden fixtures', () => {
  const htmls = readdirSync(FIXTURES).filter((f) => /^\d{2}-.*\.html$/.test(f));
  it('has fixtures', () => expect(htmls.length).toBeGreaterThanOrEqual(5));

  for (const file of htmls) {
    it(`converts ${file}`, async () => {
      const html = readFileSync(path.join(FIXTURES, file), 'utf8');
      const expected = readFileSync(path.join(FIXTURES, file.replace(/\.html$/, '.expected.md')), 'utf8');
      const { markdown } = await convertHtml(html);
      expect(markdown).toBe(expected);
    });
  }
});

describe('conversion stats', () => {
  it('counts embeds, rewritten links and images', async () => {
    const html = readFileSync(path.join(FIXTURES, '04-images-embeds-chrome.html'), 'utf8');
    const { stats } = await convertHtml(html);
    expect(stats.embeds).toBe(2);
    expect(stats.images).toBe(2);
    expect(stats.chromeRemoved).toBeGreaterThanOrEqual(3);
  });

  it('counts internal links rewritten', async () => {
    const html = readFileSync(path.join(FIXTURES, '01-chrome-and-prose.html'), 'utf8');
    const { stats } = await convertHtml(html);
    expect(stats.internalLinks).toBe(1);
    expect(stats.utmStripped).toBe(3);
  });
});

describe('cleanUrl', () => {
  it('strips utm params and keeps others', () => {
    expect(cleanUrl('https://a.b/c?x=1&utm_source=s&utm_medium=m')).toEqual({
      url: 'https://a.b/c?x=1',
      utm: true,
      internal: false,
    });
  });
  it('rewrites internal post links to root-relative with trailing slash', () => {
    expect(cleanUrl('https://www.serverless.fyi/p/abc?utm_source=x').url).toBe('/p/abc/');
    expect(cleanUrl('https://serverless.fyi/t/distributed~systems').url).toBe('/t/distributed-systems/');
    expect(cleanUrl('https://www.serverless.fyi/p/abc#faq').url).toBe('/p/abc/#faq');
  });
  it('leaves the bare domain as an external-style link', () => {
    expect(cleanUrl('https://serverless.fyi?utm_source=x').url).toBe('https://serverless.fyi');
  });
  it('strips Beehiiv image transform prefixes and cache busters', () => {
    expect(
      cleanUrl('https://media.beehiiv.com/cdn-cgi/image/fit=scale-down,format=auto/uploads/asset/file/x/a.JPG?t=17')
        .url,
    ).toBe('https://media.beehiiv.com/uploads/asset/file/x/a.JPG');
  });
});

describe('detectLanguage', () => {
  it.each([
    ['dig @8.8.8.8 example.com', 'bash'],
    ['docker run --rm x', 'bash'],
    ['from x import y\nprint(1)', 'python'],
    ['print("Hello, World!")', 'python'],
    ['resource "a" "b" {\n}', 'hcl'],
    ['FROM node:24\nRUN x', 'dockerfile'],
    ['{"a": 1}', 'json'],
    ['web: python hello.py', 'text'],
    ['random words', 'text'],
  ])('%s → %s', (code, lang) => {
    expect(detectLanguage(code)).toBe(lang);
  });
});
