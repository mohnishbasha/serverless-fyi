/** Site-wide constants. SITE_VERSION must equal package.json version (scripts/check-versions.sh). */
export const SITE_VERSION = '1.0.0';

export const SITE = {
  name: '2 Minute Serverless',
  shortName: '2MinServerless',
  tagline: 'Freshly baked serverless nuggets in 2-minutes',
  description: 'Data | AI | Distributed Systems | Start Ups',
  homeTitle: '2 Minute Serverless — Data, AI & Distributed Systems in 2 Minutes',
  homeDescription:
    'Freshly baked serverless nuggets in two minutes: concise deep dives on data, AI, distributed systems and startups by Mohinish Shaikh.',
  keywords: ['product management', 'software engineering', 'technology'],
  lang: 'en',
  locale: 'en_US',
  themeColorLight: '#f0f9f4',
  themeColorDark: '#0d1512',
  twitter: '@mohinishbasha',
  organization: {
    name: 'Serverless Ventures LLC',
    url: 'https://www.serverless.fyi/',
    logo: '/brand/logo-512.png',
  },
  social: {
    x: 'https://twitter.com/mohinishbasha',
    linkedin: 'https://www.linkedin.com/in/mohinishbasha',
    youtube: 'https://www.youtube.com/@TwoMinuteServerless',
    github: 'https://github.com/mohnishbasha',
  },
  /** Slugs of the posts shown in the "Start here" block on the home page. */
  startHere: [
    'vector-clocks-in-distributed-systems',
    'understanding-the-dns-header',
    'ensuring-distributed-system-reliability-with-jepsen',
  ],
  /** Site-wide announcement under the header. Change `id` to show a new one to everyone again. */
  banner: {
    id: 'moved-off-beehiiv-2026-10',
    emoji: '🐝📦',
    text: 'We moved out of Beehiiv! Packed all 23 posts into Markdown, left the $59/month rent behind, and the bees kept the furniture.',
    linkText: 'See the math',
    href: '/why-we-moved/',
  },
  postsPerTagPage: 10,
  postsPerArchivePage: 20,
  homeLatest: 10,
  feedLimit: 50,
  tocMinWords: 1200,
} as const;

export const sameAs = Object.values(SITE.social);
