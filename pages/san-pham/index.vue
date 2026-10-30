<script setup lang="ts">
import { filterBySeries } from '~/utils/products'
const { all, seriesList } = useProducts()
// Cho phép deep-link từ trang chủ: /san-pham?series=<tên series>
const route = useRoute()
const active = ref(typeof route.query.series === 'string' ? route.query.series : 'all')
const visible = computed(() => filterBySeries(all.value, active.value))

useSeoMeta({
  title: 'Bộ sưu tập - Ichigo Studio',
  description: 'Bộ sưu tập phụ kiện in 3D cho đồ chơi DX: Super Sentai, Kamen Rider, Beyblade.',
})

// JSON-LD: CollectionPage + ItemList + Breadcrumb (getter -> data async đã có lúc render).
const { public: { siteUrl } } = useRuntimeConfig()
useJsonLd(
  () => [
    {
      '@type': 'CollectionPage',
      name: 'Bộ sưu tập',
      url: `${siteUrl}/san-pham`,
      mainEntity: {
        '@type': 'ItemList',
        numberOfItems: all.value.length,
        itemListElement: all.value.map((p, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          url: `${siteUrl}/san-pham/${p.slug}`,
          name: p.title,
        })),
      },
    },
    {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Trang chủ', item: siteUrl },
        { '@type': 'ListItem', position: 2, name: 'Bộ sưu tập', item: `${siteUrl}/san-pham` },
      ],
    },
  ],
  'collection',
)
</script>

<template>
  <section class="mx-auto max-w-content px-4 py-16 md:px-8">
    <SectionHeading
      as="h1"
      title="BỘ SƯU TẬP"
      subtitle="Phụ kiện và đế trưng bày in FDM cho đồ chơi DX"
    />

    <SeriesFilter :series="seriesList" v-model="active" class="mb-10" />

    <div v-if="visible.length" class="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
      <ProductCard v-for="(p, i) in visible" :key="p.slug" :product="p" :priority="i === 0" />
    </div>
    <p v-else class="py-20 text-center font-sans text-sm text-silver">
      Chưa có sản phẩm trong series này. Nhắn shop để đặt mẫu riêng.
    </p>
  </section>
</template>
