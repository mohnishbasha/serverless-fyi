/** Build listmonk draft campaigns from published posts (Phase B). Never schedules or sends. */
const esc = (s: string) =>
  s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] ?? c);

export function renderEmail(
  template: string,
  p: { title: string; url: string; html: string; tldr?: string | undefined },
): string {
  const tldr = p.tldr
    ? `<div style="border-left:6px solid #d9921f;background:#fff4dc;padding:16px;margin:0 0 24px"><strong>TL;DR</strong><br>${esc(p.tldr)}</div>`
    : '';
  return template
    .replaceAll('{{title}}', esc(p.title))
    .replaceAll('{{url}}', esc(p.url))
    .replaceAll('{{tldr}}', tldr)
    .replaceAll('{{content}}', p.html);
}

export function campaignPayload(o: { title: string; slug: string; listId: number; body: string }) {
  return {
    name: o.title,
    subject: o.title,
    lists: [o.listId],
    type: 'regular' as const,
    content_type: 'html' as const,
    body: o.body,
    tags: ['auto-draft', `post:${o.slug}`],
  };
}
