/** Agent-readable Markdown (twins, llms-full.txt) and feed HTML from a post's MDX body. */
import rehypeStringify from 'rehype-stringify';
import remarkGfm from 'remark-gfm';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import { unified } from 'unified';

interface Ctx {
  site: string;
  base: string;
}

const fileUrl = (p: string, c: Ctx) =>
  /^https?:\/\//.test(p) ? p : c.site.replace(/\/+$/, '') + `/${c.base}/${p}`.replace(/\/{2,}/g, '/');

/**
 * Plain Markdown with absolute URLs.
 * @param images map of relative image refs (./img-x.jpg) → built asset URL (/_astro/…)
 */
export function mdxToMarkdown(body: string, images: Map<string, string>, c: Ctx): string {
  return body
    .replace(/<YouTube\s+id="([\w-]+)"\s*\/>/g, '[Watch on YouTube](https://www.youtube.com/watch?v=$1)')
    .replace(/<Tweet\s+id="(\d+)"\s*\/>/g, '[View post on X](https://x.com/i/status/$1)')
    .replace(/(!\[[^\]]*]\()(\.\/[^)\s]+)(\))/g, (all, a: string, ref: string, b: string) => {
      const built = images.get(ref);
      return built ? `${a}${fileUrl(built, c)}${b}` : all;
    })
    .replace(
      /(?<!!)(\[[^\]]*]\()(\/[^)\s]*)(\))/g,
      (_all, a: string, p: string, b: string) => `${a}${fileUrl(p, c)}${b}`,
    )
    .replace(/\\([{}<])/g, '$1');
}

export async function markdownToHtml(md: string): Promise<string> {
  const file = await unified().use(remarkParse).use(remarkGfm).use(remarkRehype).use(rehypeStringify).process(md);
  return String(file);
}

export function twinDocument(
  meta: {
    title: string;
    url: string;
    description: string;
    pubDate: Date;
    updatedDate?: Date | undefined;
    tags: string[];
    author: string;
  },
  markdown: string,
): string {
  const lines = [
    '---',
    `title: ${JSON.stringify(meta.title)}`,
    `url: ${meta.url}`,
    `author: ${meta.author}`,
    `published: ${meta.pubDate.toISOString().slice(0, 10)}`,
    ...(meta.updatedDate ? [`updated: ${meta.updatedDate.toISOString().slice(0, 10)}`] : []),
    `tags: [${meta.tags.join(', ')}]`,
    `description: ${JSON.stringify(meta.description)}`,
    '---',
    '',
    `# ${meta.title}`,
    '',
    markdown.trim(),
    '',
  ];
  return lines.join('\n');
}
