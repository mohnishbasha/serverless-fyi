/** Download remote post images next to the post and rewrite references (ADR-017). */
import { createHash } from 'node:crypto';
import path from 'node:path';

export interface ImageIo {
  fetch(url: string): Promise<{ bytes: Uint8Array; contentType: string }>;
  write(file: string, bytes: Uint8Array): Promise<void>;
}

const LOCALIZE_HOSTS =
  /^https:\/\/(media\.beehiiv\.com|beehiiv-images-production\.s3[^/]*\.amazonaws\.com|images\.unsplash\.com)\//;
const BEEHIIV_RE =
  /https?:\/\/(?:media\.beehiiv\.com|beehiiv-images-production\.s3[^/\s]*\.amazonaws\.com)\/[^\s)"'<>]*/g;

const EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'image/avif': 'avif',
  'image/svg+xml': 'svg',
};

export function extFor(contentType: string, url: string): string {
  const fromType = EXT[contentType.split(';')[0]?.trim().toLowerCase() ?? ''];
  if (fromType) return fromType;
  const m = /\.([a-z0-9]{3,4})(?:$|[?#])/i.exec(new URL(url).pathname);
  const e = m?.[1]?.toLowerCase();
  return e === 'jpeg' ? 'jpg' : (e ?? 'bin');
}

export function shouldLocalize(url: string): boolean {
  return LOCALIZE_HOSTS.test(url);
}

/** Download one image to `<dir>/<prefix>-<hash>.<ext>` and return the relative reference. */
export async function localizeOne(url: string, dir: string, io: ImageIo, prefix = 'img'): Promise<string> {
  const { bytes, contentType } = await io.fetch(url);
  const hash = createHash('sha256').update(bytes).digest('hex').slice(0, 12);
  const name = `${prefix}-${hash}.${extFor(contentType, url)}`;
  await io.write(path.posix.join(dir, name), bytes);
  return `./${name}`;
}

export async function localizeImages(
  markdown: string,
  dir: string,
  io: ImageIo,
): Promise<{ markdown: string; downloaded: number }> {
  const urls = new Set<string>();
  for (const m of markdown.matchAll(/!\[[^\]]*]\((\S+?)\)/g)) if (m[1] && shouldLocalize(m[1])) urls.add(m[1]);

  const written = new Set<string>();
  const dedupIo: ImageIo = {
    fetch: io.fetch,
    write: async (file, bytes) => {
      if (written.has(file)) return;
      written.add(file);
      await io.write(file, bytes);
    },
  };

  const replacements = new Map<string, string>();
  for (const u of urls) replacements.set(u, await localizeOne(u, dir, dedupIo));

  const out = markdown.replace(/(!\[[^\]]*]\()(\S+?)(\))/g, (all, a: string, u: string, b: string) =>
    replacements.has(u) ? `${a}${replacements.get(u)}${b}` : all,
  );
  return { markdown: out, downloaded: urls.size };
}

export function findRemoteBeehiiv(text: string): string[] {
  return [...text.matchAll(BEEHIIV_RE)].map((m) => m[0]);
}
