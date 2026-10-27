import { describe, expect, it } from 'vitest';
import { gaSnippet, isGaId } from '../../src/lib/analytics';

describe('isGaId', () => {
  it('accepts GA4 measurement ids only', () => {
    expect(isGaId('G-DKDHH7T239')).toBe(true);
    expect(isGaId('UA-123-1')).toBe(false);
    expect(isGaId('G-abc"><script>')).toBe(false);
    expect(isGaId('')).toBe(false);
  });
});

describe('gaSnippet', () => {
  const s = gaSnippet('G-DKDHH7T239');
  it('loads gtag for the given id after the load event, not during page load', () => {
    expect(s).toContain("addEventListener('load'");
    expect(s).toContain('https://www.googletagmanager.com/gtag/js?id=G-DKDHH7T239');
    expect(s).toContain("gtag('config', 'G-DKDHH7T239')");
  });
  it('respects Global Privacy Control and Do Not Track', () => {
    expect(s).toContain('globalPrivacyControl');
    expect(s).toContain('doNotTrack');
  });
  it('throws on an invalid id (never interpolates untrusted input)', () => {
    expect(() => gaSnippet('nope')).toThrow();
  });
});
