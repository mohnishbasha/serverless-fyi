/**
 * Legacy URL parity (docs/TEST_PLAN.md). 100% required.
 *   tsx scripts/validate-parity.ts          → checks dist/
 *   tsx scripts/validate-parity.ts --live [url] → fetches every legacy URL on the live site
 */
import { checkParity, type Entry } from './lib/parity';
import { BASE, exists, fileFor, read, Report, SITE_URL } from './lib/dist';

const entries = JSON.parse(read('migration/legacy-urls.json')) as Entry[];
const r = new Report('validate-parity');

if (process.argv.includes('--live')) {
  const origin = (process.argv[process.argv.indexOf('--live') + 1] ?? SITE_URL).replace(/\/+$/, '');
  for (const e of entries) {
    const res = await fetch(origin + e.old, { redirect: 'follow' });
    if (res.status !== 200) r.error(`${e.old} → ${res.status}`);
    else if (e.type === 'redirect' && !(await res.text()).includes(e.new)) r.error(`${e.old}: stub missing ${e.new}`);
  }
  r.finish(`${entries.length}/${entries.length} legacy URLs return 200 on ${origin}`);
}

for (const msg of checkParity(entries, { exists: (p) => exists(fileFor(p)), read: (p) => read(fileFor(p)) }, BASE))
  r.error(msg);
r.finish(
  `${entries.length}/${entries.length} legacy URLs resolve (${entries.filter((e) => e.type === 'redirect').length} via stubs)`,
);
