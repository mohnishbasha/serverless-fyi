import { describe, expect, it } from 'vitest';
import { absoluteUrl, joinBase, stripBase } from '../../src/lib/urls';

describe('joinBase', () => {
  it('prefixes the base path', () => {
    expect(joinBase('/serverless-fyi/', '/p/x/')).toBe('/serverless-fyi/p/x/');
  });

  it('works with root base', () => {
    expect(joinBase('/', '/p/x/')).toBe('/p/x/');
  });

  it('always adds a trailing slash to page paths', () => {
    expect(joinBase('/', '/p/x')).toBe('/p/x/');
    expect(joinBase('/base', 'archive')).toBe('/base/archive/');
  });

  it('never double-slashes', () => {
    expect(joinBase('/base/', '//p//x//')).toBe('/base/p/x/');
    expect(joinBase('//', '/')).toBe('/');
  });

  it('does not add a trailing slash to files', () => {
    expect(joinBase('/', '/rss.xml')).toBe('/rss.xml');
    expect(joinBase('/b/', '/p/x.md')).toBe('/b/p/x.md');
    expect(joinBase('/', '/og/x.png')).toBe('/og/x.png');
  });

  it('keeps query strings and fragments after the slash', () => {
    expect(joinBase('/', '/search?q=dns')).toBe('/search/?q=dns');
    expect(joinBase('/', '/p/x#faq')).toBe('/p/x/#faq');
    expect(joinBase('/', '#main')).toBe('/#main');
  });
});

describe('absoluteUrl', () => {
  it('builds an absolute URL with trailing slash', () => {
    expect(absoluteUrl('/p/x', 'https://www.serverless.fyi', '/')).toBe('https://www.serverless.fyi/p/x/');
  });

  it('respects base and trailing slash on site', () => {
    expect(absoluteUrl('/p/x/', 'https://mohnishbasha.github.io/', '/serverless-fyi/')).toBe(
      'https://mohnishbasha.github.io/serverless-fyi/p/x/',
    );
  });
});

describe('stripBase', () => {
  it('removes the base from a pathname', () => {
    expect(stripBase('/serverless-fyi/p/x/', '/serverless-fyi/')).toBe('/p/x/');
    expect(stripBase('/p/x/', '/')).toBe('/p/x/');
  });
});
