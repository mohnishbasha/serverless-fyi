import { describe, expect, it } from 'vitest';
import { findRemoteBeehiiv, localizeImages } from '../../migration/lib/images';

const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 1, 2, 3]);
const jpg = new Uint8Array([0xff, 0xd8, 0xff, 9, 9]);

function fakeIo() {
  const written = new Map<string, Uint8Array>();
  const fetched: string[] = [];
  return {
    written,
    fetched,
    io: {
      fetch: async (url: string) => {
        fetched.push(url);
        return url.includes('.png')
          ? { bytes: png, contentType: 'image/png' }
          : { bytes: jpg, contentType: 'image/jpeg' };
      },
      write: async (file: string, bytes: Uint8Array) => {
        written.set(file, bytes);
      },
    },
  };
}

describe('localizeImages', () => {
  it('downloads Beehiiv and Unsplash images and rewrites them to hashed relative paths', async () => {
    const { io, written, fetched } = fakeIo();
    const md = [
      '![](https://media.beehiiv.com/uploads/asset/file/x/a.JPG)',
      '',
      '![Panel](https://beehiiv-images-production.s3.amazonaws.com/uploads/asset/file/abc/panel.png)',
      '',
      '![u](https://images.unsplash.com/photo-1?w=1080&utm_source=beehiiv)',
      '',
      '![keep](https://example.com/external.png)',
    ].join('\n');
    const out = await localizeImages(md, 'posts/x', io);
    expect(out.markdown).toMatch(/!\[]\(\.\/img-[0-9a-f]{12}\.jpg\)/);
    expect(out.markdown).toMatch(/!\[Panel]\(\.\/img-[0-9a-f]{12}\.png\)/);
    expect(out.markdown).toContain('![keep](https://example.com/external.png)');
    expect(out.downloaded).toBe(3);
    expect(written.size).toBe(2); // two identical jpg payloads dedupe to one file
    expect(fetched).toHaveLength(3);
    expect(findRemoteBeehiiv(out.markdown)).toEqual([]);
  });

  it('downloads the same URL only once', async () => {
    const { io, fetched } = fakeIo();
    const u = 'https://media.beehiiv.com/uploads/asset/file/x/a.JPG';
    await localizeImages(`![](${u})\n\n![](${u})`, 'd', io);
    expect(fetched).toHaveLength(1);
  });
});

describe('findRemoteBeehiiv', () => {
  it('finds any remaining Beehiiv-hosted URL', () => {
    expect(
      findRemoteBeehiiv('x https://media.beehiiv.com/a.png y https://beehiiv-images-production.s3.amazonaws.com/b.jpg'),
    ).toHaveLength(2);
    expect(findRemoteBeehiiv('nothing here')).toEqual([]);
  });
});
