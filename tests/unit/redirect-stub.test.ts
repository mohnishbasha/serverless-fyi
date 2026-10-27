import { describe, expect, it } from 'vitest';
import { redirectStub, stubPath } from '../../integrations/redirect-stub.mjs';

describe('redirectStub', () => {
  const html = redirectStub({
    to: '/t/distributed-systems/',
    site: 'https://www.serverless.fyi',
    base: '/',
  });

  it('has canonical, noindex, meta refresh and JS replace', () => {
    expect(html).toContain('<!doctype html>');
    expect(html).toContain('<html lang="en">');
    expect(html).toContain('<link rel="canonical" href="https://www.serverless.fyi/t/distributed-systems/">');
    expect(html).toContain('<meta name="robots" content="noindex">');
    expect(html).toContain('<meta http-equiv="refresh" content="0; url=/t/distributed-systems/">');
    expect(html).toContain("location.replace('/t/distributed-systems/' + location.hash)");
    expect(html).toContain('<a href="/t/distributed-systems/">');
  });

  it('respects BASE in both URLs', () => {
    const staged = redirectStub({
      to: '/subscribe/',
      site: 'https://mohnishbasha.github.io',
      base: '/serverless-fyi/',
    });
    expect(staged).toContain('href="https://mohnishbasha.github.io/serverless-fyi/subscribe/"');
    expect(staged).toContain('url=/serverless-fyi/subscribe/');
    expect(staged).toContain("location.replace('/serverless-fyi/subscribe/'");
  });

  it('escapes HTML-significant characters in targets', () => {
    const s = redirectStub({ to: '/p/a"b/', site: 'https://x.y', base: '/' });
    expect(s).not.toContain('a"b');
  });
});

describe('stubPath', () => {
  it('maps a legacy path to dist/<old>/index.html', () => {
    expect(stubPath('dist', '/t/distributed~systems')).toBe('dist/t/distributed~systems/index.html');
    expect(stubPath('dist', '/login/')).toBe('dist/login/index.html');
  });
  it('refuses path traversal', () => {
    expect(() => stubPath('dist', '/../etc')).toThrow();
  });
});
