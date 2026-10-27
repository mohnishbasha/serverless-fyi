/** robots.txt policy (ADR-009: AI crawlers allowed by default; flip a bot to Disallow here). */
import { joinBase } from './urls';

export const AI_CRAWLERS = [
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
] as const;

/** Social preview fetchers need /og/ images, which `*` disallows. */
export const SOCIAL_CRAWLERS = [
  'Twitterbot',
  'facebookexternalhit',
  'LinkedInBot',
  'Slackbot',
  'Discordbot',
  'WhatsApp',
] as const;

export function robotsTxt(o: { indexable: boolean; sitemapUrl: string; base: string }): string {
  if (!o.indexable) return 'User-agent: *\nDisallow: /\n';
  const root = joinBase(o.base, '/');
  const og = joinBase(o.base, '/og/');
  const lines = [
    '# Production',
    'User-agent: *',
    `Allow: ${root}`,
    `Disallow: ${og}`,
    '',
    '# AI / answer engines — explicitly welcome',
  ];
  for (const bot of AI_CRAWLERS) lines.push(`User-agent: ${bot}`, `Allow: ${root}`);
  lines.push('', '# Social link previews (need /og/ images)');
  for (const bot of SOCIAL_CRAWLERS) lines.push(`User-agent: ${bot}`, `Allow: ${root}`);
  lines.push('', `Sitemap: ${o.sitemapUrl}`, '');
  return lines.join('\n');
}
