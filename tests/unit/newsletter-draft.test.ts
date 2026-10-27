import { describe, expect, it } from 'vitest';
import { campaignPayload, renderEmail } from '../../scripts/lib/newsletter-draft';

const template =
  '<html><body><h1>{{title}}</h1>{{tldr}}{{content}}<a href="{{url}}">web</a>{{ UnsubscribeURL }}</body></html>';

describe('renderEmail', () => {
  it('fills placeholders, escapes the title and keeps listmonk tags', () => {
    const html = renderEmail(template, {
      title: 'A & B',
      url: 'https://www.serverless.fyi/p/a/',
      html: '<p>x</p>',
      tldr: 'Short.',
    });
    expect(html).toContain('<h1>A &amp; B</h1>');
    expect(html).toContain('<p>x</p>');
    expect(html).toContain('href="https://www.serverless.fyi/p/a/"');
    expect(html).toContain('Short.');
    expect(html).toContain('{{ UnsubscribeURL }}');
  });
  it('omits the TL;DR block when there is none', () => {
    expect(renderEmail(template, { title: 'T', url: 'u', html: '', tldr: undefined })).not.toContain('undefined');
  });
});

describe('campaignPayload', () => {
  it('is always a draft (never scheduled or sent)', () => {
    const p = campaignPayload({ title: 'T', slug: 't', listId: 3, body: '<p/>' });
    expect(p).toMatchObject({
      name: 'T',
      subject: 'T',
      lists: [3],
      type: 'regular',
      content_type: 'html',
      body: '<p/>',
    });
    expect(p).not.toHaveProperty('send_at');
    expect(p.tags).toContain('auto-draft');
  });
});
