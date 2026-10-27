import { describe, expect, it } from 'vitest';
import { checkParity } from '../../scripts/lib/parity';

const files: Record<string, string> = {
  '/p/a/': '<h1>A</h1>',
  '/t/distributed-systems/': 'tag',
  '/t/distributed~systems/': '<meta http-equiv="refresh" content="0; url=/t/distributed-systems/">',
  '/login/': '<meta http-equiv="refresh" content="0; url=/elsewhere/">',
};
const io = { exists: (p: string) => p in files, read: (p: string) => files[p] ?? '' };

describe('checkParity', () => {
  it('passes for same pages and correct stubs', () => {
    expect(
      checkParity(
        [
          { old: '/p/a', new: '/p/a/', type: 'same' },
          { old: '/t/distributed~systems', new: '/t/distributed-systems/', type: 'redirect' },
        ],
        io,
      ),
    ).toEqual([]);
  });

  it('fails for missing pages, wrong stub targets and missing targets', () => {
    const errors = checkParity(
      [
        { old: '/p/missing', new: '/p/missing/', type: 'same' },
        { old: '/login', new: '/subscribe/', type: 'redirect' },
      ],
      io,
    );
    expect(errors).toHaveLength(3);
    expect(errors.join('\n')).toMatch(/\/p\/missing/);
    expect(errors.join('\n')).toMatch(/does not redirect to \/subscribe\//);
    expect(errors.join('\n')).toMatch(/redirect target \/subscribe\/ does not exist/);
  });

  it('expects base-prefixed stub targets on staging', () => {
    const staged: Record<string, string> = {
      ...files,
      '/x/': '<meta http-equiv="refresh" content="0; url=/serverless-fyi/p/a/">',
    };
    const sio = { exists: (p: string) => p in staged, read: (p: string) => staged[p] ?? '' };
    expect(checkParity([{ old: '/x', new: '/p/a/', type: 'redirect' }], sio, '/serverless-fyi/')).toEqual([]);
  });
});
