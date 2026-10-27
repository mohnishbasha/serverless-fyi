/** Content guard: blocks TODO(owner) in published posts, slug/folder mismatch; warns on missing cover. */
export function checkPostSource(folder: string, src: string): { errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  const fm = /^---\n([\s\S]*?)\n---/.exec(src)?.[1] ?? '';
  const draft = /^draft:\s*true\s*$/m.test(fm);
  const slug = /^slug:\s*"?([^"\n]+)"?\s*$/m.exec(fm)?.[1]?.trim();
  if (slug && slug !== folder) errors.push(`${folder}: slug "${slug}" must equal the folder name`);
  if (!draft && src.includes('TODO(owner)'))
    errors.push(`${folder}: contains TODO(owner) — fill it in or set draft: true`);
  if (!draft && /^\s+- todo-owner\s*$/m.test(fm)) errors.push(`${folder}: placeholder tag todo-owner`);
  if (!/^cover:/m.test(fm)) warnings.push(`${folder}: no cover image (recommended for social cards and LCP)`);
  return { errors, warnings };
}
