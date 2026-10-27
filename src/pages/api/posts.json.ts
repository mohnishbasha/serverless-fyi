import type { APIRoute } from 'astro';
import { getPosts, ogPath, postMdPath, postPath } from '../../lib/posts';
import { SITE_VERSION } from '../../lib/site';
import { abs } from '../../lib/urls';

const fileAbs = (p: string) => abs(p).replace(/\/$/, '');

export const GET: APIRoute = async () => {
  const posts = await getPosts();
  const body = {
    version: SITE_VERSION,
    generated: new Date().toISOString(),
    count: posts.length,
    posts: posts.map((p) => ({
      slug: p.data.slug,
      title: p.data.title,
      description: p.data.description,
      tldr: p.data.aeoPending ? null : (p.data.tldr ?? null),
      tags: p.data.tags,
      pubDate: p.data.pubDate.toISOString(),
      updatedDate: p.data.updatedDate?.toISOString() ?? null,
      url: abs(postPath(p)),
      markdownUrl: fileAbs(postMdPath(p)),
      ogImage: fileAbs(ogPath(p.data.slug)),
    })),
  };
  return new Response(JSON.stringify(body, null, 2), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
};
