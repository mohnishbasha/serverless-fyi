import type { APIRoute } from 'astro';
import { ctx } from '../lib/env';
import { llmsFullTxt } from '../lib/llms';
import { getPosts, postMarkdown, summaryOf } from '../lib/posts';
import { SITE } from '../lib/site';

export const GET: APIRoute = async () => {
  const posts = (await getPosts()).filter((p) => !p.data.noindex);
  const body = llmsFullTxt(
    posts.map((p) => ({
      slug: p.data.slug,
      title: p.data.title,
      description: p.data.description,
      summary: summaryOf(p),
      tags: p.data.tags,
      pubDate: p.data.pubDate,
      markdown: postMarkdown(p),
    })),
    { ...ctx, startHere: SITE.startHere },
  );
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
