/** Shared filesystem/network helpers for the migration CLIs. */
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { USER_AGENT } from './beehiiv';
import type { ImageIo } from './images';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const RAW = path.join(ROOT, 'migration/raw');
export const POSTS_DIR = path.join(ROOT, 'src/content/posts');

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

let last = 0;
/** Polite fetch: at most 1 request/second, identified UA, retries on 429/5xx. */
export async function politeFetch(url: string, init: RequestInit = {}, tries = 3): Promise<Response> {
  const wait = last + 1000 - Date.now();
  if (wait > 0) await sleep(wait);
  last = Date.now();
  const res = await fetch(url, { ...init, headers: { 'user-agent': USER_AGENT, ...(init.headers ?? {}) } });
  if ((res.status === 429 || res.status >= 500) && tries > 1) {
    await sleep(2000);
    return politeFetch(url, init, tries - 1);
  }
  return res;
}

export async function writeJson(file: string, data: unknown): Promise<void> {
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, `${JSON.stringify(data, null, 2)}\n`);
}

export async function readJson<T>(file: string): Promise<T> {
  return JSON.parse(await readFile(file, 'utf8')) as T;
}

export async function listJson(dir: string): Promise<string[]> {
  return (await readdir(dir)).filter((f) => f.endsWith('.json')).map((f) => path.join(dir, f));
}

export const imageIo: ImageIo = {
  async fetch(url) {
    const res = await politeFetch(url);
    if (!res.ok) throw new Error(`GET ${url} → ${res.status}`);
    return { bytes: new Uint8Array(await res.arrayBuffer()), contentType: res.headers.get('content-type') ?? '' };
  },
  async write(file, bytes) {
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, await shrink(bytes));
  },
};

/** Downscale very large raster originals (meetup photos) to ≤ 1600 px wide; astro:assets does the rest. */
async function shrink(bytes: Uint8Array): Promise<Uint8Array> {
  const sharp = (await import('sharp')).default;
  try {
    const img = sharp(bytes, { failOn: 'none' });
    const meta = await img.metadata();
    if (!meta.width || meta.width <= 1600 || (meta.format !== 'jpeg' && meta.format !== 'png')) return bytes;
    const out = await img
      .rotate()
      .resize({ width: 1600 })
      .toFormat(meta.format === 'png' ? 'png' : 'jpeg', { quality: 82 })
      .toBuffer();
    return new Uint8Array(out);
  } catch {
    return bytes;
  }
}
