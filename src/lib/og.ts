/** Build-time Open Graph cards (1200×630) with satori + resvg. No runtime cost. */
import { Resvg } from '@resvg/resvg-js';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import satori from 'satori';
import { SITE } from './site';

const require = createRequire(import.meta.url);
const font = (w: 400 | 700) => readFileSync(require.resolve(`@fontsource/inter/files/inter-latin-${w}-normal.woff`));
let fonts: Array<{ name: string; data: Buffer; weight: 400 | 700; style: 'normal' }> | undefined;

type El = { type: string; props: Record<string, unknown> };
const h = (type: string, style: Record<string, unknown>, children?: unknown): El => ({
  type,
  props: { style, children },
});

export async function renderOg(o: {
  title: string;
  kicker?: string;
  footer?: string;
}): Promise<Uint8Array<ArrayBuffer>> {
  fonts ??= [
    { name: 'Inter', data: font(400), weight: 400, style: 'normal' },
    { name: 'Inter', data: font(700), weight: 700, style: 'normal' },
  ];
  const size = o.title.length > 70 ? 54 : o.title.length > 40 ? 64 : 76;
  const tree = h(
    'div',
    {
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      padding: '72px 80px',
      background: 'linear-gradient(135deg, #0b2f4a 0%, #0b4f7a 60%, #12679c 100%)',
      color: '#ffffff',
      fontFamily: 'Inter',
    },
    [
      h('div', { display: 'flex', alignItems: 'center', gap: '18px', fontSize: 30, fontWeight: 700 }, [
        h('div', { display: 'flex', width: 18, height: 18, borderRadius: 9, background: '#f3b65a' }),
        h('div', { display: 'flex' }, o.kicker ?? SITE.name),
      ]),
      h(
        'div',
        { display: 'flex', fontSize: size, fontWeight: 700, lineHeight: 1.12, letterSpacing: '-0.02em' },
        o.title,
      ),
      h('div', { display: 'flex', justifyContent: 'space-between', fontSize: 28, color: '#cfe6f7' }, [
        h('div', { display: 'flex' }, o.footer ?? SITE.tagline),
        h('div', { display: 'flex' }, 'serverless.fyi'),
      ]),
    ],
  );
  const svg = await satori(tree as unknown as Parameters<typeof satori>[0], { width: 1200, height: 630, fonts });
  return new Resvg(svg, { fitTo: { mode: 'width', value: 1200 } }).render().asPng().slice();
}
