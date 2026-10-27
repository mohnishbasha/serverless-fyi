import { describe, expect, it } from 'vitest';
import { formConfig, parseProvider } from '../../src/lib/newsletter';

describe('parseProvider', () => {
  it('accepts known providers and falls back to none', () => {
    expect(parseProvider('listmonk')).toBe('listmonk');
    expect(parseProvider('BEEHIIV')).toBe('beehiiv');
    expect(parseProvider(undefined)).toBe('none');
    expect(parseProvider('mailchimp')).toBe('none');
  });
});

describe('formConfig', () => {
  it('listmonk posts to the public subscription form with list UUID and nonce honeypot', () => {
    const c = formConfig('listmonk', { id: 'list-uuid', url: 'https://lists.serverless.fyi' });
    expect(c).toMatchObject({
      action: 'https://lists.serverless.fyi/subscription/form',
      method: 'post',
      emailField: 'email',
      honeypot: 'nonce',
      hidden: { l: 'list-uuid' },
    });
  });

  it('beehiiv uses the magic-link endpoint (GET, works without JS)', () => {
    const c = formConfig('beehiiv', { id: 'pub-uuid', redirect: 'https://www.serverless.fyi/subscribe/?subscribed=1' });
    expect(c?.action).toBe('https://magic.beehiiv.com/v1/pub-uuid');
    expect(c?.method).toBe('get');
    expect(c?.emailField).toBe('email');
    expect(c?.hidden.redirect_to).toBe('https://www.serverless.fyi/subscribe/?subscribed=1');
  });

  it('buttondown and kit use their public form endpoints', () => {
    expect(formConfig('buttondown', { id: 'serverless' })?.action).toBe(
      'https://buttondown.com/api/emails/embed-subscribe/serverless',
    );
    expect(formConfig('kit', { id: '123' })).toMatchObject({
      action: 'https://app.kit.com/forms/123/subscriptions',
      emailField: 'email_address',
    });
  });

  it("kit accepts an endpoint override copied from Kit's HTML embed code", () => {
    expect(formConfig('kit', { id: '123', url: 'https://app.convertkit.com/' })?.action).toBe(
      'https://app.convertkit.com/forms/123/subscriptions',
    );
    expect(formConfig('kit', { id: '123' })?.success).toMatch(/confirm/);
    // An unset env var arrives as '' — must still use the default host.
    expect(formConfig('kit', { id: '123', url: '' })?.action).toBe('https://app.kit.com/forms/123/subscriptions');
  });

  it('returns null for none or when the id is missing', () => {
    expect(formConfig('none', { id: 'x' })).toBeNull();
    expect(formConfig('listmonk', { id: '' })).toBeNull();
  });

  it('never exposes secrets: only PUBLIC ids appear in the config', () => {
    const c = formConfig('listmonk', { id: 'list-uuid', url: 'https://lists.serverless.fyi' });
    expect(JSON.stringify(c)).not.toMatch(/token|secret|api[_-]?key|password/i);
  });
});
