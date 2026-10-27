/**
 * Every internal URL goes through this module so staging (BASE_PATH=/serverless-fyi/)
 * and production (BASE_PATH=/) both work. See docs/ARCHITECTURE.md § Base path.
 */

const FILE_RE = /\/[^/]+\.[a-z0-9]+$/i;

function splitSuffix(path: string): [string, string] {
  const i = path.search(/[?#]/);
  return i === -1 ? [path, ''] : [path.slice(0, i), path.slice(i)];
}

/** Join a base path and a site-relative path, normalising slashes and adding a trailing slash to pages. */
export function joinBase(base: string, path: string): string {
  const [rawPath, suffix] = splitSuffix(path);
  let joined = `/${base}/${rawPath}`.replace(/\/{2,}/g, '/');
  if (!FILE_RE.test(joined) && !joined.endsWith('/')) joined += '/';
  return joined + suffix;
}

/** Remove the base path from a pathname, returning a root-relative path. */
export function stripBase(pathname: string, base: string): string {
  const b = `/${base}/`.replace(/\/{2,}/g, '/');
  if (b !== '/' && pathname.startsWith(b)) return `/${pathname.slice(b.length)}`;
  return pathname;
}

/** Absolute URL for canonicals, feeds, sitemaps and JSON-LD. */
export function absoluteUrl(path: string, site: string, base: string): string {
  return site.replace(/\/+$/, '') + joinBase(base, path);
}

const env = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env ?? {};

export const BASE_URL: string = env.BASE_URL ?? process.env.BASE_PATH ?? '/';
export const SITE_URL: string = (env.SITE ?? process.env.SITE_URL ?? 'https://www.serverless.fyi').replace(/\/+$/, '');

/** Site-relative URL with the configured base. */
export const url = (path: string): string => joinBase(BASE_URL, path);

/** Absolute URL with the configured site + base. */
export const abs = (path: string): string => absoluteUrl(path, SITE_URL, BASE_URL);
