import type { APIRoute } from 'astro';
import { INDEXABLE } from '../lib/env';
import { robotsTxt } from '../lib/robots';
import { abs } from '../lib/urls';

export const GET: APIRoute = () =>
  new Response(
    robotsTxt({
      indexable: INDEXABLE,
      sitemapUrl: abs('/sitemap-index.xml').replace(/\/$/, ''),
      base: import.meta.env.BASE_URL,
    }),
    { headers: { 'Content-Type': 'text/plain; charset=utf-8' } },
  );
