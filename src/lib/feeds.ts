/** RSS 2.0 / Atom 1.0 / JSON Feed 1.1 builders. All URLs absolute; full HTML content. */
import { SITE, SITE_VERSION } from './site';

export interface FeedItem {
  title: string;
  url: string;
  description: string;
  html: string;
  pubDate: Date;
  updated?: Date | undefined;
  tags: string[];
  image?: string | undefined;
}

export interface FeedMeta {
  title: string;
  description: string;
  homeUrl: string;
  feedUrl: string;
  iconUrl: string;
  author: { name: string; url: string };
}

const x = (s: string) =>
  s.replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[c] ?? c);
const cdata = (s: string) => `<![CDATA[${s.replace(/]]>/g, ']]]]><![CDATA[>')}]]>`;

export function rssXml(meta: FeedMeta, items: FeedItem[]): string {
  const updated = items[0]?.updated ?? items[0]?.pubDate ?? new Date();
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:dc="http://purl.org/dc/elements/1.1/">
<channel>
<title>${x(meta.title)}</title>
<link>${x(meta.homeUrl)}</link>
<description>${x(meta.description)}</description>
<language>en</language>
<copyright>© Serverless Ventures LLC</copyright>
<generator>serverless-fyi ${SITE_VERSION}</generator>
<lastBuildDate>${updated.toUTCString()}</lastBuildDate>
<atom:link href="${x(meta.feedUrl)}" rel="self" type="application/rss+xml"/>
<image><url>${x(meta.iconUrl)}</url><title>${x(meta.title)}</title><link>${x(meta.homeUrl)}</link></image>
${items
  .map(
    (i) => `<item>
<title>${x(i.title)}</title>
<link>${x(i.url)}</link>
<guid isPermaLink="true">${x(i.url)}</guid>
<pubDate>${i.pubDate.toUTCString()}</pubDate>
<dc:creator>${x(meta.author.name)}</dc:creator>
<description>${x(i.description)}</description>
${i.tags.map((t) => `<category>${x(t)}</category>`).join('\n')}
<content:encoded>${cdata(i.html)}</content:encoded>
</item>`,
  )
  .join('\n')}
</channel>
</rss>
`;
}

export function atomXml(meta: FeedMeta, items: FeedItem[]): string {
  const updated = items.reduce((a, i) => Math.max(a, (i.updated ?? i.pubDate).getTime()), 0);
  return `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom" xml:lang="en">
<title>${x(meta.title)}</title>
<subtitle>${x(meta.description)}</subtitle>
<id>${x(meta.homeUrl)}</id>
<link rel="alternate" type="text/html" href="${x(meta.homeUrl)}"/>
<link rel="self" type="application/atom+xml" href="${x(meta.feedUrl)}"/>
<updated>${new Date(updated || Date.now()).toISOString()}</updated>
<icon>${x(meta.iconUrl)}</icon>
<rights>© Serverless Ventures LLC</rights>
<author><name>${x(meta.author.name)}</name><uri>${x(meta.author.url)}</uri></author>
<generator version="${SITE_VERSION}">serverless-fyi</generator>
${items
  .map(
    (i) => `<entry>
<title>${x(i.title)}</title>
<id>${x(i.url)}</id>
<link rel="alternate" type="text/html" href="${x(i.url)}"/>
<published>${i.pubDate.toISOString()}</published>
<updated>${(i.updated ?? i.pubDate).toISOString()}</updated>
<summary>${x(i.description)}</summary>
${i.tags.map((t) => `<category term="${x(t)}"/>`).join('\n')}
<content type="html">${x(i.html)}</content>
</entry>`,
  )
  .join('\n')}
</feed>
`;
}

export function jsonFeed(meta: FeedMeta, items: FeedItem[]): string {
  return JSON.stringify(
    {
      version: 'https://jsonfeed.org/version/1.1',
      title: meta.title,
      home_page_url: meta.homeUrl,
      feed_url: meta.feedUrl,
      description: meta.description,
      icon: meta.iconUrl,
      language: 'en',
      authors: [meta.author],
      items: items.map((i) => ({
        id: i.url,
        url: i.url,
        title: i.title,
        summary: i.description,
        content_html: i.html,
        date_published: i.pubDate.toISOString(),
        date_modified: (i.updated ?? i.pubDate).toISOString(),
        tags: i.tags,
        ...(i.image ? { image: i.image } : {}),
      })),
    },
    null,
    2,
  );
}

export const feedTitle = SITE.name;
