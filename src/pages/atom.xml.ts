import type { APIRoute } from 'astro';
import { feedItems, feedMeta } from '../lib/feed-data';
import { atomXml } from '../lib/feeds';
import { getPosts } from '../lib/posts';

export const GET: APIRoute = async () =>
  new Response(atomXml(await feedMeta('/atom.xml'), await feedItems(await getPosts())), {
    headers: { 'Content-Type': 'application/atom+xml; charset=utf-8' },
  });
