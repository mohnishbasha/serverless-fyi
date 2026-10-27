import type { APIRoute } from 'astro';
import { feedItems, feedMeta } from '../lib/feed-data';
import { rssXml } from '../lib/feeds';
import { getPosts } from '../lib/posts';

export const GET: APIRoute = async () =>
  new Response(rssXml(await feedMeta('/rss.xml'), await feedItems(await getPosts())), {
    headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' },
  });
