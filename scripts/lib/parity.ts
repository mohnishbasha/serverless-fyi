/** Legacy URL parity: every manifest entry must resolve in dist (page or redirect stub to an existing page). */
export interface Entry {
  old: string;
  new: string;
  type: 'same' | 'redirect';
}

export interface ParityIo {
  exists(urlPath: string): boolean;
  read(urlPath: string): string;
}

const asDir = (p: string) => (p === '/' ? '/' : `${p.replace(/\/+$/, '')}/`);

export function checkParity(entries: Entry[], io: ParityIo, base = '/'): string[] {
  const errors: string[] = [];
  const b = `/${base}/`.replace(/\/{2,}/g, '/');
  for (const e of entries) {
    const oldDir = asDir(e.old);
    if (!io.exists(oldDir)) {
      errors.push(`${e.old}: no ${oldDir}index.html in dist`);
      continue;
    }
    if (e.type === 'redirect') {
      const html = io.read(oldDir);
      const target = `${b}${e.new.replace(/^\//, '')}`;
      if (!html.includes(`url=${target}"`)) errors.push(`${e.old}: stub does not redirect to ${target}`);
      if (!io.exists(e.new)) errors.push(`${e.old}: redirect target ${e.new} does not exist`);
    } else if (asDir(e.new) !== oldDir) {
      errors.push(`${e.old}: type "same" but new path differs (${e.new})`);
    }
  }
  return errors;
}
