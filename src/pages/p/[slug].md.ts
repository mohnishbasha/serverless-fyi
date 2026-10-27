import type { APIRoute, GetStaticPaths } from 'astro';
import { getAuthor, getPosts, type Post, postMarkdown, postPath } from '../../lib/posts';
import { twinDocument } from '../../lib/markdown';
import { abs } from '../../lib/urls';

export const getStaticPaths = (async () =>
  (await getPosts()).map((post) => ({ params: { slug: post.data.slug }, props: { post } }))) satisfies GetStaticPaths;

export const GET: APIRoute<{ post: Post }> = async ({ props: { post } }) => {
  const author = await getAuthor(post);
  const d = post.data;
  const body = twinDocument(
    {
      title: d.title,
      url: abs(postPath(post)),
      description: d.description,
      pubDate: d.pubDate,
      updatedDate: d.updatedDate,
      tags: d.tags,
      author: author.name,
    },
    [
      !d.aeoPending && d.tldr ? `> **TL;DR:** ${d.tldr}\n` : '',
      !d.aeoPending && d.keyTakeaways.length
        ? `**Key takeaways**\n\n${d.keyTakeaways.map((t) => `- ${t}`).join('\n')}\n`
        : '',
      postMarkdown(post),
      !d.aeoPending && d.faq.length
        ? `## Frequently asked questions\n\n${d.faq.map((f) => `### ${f.q}\n\n${f.a}\n`).join('\n')}`
        : '',
    ]
      .filter(Boolean)
      .join('\n'),
  );
  return new Response(body, { headers: { 'Content-Type': 'text/markdown; charset=utf-8' } });
};
