import { describe, expect, it } from 'vitest';
import { canonicalFor, clampDescription, pageTitle, robotsContent } from '../../src/lib/seo';

describe('pageTitle', () => {
  it('appends the site name', () => {
    expect(pageTitle('Vector Clocks')).toBe('Vector Clocks | 2 Minute Serverless');
  });
  it('drops the suffix when the result would exceed 60 chars', () => {
    const t = 'Using Terraform Null Resource vs External Data vs Custom Provider';
    expect(pageTitle(t)).toBe(t);
  });
  it('returns the home title when no title is given', () => {
    expect(pageTitle()).toBe('2 Minute Serverless — Data, AI & Distributed Systems in 2 Minutes');
  });
});

describe('clampDescription', () => {
  it('keeps descriptions within 160 chars at a word boundary', () => {
    const long = 'word '.repeat(60).trim();
    const out = clampDescription(long);
    expect(out.length).toBeLessThanOrEqual(160);
    expect(out.endsWith('…')).toBe(true);
    expect(out).not.toMatch(/\s…$/);
  });
  it('leaves short descriptions alone', () => {
    expect(clampDescription('short')).toBe('short');
  });
});

describe('canonicalFor', () => {
  it('is absolute with a trailing slash', () => {
    expect(canonicalFor('/p/x', 'https://www.serverless.fyi', '/')).toBe('https://www.serverless.fyi/p/x/');
  });
  it('strips the base from the pathname before rebuilding', () => {
    expect(canonicalFor('/serverless-fyi/p/x/', 'https://mohnishbasha.github.io', '/serverless-fyi/')).toBe(
      'https://mohnishbasha.github.io/serverless-fyi/p/x/',
    );
  });
});

describe('robotsContent', () => {
  it('indexes production pages', () => {
    expect(robotsContent({ indexable: true })).toBe('index,follow,max-image-preview:large,max-snippet:-1');
  });
  it('noindexes staging, drafts and explicit noindex', () => {
    expect(robotsContent({ indexable: false })).toBe('noindex,nofollow');
    expect(robotsContent({ indexable: true, noindex: true })).toBe('noindex,follow');
  });
});
