// Builds the Pagefind static search index into dist/pagefind after the Astro build.
import { fileURLToPath } from 'node:url';

/** @returns {import('astro').AstroIntegration} */
export default function pagefind() {
  return {
    name: 'pagefind',
    hooks: {
      'astro:build:done': async ({ dir, logger }) => {
        const { createIndex, close } = await import('pagefind');
        const { index, errors } = await createIndex({});
        if (!index) throw new Error(`pagefind: ${errors.join(', ')}`);
        const site = fileURLToPath(dir);
        const { page_count } = await index.addDirectory({ path: site });
        await index.writeFiles({ outputPath: `${site.replace(/\/$/, '')}/pagefind` });
        await close();
        logger.info(`indexed ${page_count} pages`);
      },
    },
  };
}
