<script setup lang="ts">
const route = useRoute()
const shop = useShop()
const { public: { siteUrl } } = useRuntimeConfig()

// Canonical + og:url theo path hiện tại (bỏ query để gộp điểm về 1 URL sạch).
const canonical = computed(() => `${siteUrl}${route.path}`)
useHead(() => ({
  link: [{ rel: 'canonical', href: canonical.value }],
  meta: [{ property: 'og:url', content: canonical.value }],
}))

// JSON-LD toàn site: Organization + WebSite (dạy máy shop là ai — mạnh cho AEO).
const sameAs = [shop.facebookUrl, (shop as any).tiktokUrl].filter(Boolean)
useJsonLd(
  [
    {
      '@type': 'Organization',
      '@id': `${siteUrl}/#organization`,
      name: shop.name,
      url: siteUrl,
      logo: `${siteUrl}/logo.png`,
      image: `${siteUrl}/og.png`,
      description: shop.tagline,
      slogan: shop.tagline,
      areaServed: { '@type': 'Country', name: 'Việt Nam' },
      knowsAbout: ['in 3D FDM', 'phụ kiện tokusatsu', 'Kamen Rider', 'Super Sentai', 'đồ chơi DX'],
      ...(shop.messengerUrl
        ? { contactPoint: { '@type': 'ContactPoint', contactType: 'customer support', url: shop.messengerUrl, areaServed: 'VN', availableLanguage: 'Vietnamese' } }
        : {}),
      ...(sameAs.length ? { sameAs } : {}),
    },
    {
      '@type': 'WebSite',
      '@id': `${siteUrl}/#website`,
      name: shop.name,
      url: siteUrl,
      inLanguage: 'vi-VN',
      publisher: { '@id': `${siteUrl}/#organization` },
    },
  ],
  'site',
)
</script>

<template>
  <div class="flex min-h-[100dvh] flex-col bg-night">
    <AppHeader />
    <main class="flex-1">
      <slot />
    </main>
    <AppFooter />
    <FloatingContact />
    <div class="grain-overlay" aria-hidden="true" />
  </div>
</template>

<style scoped>
.grain-overlay {
  position: fixed;
  inset: 0;
  z-index: 70;
  pointer-events: none;
  user-select: none;
  background-image: repeating-linear-gradient(
    0deg,
    transparent,
    transparent 2px,
    rgba(0, 0, 0, 0.04) 2px,
    rgba(0, 0, 0, 0.04) 3px
  );
  opacity: 1;
}
@media (prefers-reduced-transparency: reduce) {
  .grain-overlay { display: none; }
}
@media (prefers-reduced-motion: reduce) {
  .grain-overlay { display: none; }
}
</style>
