import { describe, expect, it } from 'vitest';
import { legacyTagSlug, normalizeTag, tagLabel } from '../../src/lib/tags';

describe('normalizeTag', () => {
  it('converts Beehiiv ~ encoding to hyphens', () => {
    expect(normalizeTag('distributed~systems')).toBe('distributed-systems');
  });
  it('kebab-cases display names', () => {
    expect(normalizeTag('Apache Flink')).toBe('apache-flink');
    expect(normalizeTag('  Object_Storage ')).toBe('object-storage');
    expect(normalizeTag('AI & ML')).toBe('ai-ml');
  });
  it('is idempotent', () => {
    expect(normalizeTag(normalizeTag('distributed~systems'))).toBe('distributed-systems');
  });
});

describe('legacyTagSlug', () => {
  it('round-trips with normalizeTag', () => {
    expect(legacyTagSlug('distributed-systems')).toBe('distributed~systems');
    expect(normalizeTag(legacyTagSlug('apache-pulsar') ?? '')).toBe('apache-pulsar');
  });
  it('returns null when there is no hyphen', () => {
    expect(legacyTagSlug('dns')).toBeNull();
  });
});

describe('tagLabel', () => {
  it('uses known acronyms', () => {
    expect(tagLabel('pqca')).toBe('PQCA');
    expect(tagLabel('dns')).toBe('DNS');
    expect(tagLabel('apache-flink')).toBe('Apache Flink');
    expect(tagLabel('2024')).toBe('2024');
  });
});
