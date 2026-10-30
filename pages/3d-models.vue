<script setup lang="ts">
import { useCultsModels, formatCultsPrice, type CultsModel } from '~/composables/useCultsModels'

const shop = useShop()
const { models } = useCultsModels()
const { gtag } = useGtag()
const cultsProfile = (shop as any).cults3dUrl as string | undefined

function trackClick(m: CultsModel) {
  gtag('event', 'cults_click', { model: m.name })
}

// Trang hướng tới khách quốc tế -> copy tiếng Anh.
useSeoMeta({
  title: '3D Printable Models by Ichigo Studio - Download on Cults3D',
  description:
    'Download and 3D print tokusatsu (Kamen Rider, Super Sentai) accessories, display stands and props designed by Ichigo Studio. STL files available on Cults3D.',
  ogTitle: '3D Printable Models by Ichigo Studio',
  ogDescription: 'Download STL files for tokusatsu accessories and display stands on Cults3D.',
  ogType: 'website',
})

const { public: { siteUrl } } = useRuntimeConfig()
useJsonLd(
  () => {
    const nodes: Record<string, any>[] = [
      {
        '@type': 'CollectionPage',
        name: '3D Printable Models by Ichigo Studio',
        url: `${siteUrl}/3d-models`,
        inLanguage: 'en',
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: siteUrl },
          { '@type': 'ListItem', position: 2, name: '3D Models', item: `${siteUrl}/3d-models` },
        ],
      },
    ]
    if (models.value.length) {
      nodes.push({
        '@type': 'ItemList',
        name: 'Ichigo Studio 3D models on Cults3D',
        numberOfItems: models.value.length,
        itemListElement: models.value.map((m, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          url: m.url,
          item: {
            '@type': 'Product',
            name: m.name,
            ...(m.image ? { image: [m.image] } : {}),
            url: m.url,
            brand: { '@type': 'Brand', name: 'Ichigo Studio' },
            offers: {
              '@type': 'Offer',
              price: (m.priceCents / 100).toFixed(2),
              priceCurrency: m.currency || 'USD',
              availability: 'https://schema.org/InStock',
              url: m.url,
            },
          },
        })),
      })
    }
    return nodes
  },
  'cults-models',
)
</script>

<template>
  <section class="mx-auto max-w-content px-4 py-16 md:px-8">
    <div class="mb-10 max-w-content">
      <p class="font-sans text-[10px] uppercase tracking-[0.2em] text-hopper">DOWNLOAD / 3D PRINT / STL</p>
      <h1 class="mt-2 font-display text-4xl uppercase leading-[1.4] tracking-tight text-paper md:text-5xl md:leading-[1.4]">
        3D PRINTABLE MODELS
      </h1>
      <p class="mt-4 max-w-[60ch] font-sans text-sm font-light leading-relaxed text-silver">
        Tokusatsu accessories, display stands and props designed by Ichigo Studio, ready to download and 3D print.
        Buy and download the STL files on our Cults3D store.
      </p>
    </div>

    <div v-if="models.length" class="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
      <a
        v-for="m in models"
        :key="m.url"
        :href="m.url"
        target="_blank"
        rel="noopener"
        @click="trackClick(m)"
        class="group flex flex-col overflow-hidden rounded-lg border border-paper/10 bg-panel transition hover:border-hopper/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hopper"
      >
        <div class="relative aspect-square overflow-hidden bg-night">
          <img
            v-if="m.image"
            :src="m.image"
            :alt="m.name"
            loading="lazy"
            class="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          />
          <div v-else class="flex h-full w-full items-center justify-center font-display text-sm text-silver/40">ICHIGO</div>
          <span class="absolute left-3 top-3 rounded bg-night/80 px-2 py-1 font-sans text-xs font-medium text-hopper-bright backdrop-blur">
            {{ formatCultsPrice(m) }}
          </span>
        </div>
        <div class="flex flex-1 flex-col p-5">
          <h2 class="font-display text-base uppercase leading-snug tracking-tight text-paper">{{ m.name }}</h2>
          <p class="mt-2 flex items-center gap-3 font-sans text-xs text-silver/70">
            <span>&darr; {{ m.downloads }} downloads</span>
            <span>&hearts; {{ m.likes }}</span>
          </p>
          <span class="mt-4 inline-flex items-center gap-1 font-sans text-sm font-medium text-hopper transition group-hover:text-hopper-bright">
            View on Cults3D &rsaquo;
          </span>
        </div>
      </a>
    </div>

    <!-- Fallback: chưa sync được model -> vẫn dẫn khách sang profile Cults3D -->
    <div v-else class="rounded-lg border border-dashed border-paper/15 p-10 text-center">
      <p class="font-sans text-sm text-silver">Our 3D models are available on Cults3D.</p>
      <a
        v-if="cultsProfile"
        :href="cultsProfile"
        target="_blank"
        rel="noopener"
        class="mt-4 inline-flex items-center bg-hopper px-6 py-3 font-sans text-sm font-medium tracking-wide text-night transition hover:bg-hopper-bright active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hopper-bright rounded-sm"
      >Visit our Cults3D store &rsaquo;</a>
    </div>

    <div v-if="models.length && cultsProfile" class="mt-12">
      <a
        :href="cultsProfile"
        target="_blank"
        rel="noopener"
        class="font-sans text-sm font-medium text-hopper hover:text-hopper-bright hover:underline underline-offset-4 transition"
      >See all models on Cults3D &rsaquo;</a>
    </div>
  </section>
</template>
