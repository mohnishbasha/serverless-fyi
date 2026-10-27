// Emits dist/CNAME only for indexable (production) builds so staging never claims the domain.
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

/** @returns {import('astro').AstroIntegration} */
export default function cname({ domain = 'www.serverless.fyi' } = {}) {
  return {
    name: 'cname',
    hooks: {
      'astro:build:done': ({ dir, logger }) => {
        if (process.env.PUBLIC_INDEXABLE !== 'true') return;
        writeFileSync(new URL('CNAME', dir), `${domain}\n`);
        logger.info(`CNAME → ${domain} (${fileURLToPath(dir)})`);
      },
    },
  };
}
