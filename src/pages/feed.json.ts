import type { APIRoute } from 'astro';
import { feedItems, feedMeta } from '../lib/feed-data';
import { jsonFeed } from '../lib/feeds';
import { getPosts } from '../lib/posts';

export const GET: APIRoute = async () =>
  new Response(jsonFeed(await feedMeta('/feed.json'), await feedItems(await getPosts())), {
    headers: { 'Content-Type': 'application/feed+json; charset=utf-8' },
  });
