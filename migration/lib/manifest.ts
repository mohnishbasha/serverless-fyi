/** Legacy URL manifest (migration/legacy-urls.json). Append-only: previous entries are always kept. */
import { legacyTagSlug } from '../../src/lib/tags';

export interface ManifestEntry {
  old: string;
  new: string;
  type: 'same' | 'redirect';
}

const STATIC_SAME = ['/', '/archive', '/authors', '/subscribe'];
const ACCOUNT_REDIRECTS: Record<string, string> = {
  '/login': '/subscribe/',
  '/signup': '/subscribe/',
  '/upgrade': '/subscribe/',
  '/account': '/subscribe/',
  '/authors/mohinish-s': '/authors/',
};

const slash = (p: string) => (p === '/' ? '/' : `${p.replace(/\/+$/, '')}/`);

export function buildManifest(o: {
  sitemapPaths: string[];
  postSlugs: string[];
  tags: string[];
  previous?: ManifestEntry[];
}): ManifestEntry[] {
  const map = new Map<string, ManifestEntry>();
  const add = (e: ManifestEntry) => {
    if (!map.has(e.old)) map.set(e.old, e);
  };

  for (const e of o.previous ?? []) add(e);
  for (const p of STATIC_SAME) add({ old: p, new: slash(p), type: 'same' });
  for (const [old, to] of Object.entries(ACCOUNT_REDIRECTS)) add({ old, new: to, type: 'redirect' });
  for (const s of o.postSlugs) add({ old: `/p/${s}`, new: `/p/${s}/`, type: 'same' });
  for (const t of o.tags) {
    add({ old: `/t/${t}`, new: `/t/${t}/`, type: 'same' });
    const legacy = legacyTagSlug(t);
    if (legacy) add({ old: `/t/${legacy}`, new: `/t/${t}/`, type: 'redirect' });
  }
  for (const p of o.sitemapPaths) {
    const clean = p === '/' ? '/' : p.replace(/\/+$/, '');
    if (!map.has(clean)) add({ old: clean, new: slash(clean), type: 'same' });
  }
  return [...map.values()].sort((a, b) => (a.old < b.old ? -1 : a.old > b.old ? 1 : 0));
}
