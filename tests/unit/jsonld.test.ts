import { describe, expect, it } from 'vitest';
import { blogPosting, breadcrumbList, faqPage, graph, organization, person, website } from '../../src/lib/jsonld';

const ctx = { site: 'https://www.serverless.fyi', base: '/' };
const author = {
  id: 'mohinish',
  name: 'Mohinish Shaikh',
  shortName: 'Mohinish S',
  jobTitle: 'Founder',
  bio: 'Bio',
  avatar: '/brand/mohinish.jpg',
  url: 'https://www.serverless.fyi/authors/',
  sameAs: ['https://github.com/mohnishbasha'],
  knowsAbout: ['Distributed systems'],
};

describe('organization / website', () => {
  it('produces required props', () => {
    const o = organization(ctx);
    expect(o['@type']).toBe('Organization');
    expect(o.name).toBe('Serverless Ventures LLC');
    expect(o.logo).toMatchObject({ '@type': 'ImageObject' });
    expect(Array.isArray(o.sameAs)).toBe(true);
    const w = website(ctx, true);
    expect(w['@type']).toBe('WebSite');
    expect(w.potentialAction).toMatchObject({ '@type': 'SearchAction' });
    expect(String((w.potentialAction as { target: string }).target)).toContain('/search/?q={search_term_string}');
  });
});

describe('person', () => {
  it('includes sameAs, knowsAbout, worksFor', () => {
    const p = person(author, ctx);
    expect(p['@type']).toBe('Person');
    expect(p.name).toBe('Mohinish Shaikh');
    expect(p.sameAs).toEqual(author.sameAs);
    expect(p.knowsAbout).toEqual(author.knowsAbout);
    expect(p.worksFor).toMatchObject({ '@id': 'https://www.serverless.fyi/#organization' });
    expect(String(p.image)).toMatch(/^https:\/\//);
  });
});

describe('blogPosting', () => {
  it('has all required properties', () => {
    const b = blogPosting(
      {
        slug: 'x',
        title: 'Title',
        description: 'Desc',
        pubDate: new Date('2025-01-02T00:00:00Z'),
        updatedDate: undefined,
        tags: ['dns'],
        image: '/og/x.png',
        wordCount: 500,
      },
      author,
      ctx,
    );
    for (const k of [
      'headline',
      'description',
      'image',
      'datePublished',
      'dateModified',
      'author',
      'publisher',
      'mainEntityOfPage',
      'keywords',
      'articleSection',
      'wordCount',
      'inLanguage',
      'isPartOf',
    ]) {
      expect(b, k).toHaveProperty(k);
    }
    expect(b.dateModified).toBe(b.datePublished);
    expect(b.mainEntityOfPage).toBe('https://www.serverless.fyi/p/x/');
    expect((b.image as string[])[0]).toBe('https://www.serverless.fyi/og/x.png');
  });
});

describe('breadcrumbList', () => {
  it('numbers items from 1 with absolute URLs', () => {
    const bl = breadcrumbList(
      [
        { name: 'Home', path: '/' },
        { name: 'Archive', path: '/archive/' },
      ],
      ctx,
    );
    const items = bl.itemListElement as Array<Record<string, unknown>>;
    expect(items[0]).toMatchObject({ position: 1, name: 'Home', item: 'https://www.serverless.fyi/' });
    expect(items[1]?.position).toBe(2);
  });
});

describe('faqPage', () => {
  it('returns null for an empty FAQ', () => {
    expect(faqPage([])).toBeNull();
  });
  it('maps questions to Question/Answer', () => {
    const f = faqPage([{ q: 'Q?', a: 'A.' }]);
    expect(f?.mainEntity).toEqual([
      { '@type': 'Question', name: 'Q?', acceptedAnswer: { '@type': 'Answer', text: 'A.' } },
    ]);
  });
});

describe('graph', () => {
  it('wraps nodes in a single @graph and drops nulls', () => {
    const g = graph([organization(ctx), null]);
    expect(g['@context']).toBe('https://schema.org');
    expect((g['@graph'] as unknown[]).length).toBe(1);
  });
});
