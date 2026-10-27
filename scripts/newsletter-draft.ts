/**
 * Create listmonk DRAFT campaigns for the given post files (called by .github/workflows/newsletter-draft.yml).
 * Env: LISTMONK_URL, LISTMONK_LIST_ID, LISTMONK_API_USER, LISTMONK_API_TOKEN, SITE_URL.
 */
import { readFileSync } from 'node:fs';
import { markdownToHtml, mdxToMarkdown } from '../src/lib/markdown';
import { campaignPayload, renderEmail } from './lib/newsletter-draft';

const { LISTMONK_URL, LISTMONK_LIST_ID, LISTMONK_API_USER, LISTMONK_API_TOKEN } = process.env;
const SITE = (process.env.SITE_URL ?? 'https://www.serverless.fyi').replace(/\/+$/, '');
if (!LISTMONK_URL || !LISTMONK_LIST_ID || !LISTMONK_API_USER || !LISTMONK_API_TOKEN) {
  console.error('Missing LISTMONK_* configuration; skipping.');
  process.exit(0);
}
const template = readFileSync('email/template.html', 'utf8');
const auth = `token ${LISTMONK_API_USER}:${LISTMONK_API_TOKEN}`;

for (const file of process.argv.slice(2)) {
  const src = readFileSync(file, 'utf8');
  const [, fm = '', body = ''] = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/.exec(src) ?? [];
  if (/^draft:\s*true/m.test(fm)) continue;
  const get = (k: string) => new RegExp(`^${k}:\\s*"?(.*?)"?\\s*$`, 'm').exec(fm)?.[1];
  const title = get('title') ?? 'Untitled';
  const slug = get('slug') ?? '';
  const url = `${SITE}/p/${slug}/`;
  const tldr = /^aeoPending:\s*true/m.test(fm) ? undefined : get('tldr');
  // Images in emails must be absolute; fall back to the web version for relative ones.
  const md = mdxToMarkdown(body, new Map(), { site: SITE, base: '/' }).replace(
    /!\[([^\]]*)]\(\.\/[^)]+\)/g,
    `[Image: $1](${url})`,
  );
  const html = renderEmail(template, { title, url, tldr, html: await markdownToHtml(md) });
  const res = await fetch(`${LISTMONK_URL.replace(/\/+$/, '')}/api/campaigns`, {
    method: 'POST',
    headers: { authorization: auth, 'content-type': 'application/json' },
    body: JSON.stringify(campaignPayload({ title, slug, listId: Number(LISTMONK_LIST_ID), body: html })),
  });
  if (!res.ok) throw new Error(`listmonk ${res.status}: ${await res.text()}`);
  console.log(`Draft campaign created for ${slug} — review and send it in listmonk.`);
}
