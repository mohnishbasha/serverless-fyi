/** Blocks deploy when a published post still has TODO(owner) placeholders (docs/CONTENT_MIGRATION.md). */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { checkPostSource } from './lib/content-check';
import { Report } from './lib/dist';

const r = new Report('check-content');
const dir = 'src/content/posts';
let n = 0;
for (const folder of readdirSync(dir)) {
  const f = ['index.mdx', 'index.md'].map((x) => path.join(dir, folder, x)).find((x) => existsSync(x));
  if (!f) continue;
  n++;
  const { errors, warnings } = checkPostSource(folder, readFileSync(f, 'utf8'));
  errors.forEach((e) => r.error(e));
  warnings.forEach((w) => r.warn(w));
}
r.finish(`${n} posts OK`);
