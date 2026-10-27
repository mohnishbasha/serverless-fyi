import { defineCollection, reference } from 'astro:content';
import { file, glob } from 'astro/loaders';
import { z } from 'astro/zod';

const kebab = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const posts = defineCollection({
  loader: glob({ pattern: '**/index.{md,mdx}', base: './src/content/posts' }),
  schema: ({ image }) =>
    z
      .object({
        title: z.string().min(5).max(110),
        subtitle: z.string().max(200).optional(),
        // SEO description: 70–160 chars, enforced
        description: z.string().min(70).max(160),
        slug: z.string().regex(kebab), // must equal Beehiiv slug for migrated posts
        pubDate: z.coerce.date(),
        updatedDate: z.coerce.date().optional(),
        author: reference('authors').default({ collection: 'authors', id: 'mohinish' }),
        tags: z.array(z.string().regex(kebab)).min(1).max(6),
        cover: image().optional(),
        coverAlt: z.string().optional(),
        // AEO fields — rendered visibly AND as structured data
        tldr: z.string().min(40).max(320).optional(),
        keyTakeaways: z.array(z.string()).max(6).default([]),
        faq: z
          .array(z.object({ q: z.string(), a: z.string() }))
          .max(8)
          .default([]),
        aeoPending: z.boolean().default(false),
        // provenance
        beehiivId: z.string().optional(),
        beehiivUrl: z.url().optional(),
        canonical: z.url().optional(),
        draft: z.boolean().default(false),
        noindex: z.boolean().default(false),
        series: z.string().optional(),
      })
      .refine((d) => !d.cover || !!d.coverAlt, { message: 'coverAlt is required when cover is set' })
      .refine((d) => d.aeoPending || (!!d.tldr && d.keyTakeaways.length >= 2), {
        message: 'tldr and ≥2 keyTakeaways are required unless aeoPending: true',
      })
      .refine((d) => d.draft || d.pubDate.getTime() <= Date.now() + 86_400_000, {
        message: 'pubDate is in the future; set draft: true for scheduled posts',
      }),
});

const authors = defineCollection({
  loader: file('./src/content/authors/authors.json'),
  schema: z.object({
    id: z.string(),
    name: z.string(),
    shortName: z.string(),
    jobTitle: z.string(),
    bio: z.string(),
    avatar: z.string(),
    url: z.url(),
    sameAs: z.array(z.url()),
    knowsAbout: z.array(z.string()),
  }),
});

const tags = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/tags' }),
  schema: z.object({ description: z.string().optional() }),
});

export const collections = { posts, authors, tags };
