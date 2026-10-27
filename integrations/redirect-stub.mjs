// Static redirect stub generator (GitHub Pages has no server-side redirects). See ADR-007.
import path from 'node:path';

const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const withBase = (base, to) => `/${base}/${to}`.replace(/\/{2,}/g, '/');

/**
 * @param {{ to: string, site: string, base: string }} opts
 * @returns {string}
 */
export function redirectStub({ to, site, base }) {
  const rel = withBase(base, to);
  const absolute = site.replace(/\/+$/, '') + rel;
  const relEsc = esc(rel);
  const jsTarget = JSON.stringify(rel).slice(1, -1).replace(/'/g, "\\'").replace(/</g, '\\u003c');
  return `<!doctype html><html lang="en"><head>
<meta charset="utf-8">
<title>Redirecting…</title>
<link rel="canonical" href="${esc(absolute)}">
<meta name="robots" content="noindex">
<meta http-equiv="refresh" content="0; url=${relEsc}">
<script>location.replace('${jsTarget}' + location.hash)</script>
</head><body><a href="${relEsc}">This page moved here.</a></body></html>
`;
}

/** dist/<old>/index.html for a legacy path, refusing traversal outside dist. */
export function stubPath(distDir, oldPath) {
  const clean = oldPath.replace(/^\/+|\/+$/g, '');
  const target = path.posix.join(distDir, clean, 'index.html');
  const rel = path.posix.relative(distDir, target);
  if (rel.startsWith('..') || path.posix.isAbsolute(rel)) throw new Error(`Refusing stub outside dist: ${oldPath}`);
  return target;
}
