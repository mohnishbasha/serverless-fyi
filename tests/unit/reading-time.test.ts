import { describe, expect, it } from 'vitest';
import { readingTime, wordCount } from '../../src/lib/reading-time';

describe('wordCount', () => {
  it('counts prose words and ignores markdown syntax and code fences', () => {
    const md = '## Heading\n\nOne two three [link](https://x.y) four.\n\n```ts\nconst a = 1;\n```\n';
    expect(wordCount(md)).toBe(6);
  });
  it('strips MDX/HTML tags and frontmatter-free input', () => {
    expect(wordCount('<YouTube id="x" />\n\nHello world')).toBe(2);
  });
});

describe('readingTime', () => {
  it('rounds up at 230 wpm with a minimum of 1 minute', () => {
    expect(readingTime('word')).toBe(1);
    expect(readingTime('word '.repeat(231))).toBe(2);
    expect(readingTime('word '.repeat(460))).toBe(2);
  });
});
