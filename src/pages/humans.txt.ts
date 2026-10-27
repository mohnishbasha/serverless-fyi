import type { APIRoute } from 'astro';
import { SITE_VERSION } from '../lib/site';

export const GET: APIRoute = () =>
  new Response(
    `/* TEAM */
Author: Mohinish Shaikh
Site: https://www.serverless.fyi/authors/
Twitter: @mohinishbasha
From: Serverless Ventures LLC

/* SITE */
Version: ${SITE_VERSION}
Standards: HTML5, CSS3, schema.org, llms.txt
Components: Astro, Pagefind, Shiki, satori
Hosting: GitHub Pages
`,
    { headers: { 'Content-Type': 'text/plain; charset=utf-8' } },
  );
