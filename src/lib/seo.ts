import { SITE } from './site';
import { absoluteUrl, stripBase } from './urls';

const SUFFIX = ` | ${SITE.name}`;
const TITLE_TARGET = 60;

export function pageTitle(title?: string): string {
  if (!title) return SITE.homeTitle;
  return title.length + SUFFIX.length <= TITLE_TARGET ? title + SUFFIX : title;
}

export function clampDescription(text: string, max = 160): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  const atWord = cut.slice(0, cut.lastIndexOf(' ')).replace(/[\s,;:.–—-]+$/, '');
  return `${atWord}…`;
}

export function canonicalFor(pathname: string, site: string, base: string): string {
  return absoluteUrl(stripBase(pathname, base), site, base);
}

export function robotsContent(opts: { indexable: boolean; noindex?: boolean }): string {
  if (!opts.indexable) return 'noindex,nofollow';
  if (opts.noindex) return 'noindex,follow';
  return 'index,follow,max-image-preview:large,max-snippet:-1';
}
