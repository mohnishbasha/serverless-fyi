import type { APIRoute, GetStaticPaths } from 'astro';
import { feedItems, feedMeta } from '../../../lib/feed-data';
import { rssXml } from '../../../lib/feeds';
import { getPosts, type Post } from '../../../lib/posts';
import { SITE } from '../../../lib/site';
import { tagLabel } from '../../../lib/tags';

export const getStaticPaths = (async () => {
  const posts = await getPosts();
  const tags = [...new Set(posts.flatMap((p) => p.data.tags))];
  return tags.map((tag) => ({
    params: { tag },
    props: { tag, posts: posts.filter((p) => p.data.tags.includes(tag)) },
  }));
}) satisfies GetStaticPaths;

export const GET: APIRoute<{ tag: string; posts: Post[] }> = async ({ props: { tag, posts } }) =>
  new Response(
    rssXml(
      await feedMeta(
        `/t/${tag}/rss.xml`,
        `${SITE.name} — ${tagLabel(tag)}`,
        `${tagLabel(tag)} posts from ${SITE.name}.`,
      ),
      await feedItems(posts),
    ),
    { headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' } },
  );
