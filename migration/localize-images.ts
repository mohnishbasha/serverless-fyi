/**
 * Download every remote Beehiiv/Unsplash image (body + cover) into the post folder with hashed
 * names and rewrite references. Fails if any remote Beehiiv URL remains in src/content.
 */
import { readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { findRemoteBeehiiv, localizeImages, localizeOne, shouldLocalize } from './lib/images';
import { POSTS_DIR, RAW, imageIo, writeJson } from './lib/io';

async function main() {
  let total = 0;
  const leftovers: string[] = [];
  for (const slug of await readdir(POSTS_DIR)) {
    const dir = path.join(POSTS_DIR, slug);
    const file = path.join(dir, 'index.mdx');
    let src: string;
    try {
      src = await readFile(file, 'utf8');
    } catch {
      continue;
    }
    const end = src.indexOf('\n---\n', 4);
    let front = src.slice(0, end + 5);
    const body = src.slice(end + 5);

    const cover = /^cover: (\S+)$/m.exec(front)?.[1];
    if (cover && shouldLocalize(cover)) {
      const local = await localizeOne(cover, dir, imageIo, 'cover');
      front = front.replace(/^cover: \S+$/m, `cover: ${local}`);
      total++;
    }
    const res = await localizeImages(body, dir, imageIo);
    total += res.downloaded;
    const next = front + res.markdown;
    if (next !== src) await writeFile(file, next);
    leftovers.push(...findRemoteBeehiiv(next).map((u) => `${slug}: ${u}`));
    console.log(`${slug}: ${res.downloaded + (cover && shouldLocalize(cover) ? 1 : 0)} image(s)`);
  }
  await writeJson(path.join(RAW, 'images-report.json'), { downloaded: total });
  if (leftovers.length) {
    console.error(`Remote Beehiiv URLs remain:\n${leftovers.join('\n')}`);
    process.exit(1);
  }
  console.log(`\n${total} images localized; 0 remote Beehiiv URLs remain.`);
}

main().catch((e: unknown) => {
  console.error(e);
  process.exit(1);
});
