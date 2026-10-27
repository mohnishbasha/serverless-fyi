// Prefix root-relative Markdown links with the configured base path (staging lives under /serverless-fyi/).
import { visit } from 'unist-util-visit';

/** @param {{ base?: string }} [opts] */
export default function remarkBaseLinks(opts = {}) {
  const base = `/${opts.base ?? '/'}/`.replace(/\/{2,}/g, '/');
  return (tree) => {
    if (base === '/') return;
    visit(tree, ['link', 'definition'], (node) => {
      if (
        typeof node.url === 'string' &&
        node.url.startsWith('/') &&
        !node.url.startsWith('//') &&
        !node.url.startsWith(base)
      ) {
        node.url = base + node.url.slice(1);
      }
    });
  };
}
