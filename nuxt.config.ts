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
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'theme-color', content: '#0e0f0c' },
        { property: 'og:type', content: 'website' },
        { property: 'og:site_name', content: 'Ichigo Studio' },
        { property: 'og:image', content: '/og.png' },
        { property: 'og:image:width', content: '1200' },
        { property: 'og:image:height', content: '630' },
        { name: 'twitter:card', content: 'summary_large_image' },
        { name: 'twitter:image', content: '/og.png' },
      ],
      link: [
        { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
        { rel: 'icon', type: 'image/png', sizes: '32x32', href: '/favicon-32x32.png' },
        { rel: 'apple-touch-icon', sizes: '180x180', href: '/apple-touch-icon.png' },
      ],
    },
  },
  image: {
    domains: ['picsum.photos'],
  },
  nitro: {
    prerender: { crawlLinks: true, routes: ['/', ...productRoutes] },
  },
})
