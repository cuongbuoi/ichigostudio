export default defineNuxtConfig({
  compatibilityDate: '2025-01-01',
  modules: ['@nuxt/image', '@nuxtjs/tailwindcss', 'nuxt-gtag', '@vite-pwa/nuxt'],
  css: ['~/assets/css/main.css'],
  gtag: {
    id: 'G-TFCVBNLCB8',
    // Chỉ gửi số liệu ở production; khi `nuxt dev` sẽ không bắn event lên GA.
    enabled: process.env.NODE_ENV === 'production',
  },
  app: {
    head: {
      htmlAttrs: { lang: 'vi', class: 'dark' },
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'theme-color', content: '#0e0f0c' },
        // Cho phép index + ảnh xem trước lớn trên Google/AI Overviews.
        { name: 'robots', content: 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1' },
        { property: 'og:type', content: 'website' },
        { property: 'og:site_name', content: 'Ichigo Studio' },
        { property: 'og:locale', content: 'vi_VN' },
        { property: 'og:image', content: '/og.png' },
        { property: 'og:image:width', content: '1200' },
        { property: 'og:image:height', content: '630' },
        { name: 'twitter:card', content: 'summary_large_image' },
        { name: 'twitter:image', content: '/og.png' },
      ],
      link: [
        // Kết nối sớm tới host ảnh (API/R2) để LCP nhanh hơn.
        { rel: 'preconnect', href: 'https://ichigo-studio-api.cuongyo19997.workers.dev', crossorigin: '' },
        { rel: 'dns-prefetch', href: 'https://ichigo-studio-api.cuongyo19997.workers.dev' },
        { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
        { rel: 'icon', type: 'image/png', sizes: '32x32', href: '/favicon-32x32.png' },
        { rel: 'apple-touch-icon', sizes: '180x180', href: '/apple-touch-icon.png' },
        // @vite-pwa/nuxt (SSR + nitro cloudflare) không tự nhúng link manifest
        // vào <head>; khai báo tường minh để trình duyệt nhận PWA cài đặt được.
        { rel: 'manifest', href: '/manifest.webmanifest' },
      ],
    },
  },
  image: {
    domains: ['picsum.photos', 'ichigo-studio-api.cuongyo19997.workers.dev'],
  },
  nitro: {
    // SSR on Cloudflare Workers (Static Assets + module worker)
    preset: 'cloudflare_module',
  },
  runtimeConfig: {
    public: {
      // Default = production API. Local dev overrides via .env (NUXT_PUBLIC_API_BASE).
      apiBase: 'https://ichigo-studio-api.cuongyo19997.workers.dev',
      // Dùng cho canonical, og:url, sitemap, JSON-LD, llms.txt. Override qua NUXT_PUBLIC_SITE_URL.
      siteUrl: 'https://ichigostudio.vn',
    },
  },
  pwa: {
    registerType: 'autoUpdate',
    manifest: {
      name: 'Ichigo Studio',
      short_name: 'Ichigo Studio',
      description: 'Phụ kiện, đế trưng bày và prop custom in 3D FDM cho đồ chơi DX tokusatsu.',
      lang: 'vi',
      theme_color: '#0e0f0c',
      background_color: '#0e0f0c',
      display: 'standalone',
      start_url: '/',
      icons: [
        { src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
        { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png' },
        { src: '/maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      ],
    },
    workbox: {
      // Site SSR: chỉ precache asset tĩnh, KHÔNG navigateFallback (để điều hướng
      // đi qua network lấy HTML render mới + dữ liệu sản phẩm live).
      globPatterns: ['**/*.{js,css,svg,png,ico,woff,woff2}'],
      navigateFallback: undefined,
    },
    client: { installPrompt: true },
    devOptions: { enabled: false },
  },
})
