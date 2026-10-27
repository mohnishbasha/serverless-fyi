import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import { defineConfig } from 'astro/config';
import cname from './integrations/cname.mjs';
import { scanPosts, scanTags } from './integrations/content-index.mjs';
import legacyRedirects from './integrations/legacy-redirects.mjs';
import pagefind from './integrations/pagefind.mjs';
import remarkBaseLinks from './integrations/remark-base-links.mjs';

const SITE = process.env.SITE_URL ?? 'https://www.serverless.fyi';
const BASE = process.env.BASE_PATH ?? '/'; // '/serverless-fyi/' for staging on github.io

// lastmod per URL (updatedDate ?? pubDate) and URLs that must stay out of the sitemap.
const posts = scanPosts().filter((p) => !p.draft);
const lastmod = new Map();
const excluded = new Set(['/404/', '/search/']);
for (const p of posts) {
  const d = p.updatedDate ?? p.pubDate;
  lastmod.set(`/p/${p.slug}/`, d);
  if (p.noindex) excluded.add(`/p/${p.slug}/`);
  for (const t of p.tags) if (!lastmod.has(`/t/${t}/`) || lastmod.get(`/t/${t}/`) < d) lastmod.set(`/t/${t}/`, d);
}
const usedTags = new Set(posts.flatMap((p) => p.tags));
for (const t of scanTags()) if (!usedTags.has(t)) excluded.add(`/t/${t}/`);
const newest = posts.reduce((a, p) => Math.max(a, (p.updatedDate ?? p.pubDate).getTime()), 0);

const pathOf = (u) => {
  const p = new URL(u).pathname;
  const b = `/${BASE}/`.replace(/\/{2,}/g, '/');
  return b !== '/' && p.startsWith(b) ? `/${p.slice(b.length)}` : p;
};

export default defineConfig({
  site: SITE,
  base: BASE,
  trailingSlash: 'always',
  build: { format: 'directory' },
  prefetch: { prefetchAll: false, defaultStrategy: 'hover' },
  markdown: {
    remarkPlugins: [[remarkBaseLinks, { base: BASE }]],
    shikiConfig: { themes: { light: 'github-light-high-contrast', dark: 'github-dark' }, wrap: false },
  },
  image: { responsiveStyles: false },
  integrations: [
    mdx(),
    sitemap({
      filter: (page) => {
        const p = pathOf(page);
        return !p.startsWith('/og/') && !p.startsWith('/redirects/') && !excluded.has(p);
      },
      changefreq: 'weekly',
      serialize: (item) => {
        const d = lastmod.get(pathOf(item.url)) ?? (newest ? new Date(newest) : undefined);
        return d ? { ...item, lastmod: d.toISOString() } : item;
      },
    }),
    legacyRedirects(), // writes static redirect stubs from migration/legacy-urls.json
    cname(), // dist/CNAME only when PUBLIC_INDEXABLE=true
    pagefind(), // runs pagefind on dist/ after build
  ],
});
