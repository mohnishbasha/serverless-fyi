// Writes static redirect stubs for every `type: "redirect"` entry in migration/legacy-urls.json (ADR-007).
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { redirectStub, stubPath } from './redirect-stub.mjs';

/** @returns {import('astro').AstroIntegration} */
export default function legacyRedirects({ manifest = 'migration/legacy-urls.json' } = {}) {
  let site = 'https://www.serverless.fyi';
  let base = '/';
  return {
    name: 'legacy-redirects',
    hooks: {
      'astro:config:done': ({ config }) => {
        site = String(config.site ?? site);
        base = config.base ?? '/';
      },
      'astro:build:done': ({ dir, logger }) => {
        const dist = fileURLToPath(dir);
        const entries = JSON.parse(readFileSync(path.resolve(manifest), 'utf8'));
        let n = 0;
        for (const e of entries) {
          if (e.type !== 'redirect') continue;
          const file = stubPath(dist, e.old);
          // A stub left by a previous build is fine to replace; a real page is not.
          if (existsSync(file) && !/http-equiv="refresh"/.test(readFileSync(file, 'utf8'))) {
            throw new Error(`Redirect stub ${e.old} would overwrite a real page`);
          }
          mkdirSync(path.dirname(file), { recursive: true });
          writeFileSync(file, redirectStub({ to: e.new, site, base }));
          n++;
        }
        logger.info(`${n} redirect stubs written`);
      },
    },
  };
}
