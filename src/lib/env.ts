/** Build-time environment, read once. Only PUBLIC_* values may reach the client. */
import { BASE_URL, SITE_URL } from './urls';

export const INDEXABLE = import.meta.env.PUBLIC_INDEXABLE === 'true';
export const CF_ANALYTICS_TOKEN: string = import.meta.env.PUBLIC_CF_ANALYTICS_TOKEN ?? '';
export const NEWSLETTER_ID: string = import.meta.env.PUBLIC_NEWSLETTER_ID ?? '';
export const NEWSLETTER_URL: string = import.meta.env.PUBLIC_NEWSLETTER_URL ?? '';
export const ctx = { site: SITE_URL, base: BASE_URL };
