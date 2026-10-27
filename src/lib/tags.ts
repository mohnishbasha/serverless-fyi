/** Tag normalisation. Beehiiv encodes "-" in tag slugs as "~" (e.g. /t/distributed~systems). */

const ACRONYMS: Record<string, string> = {
  dns: 'DNS',
  iac: 'IaC',
  pqca: 'PQCA',
  qsbs: 'QSBS',
  rfm: 'RFM',
  xrp: 'XRP',
  ai: 'AI',
  aws: 'AWS',
  sre: 'SRE',
  oci: 'OCI',
};

export function normalizeTag(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[~_\s]+/g, '-')
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '');
}

/** The legacy Beehiiv "~" form of a tag, or null when it would be identical. */
export function legacyTagSlug(tag: string): string | null {
  return tag.includes('-') ? tag.replace(/-/g, '~') : null;
}

export function tagLabel(tag: string): string {
  return tag
    .split('-')
    .map((w) => ACRONYMS[w] ?? w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}
