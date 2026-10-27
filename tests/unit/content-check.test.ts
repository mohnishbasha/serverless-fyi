import { describe, expect, it } from 'vitest';
import { checkPostSource } from '../../scripts/lib/content-check';

const fm = (extra: string) => `---\ntitle: "T"\nslug: t\npubDate: 2025-01-01\n${extra}\n---\n\nBody.\n`;

describe('checkPostSource', () => {
  it('blocks TODO(owner) in a published post', () => {
    const r = checkPostSource('t', fm('tldr: "TODO(owner): write"\ncover: ./c.jpg'));
    expect(r.errors[0]).toMatch(/TODO\(owner\)/);
  });
  it('blocks the scaffold placeholder tag in a published post', () => {
    const r = checkPostSource('t', fm('tags:\n  - todo-owner\ncover: ./c.jpg'));
    expect(r.errors.join()).toMatch(/todo-owner/);
  });
  it('allows TODO(owner) in drafts', () => {
    expect(checkPostSource('t', fm('draft: true\ntldr: "TODO(owner)"')).errors).toEqual([]);
  });
  it('warns when there is no cover', () => {
    expect(checkPostSource('t', fm('aeoPending: true')).warnings[0]).toMatch(/cover/);
  });
  it('errors when the slug does not match the folder', () => {
    expect(checkPostSource('other', fm('cover: ./c.jpg')).errors[0]).toMatch(/slug/);
  });
});
