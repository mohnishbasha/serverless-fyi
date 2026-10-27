import type { APIRoute } from 'astro';
import { SITE } from '../lib/site';
import { url } from '../lib/urls';

export const GET: APIRoute = () =>
  new Response(
    JSON.stringify(
      {
        name: SITE.name,
        short_name: SITE.shortName,
        description: SITE.tagline,
        start_url: url('/'),
        scope: url('/'),
        display: 'minimal-ui',
        background_color: SITE.themeColorLight,
        theme_color: '#000000',
        icons: [
          { src: url('/brand/icon-192.png'), sizes: '192x192', type: 'image/png' },
          { src: url('/brand/logo-512.png'), sizes: '512x512', type: 'image/png' },
          { src: url('/brand/favicon.svg'), sizes: 'any', type: 'image/svg+xml' },
        ],
      },
      null,
      2,
    ),
    { headers: { 'Content-Type': 'application/manifest+json' } },
  );
