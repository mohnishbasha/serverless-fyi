/** Asset + sitemap + agent-endpoint sanity over dist/ (docs/TEST_PLAN.md § Build-output validators). */
import { load } from 'cheerio';
import { statSync } from 'node:fs';
import path from 'node:path';
import { BASE, DIST, exists, fileFor, INDEXABLE, isStub, read, Report, SITE_URL, urlPathOf, walk } from './lib/dist';

const r = new Report('validate-dist');
const MAX = 1024 * 1024;
const ALLOW_LARGE = [/^pagefind\//, /^llms-full\.txt$/];
const files = walk(DIST);

for (const f of files) {
  const rel = path.relative(DIST, f);
  if (statSync(f).size > MAX && !ALLOW_LARGE.some((re) => re.test(rel)))
    r.error(`${rel} is ${(statSync(f).size / 1024).toFixed(0)} KB (> 1 MB)`);
  if (/\.(html|xml|json|txt|md|css|js)$/.test(f) && /media\.beehiiv\.com|beehiiv-images-production/.test(read(f))) {
    r.error(`${rel} references a remote Beehiiv asset`);
  }
}

if (INDEXABLE && !exists(`${DIST}/CNAME`)) r.error('production build without CNAME');
if (!INDEXABLE && exists(`${DIST}/CNAME`)) r.error('staging build must not contain CNAME');

// Sitemap: every URL exists, none are stubs/OG/noindex, count = indexable pages.
const index = `${DIST}/sitemap-index.xml`;
if (!exists(index)) r.error('sitemap-index.xml missing');
else {
  const urls = walk(DIST, (f) => /sitemap-\d+\.xml$/.test(f)).flatMap((f) =>
    [...read(f).matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1] ?? ''),
  );
  const prefix = `${SITE_URL}${BASE}`;
  for (const u of urls) {
    if (!u.startsWith(prefix)) {
      r.error(`sitemap URL outside site: ${u}`);
      continue;
    }
    const p = `/${u.slice(prefix.length)}`;
    const f = fileFor(p);
    if (!exists(f)) r.error(`sitemap URL has no file: ${u}`);
    else {
      const html = read(f);
      if (isStub(html)) r.error(`sitemap lists a redirect stub: ${u}`);
      if (INDEXABLE && /<meta name="robots" content="noindex/.test(html)) r.error(`sitemap lists a noindex page: ${u}`);
    }
    if (p.startsWith('/og/')) r.error(`sitemap lists an OG image: ${u}`);
  }
  const indexable = walk(DIST, (f) => f.endsWith('.html'))
    .filter((f) => !urlPathOf(f).startsWith('/pagefind/') && !f.endsWith('404.html'))
    .filter((f) => {
      const h = read(f);
      return !isStub(h) && !/content="noindex/.test(h);
    });
  if (INDEXABLE && urls.length !== indexable.length)
    r.error(`sitemap has ${urls.length} URLs but ${indexable.length} indexable pages`);
}

// Agent endpoints.
const posts = JSON.parse(read(`${DIST}/api/posts.json`)).posts as Array<{ slug: string; markdownUrl: string }>;
const llms = read(`${DIST}/llms.txt`);
if (!llms.startsWith('# 2 Minute Serverless')) r.error('llms.txt must start with the site H1');
for (const p of posts) {
  if (!exists(`${DIST}/p/${p.slug}.md`)) r.error(`missing Markdown twin for ${p.slug}`);
  if (!llms.includes(`/p/${p.slug}.md`)) r.error(`llms.txt missing ${p.slug}`);
}
const full = statSync(`${DIST}/llms-full.txt`).size;
if (full > 5 * MAX) r.error(`llms-full.txt is ${(full / MAX).toFixed(1)} MB (> 5 MB)`);
const robots = read(`${DIST}/robots.txt`);
if (INDEXABLE ? !robots.includes('Sitemap:') : !robots.includes('Disallow: /'))
  r.error('robots.txt does not match environment');
const sec = read(`${DIST}/.well-known/security.txt`);
const expires = /Expires: (\S+)/.exec(sec)?.[1];
if (!expires || new Date(expires).getTime() < Date.now() + 30 * 86_400_000)
  r.error('security.txt Expires is missing or within 30 days');

// Root-relative links must carry the base (staging safety).
if (BASE !== '/') {
  for (const f of walk(DIST, (x) => x.endsWith('.html'))) {
    const $ = load(read(f));
    $('a[href^="/"], link[href^="/"], img[src^="/"], script[src^="/"]').each((_, el) => {
      const v = $(el).attr('href') ?? $(el).attr('src') ?? '';
      if (!v.startsWith(BASE)) r.error(`${urlPathOf(f)}: root-relative URL without base: ${v}`);
    });
  }
}

r.finish(`${files.length} files, ${posts.length} posts, sitemap and agent endpoints OK`);
