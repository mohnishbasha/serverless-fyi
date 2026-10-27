/** Beehiiv source adapters: scraped Remix page JSON and API v2 posts → one normalised shape. */
import { normalizeTag } from '../../src/lib/tags';

export interface SourcePost {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  description: string;
  publishDate: string;
  updatedAt?: string;
  tags: string[];
  coverUrl?: string;
  webUrl: string;
  html: string;
}

export interface PublicationTag {
  slug: string;
  description: string;
}

export const SITE_ORIGIN = 'https://www.serverless.fyi';
export const USER_AGENT = 'serverless-fyi-migrator/1.0 (+https://www.serverless.fyi; mohinish@serverlessvc.com)';

interface RemixPost {
  id: string;
  web_title: string;
  web_subtitle?: string | null;
  slug: string;
  override_scheduled_at?: string | null;
  created_at: string;
  updated_at?: string;
  image_url?: string | null;
  meta_default_description?: string | null;
  content_tags?: Array<{ slug: string; display: string }>;
}

const MARKER = 'window.__remixContext = ';

export function parseRemixPage(page: string): { post: SourcePost; publicationTags: PublicationTag[] } {
  const start = page.indexOf(MARKER);
  if (start === -1) throw new Error('No window.__remixContext found in page');
  const end = page.indexOf(';</script>', start);
  const ctx = JSON.parse(page.slice(start + MARKER.length, end)) as {
    state: { loaderData: Record<string, Record<string, unknown>> };
  };
  const route = ctx.state.loaderData['routes/p/$slug'];
  if (!route) throw new Error('Page is not a post page (no routes/p/$slug loader data)');
  const p = route.post as RemixPost;
  const pubTags = ((
    ctx.state.loaderData.root?.publication as { content_tags?: Array<{ slug: string; description?: string }> }
  )?.content_tags ?? []) as Array<{ slug: string; description?: string }>;

  return {
    post: {
      id: p.id,
      slug: p.slug,
      title: p.web_title,
      subtitle: p.web_subtitle ?? '',
      description: p.meta_default_description ?? '',
      publishDate: p.override_scheduled_at ?? p.created_at,
      ...(p.updated_at ? { updatedAt: p.updated_at } : {}),
      tags: (p.content_tags ?? []).map((t) => normalizeTag(t.slug || t.display)),
      ...(p.image_url ? { coverUrl: p.image_url } : {}),
      webUrl: `${SITE_ORIGIN}/p/${p.slug}`,
      html: String(route.html ?? ''),
    },
    publicationTags: pubTags.map((t) => ({ slug: normalizeTag(t.slug), description: t.description ?? '' })),
  };
}

interface ApiPost {
  id: string;
  title: string;
  subtitle?: string;
  slug: string;
  web_url: string;
  publish_date: number;
  content_tags?: string[];
  thumbnail_url?: string;
  meta_default_description?: string;
  content?: { free?: { web?: string } };
}

export function normalizeApiPost(p: ApiPost): SourcePost {
  return {
    id: p.id,
    slug: p.slug,
    title: p.title,
    subtitle: p.subtitle ?? '',
    description: p.meta_default_description ?? '',
    publishDate: new Date(p.publish_date * 1000).toISOString(),
    tags: (p.content_tags ?? []).map(normalizeTag),
    ...(p.thumbnail_url ? { coverUrl: p.thumbnail_url } : {}),
    webUrl: p.web_url,
    html: p.content?.free?.web ?? '',
  };
}

export function parseSitemap(xml: string): string[] {
  return [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map((m) => {
    const u = new URL(m[1] ?? '/');
    return u.pathname.replace(/(.)\/+$/, '$1') || '/';
  });
}
