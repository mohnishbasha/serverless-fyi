/** Shared data source for feeds (Astro-dependent). */
import type { FeedItem, FeedMeta } from './feeds';
import { markdownToHtml } from './markdown';
import { getAuthor, ogPath, type Post, postMarkdown, postPath } from './posts';
import { SITE } from './site';
import { abs } from './urls';

const fileAbs = (p: string) => abs(p).replace(/\/$/, '');

export async function feedItems(posts: Post[]): Promise<FeedItem[]> {
  return Promise.all(
    posts.slice(0, SITE.feedLimit).map(async (p) => ({
      title: p.data.title,
      url: abs(postPath(p)),
      description: p.data.description,
      html: await markdownToHtml(postMarkdown(p)),
      pubDate: p.data.pubDate,
      updated: p.data.updatedDate,
      tags: p.data.tags,
      image: fileAbs(ogPath(p.data.slug)),
    })),
  );
}

export async function feedMeta(
  feedPath: string,
  title: string = SITE.name,
  description: string = SITE.homeDescription,
): Promise<FeedMeta> {
  const author = await getAuthor();
  return {
    title,
    description,
    homeUrl: abs('/'),
    feedUrl: fileAbs(feedPath),
    iconUrl: fileAbs('/brand/icon-192.png'),
    author: { name: author.name, url: abs('/authors/') },
  };
}
