/** JSON-LD builders. One @graph per page; structured data must match visible content (docs/SEO_AEO.md). */
import { SITE, sameAs } from './site';
import { absoluteUrl } from './urls';

export type Node = Record<string, unknown>;
export interface Ctx {
  site: string;
  base: string;
}
export interface AuthorData {
  id: string;
  name: string;
  shortName: string;
  jobTitle: string;
  bio: string;
  avatar: string;
  url: string;
  sameAs: string[];
  knowsAbout: string[];
}
export interface PostData {
  slug: string;
  title: string;
  description: string;
  pubDate: Date;
  updatedDate?: Date | undefined;
  tags: string[];
  image: string;
  wordCount: number;
}

const abs = (p: string, c: Ctx) => (/^https?:\/\//.test(p) ? p : absoluteUrl(p, c.site, c.base));
const fileAbs = (p: string, c: Ctx) =>
  /^https?:\/\//.test(p) ? p : c.site.replace(/\/+$/, '') + `/${c.base}/${p}`.replace(/\/{2,}/g, '/');

export const orgId = (c: Ctx) => `${abs('/', c)}#organization`;
export const websiteId = (c: Ctx) => `${abs('/', c)}#website`;
export const blogId = (c: Ctx) => `${abs('/', c)}#blog`;
export const personId = (c: Ctx) => `${abs('/authors/', c)}#person`;

export function organization(c: Ctx): Node {
  return {
    '@type': 'Organization',
    '@id': orgId(c),
    name: SITE.organization.name,
    url: abs('/', c),
    logo: { '@type': 'ImageObject', url: fileAbs(SITE.organization.logo, c), width: 512, height: 512 },
    sameAs,
  };
}

export function website(c: Ctx, hasSearch: boolean): Node {
  const node: Node = {
    '@type': 'WebSite',
    '@id': websiteId(c),
    url: abs('/', c),
    name: SITE.name,
    description: SITE.description,
    inLanguage: SITE.lang,
    publisher: { '@id': orgId(c) },
  };
  if (hasSearch) {
    node.potentialAction = {
      '@type': 'SearchAction',
      target: `${abs('/search/', c)}?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    };
  }
  return node;
}

export function person(a: AuthorData, c: Ctx): Node {
  return {
    '@type': 'Person',
    '@id': personId(c),
    name: a.name,
    alternateName: a.shortName,
    jobTitle: a.jobTitle,
    description: a.bio,
    url: abs('/authors/', c),
    image: fileAbs(a.avatar, c),
    sameAs: a.sameAs,
    knowsAbout: a.knowsAbout,
    worksFor: { '@id': orgId(c) },
  };
}

export function blog(c: Ctx, items?: Array<{ slug: string; title: string }>): Node {
  const node: Node = {
    '@type': 'Blog',
    '@id': blogId(c),
    url: abs('/', c),
    name: SITE.name,
    description: SITE.description,
    inLanguage: SITE.lang,
    publisher: { '@id': orgId(c) },
  };
  if (items) node.blogPost = items.map((p) => ({ '@id': `${abs(`/p/${p.slug}/`, c)}#article` }));
  return node;
}

export function blogPosting(p: PostData, a: AuthorData, c: Ctx): Node {
  const url = abs(`/p/${p.slug}/`, c);
  const published = p.pubDate.toISOString();
  return {
    '@type': 'BlogPosting',
    '@id': `${url}#article`,
    headline: p.title,
    description: p.description,
    image: [fileAbs(p.image, c)],
    datePublished: published,
    dateModified: (p.updatedDate ?? p.pubDate).toISOString(),
    author: { '@type': 'Person', '@id': personId(c), name: a.name, url: abs('/authors/', c) },
    publisher: { '@id': orgId(c) },
    mainEntityOfPage: url,
    url,
    keywords: p.tags.join(', '),
    articleSection: p.tags[0] ?? 'General',
    wordCount: p.wordCount,
    inLanguage: SITE.lang,
    isPartOf: { '@id': blogId(c) },
  };
}

export function breadcrumbList(items: Array<{ name: string; path: string }>, c: Ctx): Node {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.name,
      item: abs(it.path, c),
    })),
  };
}

export function itemList(paths: Array<{ path: string; name: string }>, c: Ctx): Node {
  return {
    '@type': 'ItemList',
    itemListElement: paths.map((p, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: abs(p.path, c),
      name: p.name,
    })),
  };
}

export function collectionPage(path: string, name: string, description: string, c: Ctx): Node {
  return {
    '@type': 'CollectionPage',
    '@id': abs(path, c),
    url: abs(path, c),
    name,
    description,
    isPartOf: { '@id': websiteId(c) },
    inLanguage: SITE.lang,
  };
}

export function profilePage(a: AuthorData, c: Ctx): Node {
  return {
    '@type': 'ProfilePage',
    '@id': abs('/authors/', c),
    url: abs('/authors/', c),
    name: `${a.name} — ${SITE.name}`,
    mainEntity: { '@id': personId(c) },
    isPartOf: { '@id': websiteId(c) },
  };
}

export function faqPage(faq: Array<{ q: string; a: string }>): Node | null {
  if (faq.length === 0) return null;
  return {
    '@type': 'FAQPage',
    mainEntity: faq.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };
}

export function graph(nodes: Array<Node | null | undefined>): Node {
  return { '@context': 'https://schema.org', '@graph': nodes.filter(Boolean) };
}

/** Serialise JSON-LD safely for embedding in a <script> element. */
export function serialize(node: Node): string {
  return JSON.stringify(node).replace(/</g, '\\u003c');
}
