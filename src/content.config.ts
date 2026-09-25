import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const cases = defineCollection({
  loader: glob({
    pattern: '*.md',
    base: './src/content/cases',
  }),
  schema: z.object({
    title: z.string().min(1),
    seoTitle: z.string().min(1),
    description: z.string().min(1),
    summary: z.string().min(1).optional(),
    status: z.enum(['work-sample', 'case-study']).optional(),
    category: z.string().min(1).optional(),
  }),
});

export const collections = { cases };
