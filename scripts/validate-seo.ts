/** Structured data + meta assertions over every built HTML page (docs/SEO_AEO.md, docs/TEST_PLAN.md). */
import { load } from 'cheerio';
import { BASE, DIST, exists, INDEXABLE, isStub, read, Report, SITE_URL, urlPathOf, walk } from './lib/dist';

const REQUIRED: Record<string, string[]> = {
  BlogPosting: [
    'headline',
    'description',
    'image',
    'datePublished',
    'dateModified',
    'author',
    'publisher',
    'mainEntityOfPage',
  ],
  Person: ['name', 'url'],
  Organization: ['name', 'url', 'logo'],
  WebSite: ['name', 'url'],
  Blog: ['name', 'url'],
  BreadcrumbList: ['itemListElement'],
  FAQPage: ['mainEntity'],
  CollectionPage: ['name', 'url'],
  ItemList: ['itemListElement'],
  ProfilePage: ['mainEntity'],
};
// Pages that are intentionally noindex on production.
const NOINDEX_OK = (path: string, html: string) =>
  path === '/404.html' || path === '/search/' || html.includes('No posts with this tag yet');

const r = new Report('validate-seo');
const titles = new Map<string, string>();
const descriptions = new Map<string, string>();
let pages = 0;

for (const file of walk(DIST, (f) => f.endsWith('.html'))) {
  const html = read(file);
  const path = urlPathOf(file);
  if (path.startsWith('/pagefind/')) continue;
  if (isStub(html)) continue;
  pages++;
  const $ = load(html);
  const at = (m: string) => r.error(`${path}: ${m}`);

  if ($('html').attr('lang') !== 'en') at('missing <html lang="en">');
  const h1 = $('h1').length;
  if (h1 !== 1) at(`expected exactly one <h1>, found ${h1}`);

  const title = $('head > title').text().trim();
  if (!title) at('missing <title>');
  else if (titles.has(title)) at(`duplicate <title> (also on ${titles.get(title)})`);
  else titles.set(title, path);

  const robots = $('meta[name="robots"]').attr('content') ?? '';
  const noindex = robots.includes('noindex');
  if (!INDEXABLE && !noindex) at('staging build page is indexable');
  if (INDEXABLE && noindex && !NOINDEX_OK(path, html)) at(`unexpected noindex (${robots})`);

  const desc = $('meta[name="description"]').attr('content') ?? '';
  if (desc.length < 70 || desc.length > 160) at(`meta description length ${desc.length} (want 70–160)`);
  if (!noindex) {
    if (descriptions.has(desc)) at(`duplicate meta description (also on ${descriptions.get(desc)})`);
    else descriptions.set(desc, path);
  }

  const canonical = $('link[rel="canonical"]').attr('href') ?? '';
  const expected = `${SITE_URL}${BASE}${path.replace(/^\//, '')}`;
  if (!/^https:\/\//.test(canonical)) at(`canonical not absolute https: "${canonical}"`);
  else if (path !== '/404.html' && canonical !== expected) at(`canonical ${canonical} ≠ ${expected}`);

  for (const p of ['og:type', 'og:title', 'og:description', 'og:url', 'og:image', 'og:image:alt', 'og:site_name']) {
    if (!$(`meta[property="${p}"]`).attr('content')) at(`missing ${p}`);
  }
  for (const n of ['twitter:card', 'twitter:site', 'twitter:creator']) {
    if (!$(`meta[name="${n}"]`).attr('content')) at(`missing ${n}`);
  }
  const ogImage = $('meta[property="og:image"]').attr('content') ?? '';
  const ogLocal = ogImage.startsWith(SITE_URL) ? ogImage.slice(SITE_URL.length).replace(BASE, '/') : '';
  if (!ogLocal || !exists(`${DIST}${ogLocal}`)) at(`og:image ${ogImage} not found in dist`);

  const types: string[] = [];
  const scripts = $('script[type="application/ld+json"]');
  if (scripts.length === 0 && path !== '/404.html') at('no JSON-LD');
  scripts.each((_, el) => {
    let data: { '@graph'?: Array<Record<string, unknown>> };
    try {
      data = JSON.parse($(el).text());
    } catch (e) {
      at(`JSON-LD does not parse: ${String(e)}`);
      return;
    }
    for (const node of data['@graph'] ?? []) {
      const type = String(node['@type']);
      types.push(type);
      for (const k of REQUIRED[type] ?? []) {
        const v = node[k];
        if (v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0))
          at(`${type} missing ${k}`);
      }
      if (type === 'FAQPage') {
        for (const q of node.mainEntity as Array<{ name: string }>) {
          if (!$('.faq').text().includes(q.name)) at(`FAQPage question not visible on page: ${q.name}`);
        }
      }
    }
  });
  if (path.startsWith('/p/') && !types.includes('BlogPosting')) at('post page without BlogPosting');
  if (path.startsWith('/p/') && $('link[rel="alternate"][type="text/markdown"]').length !== 1)
    at('post page without Markdown alternate');
  if (path === '/authors/' && !types.includes('ProfilePage')) at('authors page without ProfilePage');
  if (/^\/t\/[^/]+\/$/.test(path) && !types.includes('CollectionPage')) at('tag page without CollectionPage');
}

r.finish(`${pages} pages OK (${titles.size} unique titles)`);
