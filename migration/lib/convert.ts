/**
 * Beehiiv post HTML → clean MDX body. Rules: docs/CONTENT_MIGRATION.md § HTML→Markdown.
 * Golden tests: migration/fixtures/*.html → *.expected.md (tests/unit/html-to-md.test.ts).
 * Never rewrites prose: only structure, chrome, links and whitespace are touched.
 */
import type { Element, ElementContent, Root as HastRoot, RootContent } from 'hast';
import { toString as hastToString } from 'hast-util-to-string';
import type { Root as MdastRoot } from 'mdast';
import rehypeParse from 'rehype-parse';
import rehypeRemark from 'rehype-remark';
import remarkGfm from 'remark-gfm';
import remarkMdx from 'remark-mdx';
import remarkStringify from 'remark-stringify';
import { unified } from 'unified';
import { SKIP, visit } from 'unist-util-visit';
import { normalizeTag } from '../../src/lib/tags';

export interface ConvertStats {
  embeds: number;
  images: number;
  chromeRemoved: number;
  internalLinks: number;
  utmStripped: number;
  codeBlocks: number;
  warnings: string[];
}

const SITE_HOSTS = new Set(['www.serverless.fyi', 'serverless.fyi']);
const CHROME_RE = /(subscribe|bh__|share|poll|survey|beehiiv__footer|web-header|recommend)/i;
const DROP_TAGS = new Set([
  'style',
  'script',
  'link',
  'meta',
  'svg',
  'noscript',
  'form',
  'input',
  'button',
  'select',
  'textarea',
]);

/** Strip utm_* params, Beehiiv image transforms and cache busters; make internal links root-relative. */
export function cleanUrl(raw: string): { url: string; utm: boolean; internal: boolean } {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return { url: raw, utm: false, internal: false };
  }
  let utm = false;
  for (const k of [...u.searchParams.keys()]) {
    if (k.toLowerCase().startsWith('utm_')) {
      u.searchParams.delete(k);
      utm = true;
    }
  }
  if (u.hostname === 'media.beehiiv.com' || u.hostname.startsWith('beehiiv-images-production')) {
    u.pathname = u.pathname.replace(/^\/cdn-cgi\/image\/[^/]+\//, '/');
    u.searchParams.delete('t');
  }
  if (SITE_HOSTS.has(u.hostname) && u.pathname !== '/' && u.pathname !== '') {
    let p = u.pathname.replace(/\/+$/, '');
    const tag = /^\/t\/(.+)$/.exec(p);
    if (tag?.[1]) p = `/t/${normalizeTag(decodeURIComponent(tag[1]))}`;
    const qs = u.searchParams.toString();
    return { url: `${p}/${qs ? `?${qs}` : ''}${u.hash}`, utm, internal: true };
  }
  let out = u.toString();
  if (u.pathname === '/' && !u.search && !u.hash && !raw.replace(/[?#].*$/, '').endsWith('/'))
    out = out.replace(/\/$/, '');
  if (!u.search) out = out.replace(/\?$/, '');
  return { url: out, utm, internal: false };
}

export function detectLanguage(code: string): string {
  const t = code.trim();
  if (/^[[{]/.test(t)) {
    try {
      JSON.parse(t);
      return 'json';
    } catch {
      /* not JSON */
    }
  }
  if (/^FROM\s+\S+/.test(t)) return 'dockerfile';
  if (/^\s*(resource|data|provider|variable|module|terraform|output)\s+"/m.test(t)) return 'hcl';
  if (/^\s*(from\s+\S+\s+import\b|import\s+\w+|def\s+\w+\(|class\s+\w+.*:|print\()/m.test(t)) return 'python';
  if (
    /^\s*(\$\s|sudo\s|dig\s|docker\s|kubectl\s|curl\s|pip3?\s|npm\s|pnpm\s|git\s|pack\s|aws\s|terraform\s|helm\s|brew\s|apt(-get)?\s)/m.test(
      t,
    )
  )
    return 'bash';
  return 'text';
}

const isEl = (n: unknown, tag?: string): n is Element =>
  !!n && (n as Element).type === 'element' && (!tag || (n as Element).tagName === tag);

const classes = (el: Element): string => {
  const c = el.properties?.className;
  return Array.isArray(c) ? c.join(' ') : typeof c === 'string' ? c : '';
};

const el = (tagName: string, properties: Element['properties'] = {}, children: ElementContent[] = []): Element => ({
  type: 'element',
  tagName,
  properties,
  children,
});

function findById(tree: HastRoot, id: string): Element | null {
  let found: Element | null = null;
  visit(tree, 'element', (node: Element) => {
    if (!found && node.properties?.id === id) {
      found = node;
      return SKIP;
    }
    return undefined;
  });
  return found;
}

function youtubeId(src: string): string | null {
  const m = /(?:youtube(?:-nocookie)?\.com\/(?:embed\/|watch\?v=)|youtu\.be\/)([\w-]{11})/.exec(src);
  return m?.[1] ?? null;
}

function transform(tree: HastRoot, stats: ConvertStats): void {
  // 1. Remove chrome and non-content elements; convert embeds and separators.
  visit(tree, 'element', (node: Element, index, parent) => {
    if (!parent || index === undefined) return undefined;
    const cls = classes(node);
    const id = String(node.properties?.id ?? '');
    const remove = () => {
      (parent.children as RootContent[]).splice(index, 1);
      return [SKIP, index] as [typeof SKIP, number];
    };

    if (DROP_TAGS.has(node.tagName)) {
      if (['form', 'button'].includes(node.tagName)) stats.chromeRemoved++;
      return remove();
    }
    if (CHROME_RE.test(cls) || CHROME_RE.test(id)) {
      stats.chromeRemoved++;
      return remove();
    }
    if (node.tagName === 'img') {
      const w = String(node.properties?.width ?? '');
      const h = String(node.properties?.height ?? '');
      if (w === '1' && h === '1') {
        stats.chromeRemoved++;
        return remove();
      }
    }
    if (/^powered by beehiiv$/i.test(hastToString(node).trim()) && ['p', 'div', 'span', 'a'].includes(node.tagName)) {
      stats.chromeRemoved++;
      return remove();
    }
    if (/^h[1-6]$/.test(node.tagName) && hastToString(node).trim() === '') return remove();
    if (node.tagName === 'iframe') {
      const yt = youtubeId(String(node.properties?.src ?? ''));
      if (yt) {
        stats.embeds++;
        parent.children[index] = el('x-embed', { component: 'YouTube', embedId: yt });
        return SKIP;
      }
      stats.warnings.push(`Removed unsupported iframe: ${String(node.properties?.src ?? '')}`);
      return remove();
    }
    if (node.tagName === 'blockquote' && /twitter-tweet/.test(cls)) {
      const html = JSON.stringify(node);
      const tweet = /(?:twitter|x)\.com\/[^/"]+\/status\/(\d+)/.exec(html)?.[1];
      if (tweet) {
        stats.embeds++;
        parent.children[index] = el('x-embed', { component: 'Tweet', embedId: tweet });
        return SKIP;
      }
    }
    const style = String(node.properties?.style ?? '');
    if (node.tagName === 'div' && /border-top/.test(style) && hastToString(node).trim() === '') {
      parent.children[index] = el('hr');
      return SKIP;
    }
    return undefined;
  });

  // 2. Structural normalisation.
  let prevLevel = 1;
  visit(tree, 'element', (node: Element, index, parent) => {
    const h = /^h([1-6])$/.exec(node.tagName);
    if (h) {
      const wanted = Math.max(2, Number(h[1]));
      const level = Math.min(wanted, prevLevel + 1);
      prevLevel = level;
      node.tagName = `h${level}`;
      node.children = unwrap(node.children, ['b', 'strong']);
      return undefined;
    }
    if (node.tagName === 'a') {
      const href = String(node.properties?.href ?? '');
      if (href) {
        const c = cleanUrl(href);
        if (c.utm) stats.utmStripped++;
        if (c.internal) stats.internalLinks++;
        node.properties = { href: c.url };
      }
      if (/\bbutton\b/.test(classes(node)) && parent && index !== undefined && !isEl(parent, 'p')) {
        parent.children[index] = el('p', {}, [node]);
      }
      return undefined;
    }
    if (node.tagName === 'img') {
      stats.images++;
      const src = cleanUrl(String(node.properties?.src ?? '')).url;
      node.properties = { src, alt: String(node.properties?.alt ?? '') };
      return SKIP;
    }
    if (node.tagName === 'pre') {
      stats.codeBlocks++;
      const code = node.children.find((c) => isEl(c, 'code'));
      const text = hastToString(code ?? node)
        .replace(/[ \t]+$/gm, '')
        .replace(/\n+$/, '');
      const lang =
        /language-([\w-]+)/.exec(classes(node))?.[1] ??
        (code ? /language-([\w-]+)/.exec(classes(code))?.[1] : undefined) ??
        detectLanguage(text);
      node.properties = {};
      node.children = [el('code', { className: [`language-${lang}`] }, [{ type: 'text', value: text }])];
      return SKIP;
    }
    if (node.tagName === 'td' || node.tagName === 'th') {
      node.children = unwrap(node.children, ['p']);
      return undefined;
    }
    if (node.tagName === 'figcaption') {
      node.tagName = 'p';
      node.children = [el('em', {}, node.children)];
      return undefined;
    }
    return undefined;
  });

  // 3. Drop empty paragraphs and normalise non-breaking spaces outside code.
  visit(tree, (node, index, parent) => {
    if (isEl(node, 'pre')) return SKIP;
    if (node.type === 'text') node.value = node.value.replace(/\u00a0/g, ' ');
    if (isEl(node, 'p') && parent && index !== undefined && hastToString(node).trim() === '' && !hasMedia(node)) {
      (parent.children as RootContent[]).splice(index, 1);
      return [SKIP, index] as [typeof SKIP, number];
    }
    return undefined;
  });
}

function hasMedia(node: Element): boolean {
  let media = false;
  visit(node, 'element', (n: Element) => {
    if (n.tagName === 'img' || n.tagName === 'x-embed') media = true;
  });
  return media;
}

function unwrap(children: ElementContent[], tags: string[]): ElementContent[] {
  return children.flatMap((c) => (isEl(c) && tags.includes(c.tagName) ? unwrap(c.children, tags) : [c]));
}

export async function convertHtml(html: string): Promise<{ markdown: string; stats: ConvertStats }> {
  const stats: ConvertStats = {
    embeds: 0,
    images: 0,
    chromeRemoved: 0,
    internalLinks: 0,
    utmStripped: 0,
    codeBlocks: 0,
    warnings: [],
  };
  const parsed = unified().use(rehypeParse, { fragment: true }).parse(html);
  const container = findById(parsed, 'content-blocks');
  const hast: HastRoot = container ? { type: 'root', children: container.children } : parsed;
  transform(hast, stats);

  const mdast = (await unified()
    .use(rehypeRemark, {
      handlers: {
        'x-embed': (_state, node: Element) => ({
          type: 'mdxJsxFlowElement',
          name: String(node.properties?.component),
          attributes: [{ type: 'mdxJsxAttribute', name: 'id', value: String(node.properties?.embedId) }],
          children: [],
        }),
      },
    })
    .run(hast)) as MdastRoot;

  // Beehiiv wraps every <li> body in <p>; keep lists tight unless an item has several blocks.
  visit(mdast, (node) => {
    if (node.type === 'list') {
      const loose = node.children.some((li) => li.children.length > 1);
      node.spread = loose;
      for (const li of node.children) li.spread = li.children.length > 1;
    }
  });

  const markdown = unified()
    .use(remarkGfm)
    .use(remarkMdx)
    .use(remarkStringify, {
      bullet: '-',
      emphasis: '_',
      strong: '*',
      fence: '`',
      fences: true,
      rule: '-',
      listItemIndent: 'one',
      incrementListMarker: true,
    })
    .stringify(mdast);

  return { markdown: tidy(String(markdown)), stats };
}

/** Whitespace-only cleanup of the serialised Markdown. */
function tidy(md: string): string {
  return `${md
    .replace(/[ \t]+$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()}\n`;
}
