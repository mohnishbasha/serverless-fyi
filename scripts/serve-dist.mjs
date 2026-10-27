#!/usr/bin/env node
// Minimal GitHub Pages emulator for dist/: base path, 301 to trailing slash, 404.html on miss.
// Usage: node scripts/serve-dist.mjs [port]   (env BASE_PATH, DIST_DIR)
import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import path from 'node:path';

const port = Number(process.argv[2] ?? process.env.PORT ?? 4399);
const dist = path.resolve(process.env.DIST_DIR ?? 'dist');
const base = `/${process.env.BASE_PATH ?? '/'}/`.replace(/\/{2,}/g, '/');
const types = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.json': 'application/json',
  '.xml': 'application/xml',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.wasm': 'application/wasm',
  '.webmanifest': 'application/manifest+json',
  '.pf_meta': 'application/octet-stream',
  '.pf_index': 'application/octet-stream',
  '.pf_fragment': 'application/octet-stream',
  '.pagefind': 'application/octet-stream',
};

const send = (res, status, file) => {
  res.writeHead(status, { 'content-type': types[path.extname(file)] ?? 'application/octet-stream' });
  createReadStream(file).pipe(res);
};

createServer((req, res) => {
  const u = new URL(req.url ?? '/', 'http://localhost');
  let p;
  try {
    p = decodeURIComponent(u.pathname);
  } catch {
    p = u.pathname;
  }
  const notFound = () => send(res, 404, path.join(dist, '404.html'));
  if (!p.startsWith(base) && `${p}/` !== base) return notFound();
  const rel = p === base.slice(0, -1) ? '' : p.slice(base.length);
  const file = path.join(dist, rel);
  if (!file.startsWith(dist)) return notFound();
  if (existsSync(file) && statSync(file).isDirectory()) {
    if (!p.endsWith('/')) {
      res.writeHead(301, { location: `${p}/${u.search}` });
      return res.end();
    }
    const idx = path.join(file, 'index.html');
    return existsSync(idx) ? send(res, 200, idx) : notFound();
  }
  return existsSync(file) ? send(res, 200, file) : notFound();
}).listen(port, '127.0.0.1', () => console.log(`serving ${dist} at http://127.0.0.1:${port}${base}`));
