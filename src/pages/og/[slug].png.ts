import type { APIRoute, GetStaticPaths } from 'astro';
import { renderOg } from '../../lib/og';
import { getPosts } from '../../lib/posts';
import { SITE } from '../../lib/site';
import { tagLabel } from '../../lib/tags';

export const getStaticPaths = (async () => {
  const posts = await getPosts();
  return [
    { params: { slug: 'default' }, props: { title: SITE.tagline, kicker: SITE.name, footer: SITE.description } },
    ...posts.map((p) => ({
      params: { slug: p.data.slug },
      props: {
        title: p.data.title,
        kicker: `${SITE.name} · ${tagLabel(p.data.tags[0] ?? '')}`,
        footer: p.data.pubDate.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          timeZone: 'UTC',
        }),
      },
    })),
  ];
}) satisfies GetStaticPaths;

export const GET: APIRoute<{ title: string; kicker: string; footer: string }> = async ({ props }) =>
  new Response(await renderOg(props), { headers: { 'Content-Type': 'image/png' } });
