/**
 * Beehiiv API v2 exporter (preferred when the owner has an API key).
 * Usage: BEEHIIV_API_KEY=… BEEHIIV_PUBLICATION_ID=pub_… pnpm migrate:fetch
 * Reads .env.local if present. Never run in CI. Output matches scrape-beehiiv.ts.
 */
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { normalizeApiPost } from './lib/beehiiv';
import { RAW, ROOT, politeFetch, writeJson } from './lib/io';

function loadEnvLocal() {
  const f = path.join(ROOT, '.env.local');
  if (!existsSync(f)) return;
  for (const line of readFileSync(f, 'utf8').split('\n')) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
    if (m?.[1] && !(m[1] in process.env)) process.env[m[1]] = m[2]?.replace(/^["']|["']$/g, '');
  }
}

async function main() {
  loadEnvLocal();
  const key = process.env.BEEHIIV_API_KEY;
  const pub = process.env.BEEHIIV_PUBLICATION_ID;
  if (!key || !pub) {
    console.error(
      'BEEHIIV_API_KEY and BEEHIIV_PUBLICATION_ID are required (see .env.example). Use pnpm migrate:scrape otherwise.',
    );
    process.exit(2);
  }
  let page = 1;
  let total = 0;
  for (;;) {
    const u = new URL(`https://api.beehiiv.com/v2/publications/${pub}/posts`);
    u.searchParams.set('status', 'confirmed');
    u.searchParams.set('limit', '100');
    u.searchParams.set('page', String(page));
    u.searchParams.append('expand[]', 'free_web_content');
    const res = await politeFetch(u.toString(), { headers: { authorization: `Bearer ${key}` } });
    if (!res.ok) throw new Error(`Beehiiv API ${res.status}: ${await res.text()}`);
    const body = (await res.json()) as { data: Parameters<typeof normalizeApiPost>[0][]; total_pages: number };
    await writeJson(path.join(RAW, 'api', `posts-page-${page}.json`), body);
    for (const raw of body.data) {
      const post = normalizeApiPost(raw);
      await writeJson(path.join(RAW, 'posts', `${post.slug}.json`), post);
      total++;
    }
    if (page >= body.total_pages) break;
    page++;
  }
  console.log(`${total} posts → ${path.relative(process.cwd(), RAW)}/posts`);
}

main().catch((e: unknown) => {
  console.error(e);
  process.exit(1);
});
