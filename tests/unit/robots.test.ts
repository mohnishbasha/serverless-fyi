import { describe, expect, it } from 'vitest';
import { AI_CRAWLERS, robotsTxt } from '../../src/lib/robots';

describe('robotsTxt', () => {
  it('production allows everything except /og/ and welcomes AI crawlers', () => {
    const txt = robotsTxt({ indexable: true, sitemapUrl: 'https://www.serverless.fyi/sitemap-index.xml', base: '/' });
    expect(txt).toContain('User-agent: *\nAllow: /\nDisallow: /og/\n');
    for (const bot of [
      'GPTBot',
      'OAI-SearchBot',
      'ChatGPT-User',
      'ClaudeBot',
      'Claude-User',
      'Claude-SearchBot',
      'PerplexityBot',
      'Perplexity-User',
      'Google-Extended',
      'Applebot-Extended',
      'CCBot',
    ]) {
      expect(AI_CRAWLERS).toContain(bot);
      expect(txt).toContain(`User-agent: ${bot}\nAllow: /\n`);
    }
    expect(txt).toContain('Sitemap: https://www.serverless.fyi/sitemap-index.xml');
    expect(txt).not.toContain('Disallow: /\n');
  });

  it('staging disallows everything and has no sitemap', () => {
    const txt = robotsTxt({ indexable: false, sitemapUrl: 'x', base: '/serverless-fyi/' });
    expect(txt).toBe('User-agent: *\nDisallow: /\n');
  });

  it('prefixes paths with the base', () => {
    const txt = robotsTxt({ indexable: true, sitemapUrl: 's', base: '/b/' });
    expect(txt).toContain('Allow: /b/\nDisallow: /b/og/\n');
  });
});
