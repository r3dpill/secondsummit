import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

/**
 * "Today's conditions" figures, carried on the daily post itself so that
 * posting the morning diary entry updates the card on /snowdonia-way.
 * Every field is optional — the card renders only the rows it is given.
 */
const conditions = z
  .object({
    stage: z.string().optional(),
    summits: z.string().optional(),
    wind: z.string().optional(),
    cloudBase: z.string().optional(),
    rain: z.string().optional(),
    call: z.string().optional(),
  })
  .optional();

export type Conditions = NonNullable<z.infer<typeof conditions>>;

const posts = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/posts' }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      description: z.string().optional(),
      pubDate: z.coerce.date(),
      updatedDate: z.coerce.date().optional(),
      /** Drives which expedition page the post appears on. */
      category: z.enum(['coast-to-coast', 'snowdonia-way', 'training']),
      /** Day number within an expedition, for the day-by-day index. */
      day: z.number().int().optional(),
      /** Free text so "9.9 mi" and "two short legs" both work. */
      distance: z.string().optional(),
      cover: image().optional(),
      coverAlt: z.string().optional(),
      /** YouTube video ID for the day's film. */
      video: z.string().optional(),
      conditions,
      /** Original wisecoasttocoast.com path, kept for the later 301 map. */
      legacyUrl: z.string().optional(),
      draft: z.boolean().default(false),
    }),
});

const pages = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/pages' }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      description: z.string().optional(),
      eyebrow: z.string().optional(),
      cover: image().optional(),
      coverAlt: z.string().optional(),
      legacyUrl: z.string().optional(),
      draft: z.boolean().default(false),
    }),
});

export const collections = { posts, pages };
