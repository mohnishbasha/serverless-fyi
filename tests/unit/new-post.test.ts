import { describe, expect, it } from 'vitest';
import { scaffoldPost, slugify } from '../../scripts/lib/new-post';

describe('slugify', () => {
  it('kebab-cases titles and drops punctuation', () => {
    expect(slugify('What is a Vector Clock?')).toBe('what-is-a-vector-clock');
    expect(slugify('  Kafka & Flink: 2026 edition ')).toBe('kafka-flink-2026-edition');
    expect(slugify('Ünïcode café')).toBe('unicode-cafe');
  });
});

describe('scaffoldPost', () => {
  const mdx = scaffoldPost('What is a Vector Clock?', new Date('2026-10-27T12:00:00Z'));
  it('produces frontmatter with TODO(owner) markers and draft: true', () => {
    expect(mdx).toContain('title: "What is a Vector Clock?"');
    expect(mdx).toContain('slug: what-is-a-vector-clock');
    expect(mdx).toContain('pubDate: 2026-10-27');
    expect(mdx).toContain('draft: true');
    expect(mdx).toContain('tldr: "TODO(owner)');
    expect(mdx).toMatch(/\n## /);
  });
});
