export default defineNuxtConfig({
  compatibilityDate: '2025-01-01',
  modules: ['@nuxt/content', '@nuxt/image', '@nuxtjs/tailwindcss', '@nuxtjs/color-mode'],
  css: ['~/assets/css/main.css'],
  colorMode: {
    classSuffix: '',
  },
  app: {
    head: {
      htmlAttrs: { lang: 'vi' },
      meta: [{ name: 'viewport', content: 'width=device-width, initial-scale=1' }],
    },
  },
  image: {
    domains: ['picsum.photos'],
  },
  nitro: {
    prerender: { crawlLinks: true, routes: ['/'] },
  },
})
