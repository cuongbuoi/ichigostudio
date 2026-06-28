import { readdirSync } from 'node:fs'
import { resolve } from 'node:path'

const productRoutes = readdirSync(resolve(__dirname, 'content/products'))
  .filter((f) => f.endsWith('.md'))
  .map((f) => `/san-pham/${f.replace(/\.md$/, '')}`)

export default defineNuxtConfig({
  compatibilityDate: '2025-01-01',
  modules: ['@nuxt/content', '@nuxt/image', '@nuxtjs/tailwindcss'],
  css: ['~/assets/css/main.css'],
  app: {
    head: {
      htmlAttrs: { lang: 'vi', class: 'dark' },
      meta: [{ name: 'viewport', content: 'width=device-width, initial-scale=1' }],
    },
  },
  image: {
    domains: ['picsum.photos'],
  },
  nitro: {
    prerender: { crawlLinks: true, routes: ['/', ...productRoutes] },
  },
})
