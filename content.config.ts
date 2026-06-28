import { defineContentConfig, defineCollection, z } from '@nuxt/content'

export default defineContentConfig({
  collections: {
    products: defineCollection({
      type: 'page',
      source: 'products/*.md',
      schema: z.object({
        title: z.string(),
        slug: z.string(),
        series: z.string(),
        scale: z.string(),
        height: z.string(),
        material: z.string(),
        priceRef: z.string(),
        featured: z.boolean().default(false),
        order: z.number().default(99),
        images: z.array(z.string()),
        cover: z.string(),
      }),
    }),
  },
})
