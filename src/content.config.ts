import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const posts = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/posts' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    // 목차는 2depth까지만 사용합니다: category(대분류) - subcategory(소분류)
    // 예: category: "Routing", subcategory: "OSPF"
    category: z.string(),
    subcategory: z.string().optional(),
    excerpt: z.string(),
  }),
});

export const collections = { posts };
