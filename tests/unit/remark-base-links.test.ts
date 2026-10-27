import remarkParse from 'remark-parse';
import remarkStringify from 'remark-stringify';
import { unified } from 'unified';
import { describe, expect, it } from 'vitest';
import remarkBaseLinks from '../../integrations/remark-base-links.mjs';

const run = async (md: string, base: string) =>
  String(await unified().use(remarkParse).use(remarkBaseLinks, { base }).use(remarkStringify).process(md));

describe('remarkBaseLinks', () => {
  it('prefixes root-relative links with the base', async () => {
    expect(await run('[a](/p/x/)', '/serverless-fyi/')).toBe('[a](/serverless-fyi/p/x/)\n');
  });
  it('leaves absolute, anchor, relative and already-based links alone', async () => {
    const md = '[a](https://e.com) [b](#x) [c](./y) [d](/serverless-fyi/p/x/)';
    expect(await run(md, '/serverless-fyi/')).toBe(`${md}\n`);
  });
  it('is a no-op with root base', async () => {
    expect(await run('[a](/p/x/)', '/')).toBe('[a](/p/x/)\n');
  });
});
