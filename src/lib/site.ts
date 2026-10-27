/** Site-wide constants. SITE_VERSION must equal package.json version (scripts/check-versions.sh). */
export const SITE_VERSION = '0.1.0';

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
  themeColorLight: '#ffffff',
  themeColorDark: '#0b0d10',
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
  postsPerTagPage: 10,
  postsPerArchivePage: 20,
  homeLatest: 10,
  feedLimit: 50,
  tocMinWords: 1200,
} as const;

export const sameAs = Object.values(SITE.social);
