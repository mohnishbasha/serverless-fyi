/** Helpers shared by the dist/ validators. */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

export const DIST = path.resolve(process.env.DIST_DIR ?? 'dist');
export const SITE_URL = (process.env.SITE_URL ?? 'https://www.serverless.fyi').replace(/\/+$/, '');
export const BASE = `/${process.env.BASE_PATH ?? '/'}/`.replace(/\/{2,}/g, '/');
export const INDEXABLE = process.env.PUBLIC_INDEXABLE === 'true';

export function walk(dir: string, filter: (f: string) => boolean = () => true): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const f = path.join(dir, name);
    if (statSync(f).isDirectory()) out.push(...walk(f, filter));
    else if (filter(f)) out.push(f);
  }
  return out;
}

/** dist file → site-relative URL path (without base). */
export function urlPathOf(file: string): string {
  const rel = `/${path.relative(DIST, file).split(path.sep).join('/')}`;
  return rel.endsWith('/index.html') ? rel.slice(0, -'index.html'.length) : rel;
}

/** Site-relative path (no base) → dist file. */
export function fileFor(urlPath: string): string {
  const clean = decodeURIComponent(urlPath.split(/[?#]/)[0] ?? '/');
  return clean.endsWith('/') ? path.join(DIST, clean, 'index.html') : path.join(DIST, clean);
}

export const read = (f: string) => readFileSync(f, 'utf8');
export const exists = existsSync;

export const isStub = (html: string) =>
  /<meta http-equiv="refresh"/i.test(html) && /<meta name="robots" content="noindex">/.test(html);

export class Report {
  errors: string[] = [];
  warnings: string[] = [];
  constructor(readonly name: string) {}
  error(msg: string) {
    this.errors.push(msg);
  }
  warn(msg: string) {
    this.warnings.push(msg);
  }
  finish(okMsg: string): never {
    for (const w of this.warnings) console.warn(`warn  ${w}`);
    for (const e of this.errors) console.error(`FAIL  ${e}`);
    if (this.errors.length) {
      console.error(`\n${this.name}: ${this.errors.length} error(s)`);
      process.exit(1);
    }
    console.log(`${this.name}: ${okMsg}`);
    process.exit(0);
  }
}
