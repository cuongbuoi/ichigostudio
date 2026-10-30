<script setup lang="ts">
import { filterByCategory, mapApiProduct } from '~/utils/products'
import type { StoreCategory } from '~/composables/useCategories'

const route = useRoute()
const slug = computed(() => String(route.params.slug))
const { public: { apiBase, siteUrl } } = useRuntimeConfig()

// Await data (cùng key với composable -> dùng chung cache) để check 404 chuẩn SSR.
const { data: allProducts } = await useAsyncData('products', async () => {
  try {
    const res = await $fetch<{ items: any[] }>(`${apiBase}/public/products`)
    return (res.items ?? []).map(mapApiProduct)
  } catch { return [] }
})
const { data: allCategories } = await useAsyncData('categories', async () => {
  try {
    const res = await $fetch<{ items: StoreCategory[] }>(`${apiBase}/public/categories`)
    return res.items ?? []
  } catch { return [] as StoreCategory[] }
})

const category = computed(() => (allCategories.value ?? []).find(c => c.slug === slug.value))
const products = computed(() => filterByCategory((allProducts.value ?? []) as any, slug.value))
// Tên danh mục: ưu tiên bản quản lý, fallback tên từ SP.
const name = computed(() => category.value?.name ?? products.value[0]?.category ?? '')

// Slug không tồn tại (không có trong danh mục quản lý và không có SP) -> 404.
if (!category.value && !products.value.length) {
  throw createError({ statusCode: 404, statusMessage: 'Không tìm thấy danh mục' })
}

useSeoMeta({
  title: () => `${name.value} - Ichigo Studio`,
  description: () => `Sản phẩm thiết kế và in 3D cho đồ chơi DX thuộc danh mục ${name.value}, phối màu theo yêu cầu.`,
})

useJsonLd(
  () => [
    {
      '@type': 'CollectionPage',
      name: name.value,
      url: `${siteUrl}/danh-muc/${slug.value}`,
      mainEntity: {
        '@type': 'ItemList',
        numberOfItems: products.value.length,
        itemListElement: products.value.map((p, i) => ({
          '@type': 'ListItem', position: i + 1, url: `${siteUrl}/san-pham/${p.slug}`, name: p.title,
        })),
      },
    },
    {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Trang chủ', item: siteUrl },
        { '@type': 'ListItem', position: 2, name: 'Danh mục', item: `${siteUrl}/danh-muc` },
        { '@type': 'ListItem', position: 3, name: name.value, item: `${siteUrl}/danh-muc/${slug.value}` },
      ],
    },
  ],
  'collection',
)
</script>

<template>
  <section class="mx-auto max-w-content px-4 py-16 md:px-8">
    <NuxtLink
      to="/danh-muc"
      class="inline-flex items-center gap-1 font-sans text-sm text-silver transition hover:text-paper focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hopper"
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-3.5 w-3.5" aria-hidden="true"><polyline points="15 18 9 12 15 6"/></svg>
      Danh mục
    </NuxtLink>

    <h1 class="mt-6 font-display text-3xl uppercase leading-[1.4] tracking-tight text-paper md:text-4xl">{{ name }}</h1>
    <p class="mt-2 font-sans text-sm text-silver">{{ products.length }} sản phẩm</p>

    <div v-if="products.length" class="mt-10 grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
      <ProductCard v-for="(p, i) in products" :key="p.slug" :product="p" :priority="i === 0" />
    </div>
    <p v-else class="py-20 text-center font-sans text-sm text-silver">
      Chưa có sản phẩm trong danh mục này. Nhắn shop để đặt mẫu riêng.
    </p>
  </section>
</template>
