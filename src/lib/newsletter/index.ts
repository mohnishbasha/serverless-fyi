/**
 * Newsletter provider adapter (ADR-006, docs/ARCHITECTURE.md § Newsletter).
 * The provider is one env variable; only public identifiers ever reach the client.
 */
export type Provider = 'beehiiv' | 'listmonk' | 'buttondown' | 'kit' | 'none';

const PROVIDERS: readonly Provider[] = ['beehiiv', 'listmonk', 'buttondown', 'kit', 'none'];

export interface FormConfig {
  provider: Exclude<Provider, 'none'>;
  action: string;
  method: 'get' | 'post';
  emailField: string;
  /** Hidden inputs sent with every submission. */
  hidden: Record<string, string>;
  /** Name of an input that must stay empty (bots fill it). */
  honeypot: string;
  /** Message shown after a successful submission. */
  success: string;
}

export function parseProvider(v: string | undefined): Provider {
  const p = (v ?? '').trim().toLowerCase() as Provider;
  return PROVIDERS.includes(p) ? p : 'none';
}

const CONFIRM = 'Thanks! Check your inbox and confirm your subscription.';

export function formConfig(provider: Provider, o: { id: string; url?: string; redirect?: string }): FormConfig | null {
  if (provider === 'none' || !o.id) return null;
  switch (provider) {
    case 'listmonk':
      if (!o.url) return null;
      return {
        provider,
        action: `${o.url.replace(/\/+$/, '')}/subscription/form`,
        method: 'post',
        emailField: 'email',
        hidden: { l: o.id },
        honeypot: 'nonce',
        success: CONFIRM,
      };
    case 'beehiiv':
      return {
        provider,
        action: `https://magic.beehiiv.com/v1/${o.id}`,
        method: 'get',
        emailField: 'email',
        hidden: o.redirect ? { redirect_to: o.redirect } : {},
        honeypot: 'website',
        success: 'Thanks! You’re subscribed — look out for the next issue.',
      };
    case 'buttondown':
      return {
        provider,
        action: `https://buttondown.com/api/emails/embed-subscribe/${o.id}`,
        method: 'post',
        emailField: 'email',
        hidden: { embed: '1' },
        honeypot: 'website',
        success: CONFIRM,
      };
    case 'kit':
      return {
        provider,
        action: `https://app.kit.com/forms/${o.id}/subscriptions`,
        method: 'post',
        emailField: 'email_address',
        hidden: {},
        honeypot: 'website',
        success: CONFIRM,
      };
  }
}

const env = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env ?? {};

export const provider: Provider = parseProvider(env.PUBLIC_NEWSLETTER_PROVIDER);
export const providerLabel: Record<Provider, string> = {
  beehiiv: 'Beehiiv',
  listmonk: 'listmonk (self-hosted) + Amazon SES',
  buttondown: 'Buttondown',
  kit: 'Kit',
  none: 'none',
};
