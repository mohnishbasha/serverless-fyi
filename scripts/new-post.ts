/** pnpm new-post "Title" → src/content/posts/<slug>/index.mdx (draft). */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { scaffoldPost, slugify } from './lib/new-post';

const title = process.argv.slice(2).join(' ').trim();
if (!title) {
  console.error('Usage: pnpm new-post "Post title"');
  process.exit(2);
}
const dir = path.join('src/content/posts', slugify(title));
const file = path.join(dir, 'index.mdx');
if (existsSync(file)) {
  console.error(`${file} already exists`);
  process.exit(1);
}
mkdirSync(dir, { recursive: true });
writeFileSync(file, scaffoldPost(title));
console.log(
  `Created ${file}\nNext: write it, replace every TODO(owner), add a cover + coverAlt, set draft: false, run pnpm check.`,
);
