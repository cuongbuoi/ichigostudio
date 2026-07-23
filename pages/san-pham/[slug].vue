<script setup lang="ts">
import MarkdownIt from 'markdown-it'
import { mapApiProduct, formatPrice } from '~/utils/products'

const route = useRoute()
const slug = computed(() => String(route.params.slug))
const { public: { apiBase } } = useRuntimeConfig()
const { related } = useProducts()
const shop = useShop()

const { data: product } = await useAsyncData(`product-${slug.value}`, async () => {
  try {
    const api = await $fetch<any>(`${apiBase}/public/products/${slug.value}`)
    return mapApiProduct(api)
  } catch {
    return null
  }
})

if (!product.value) {
  throw createError({ statusCode: 404, statusMessage: 'Không tìm thấy sản phẩm' })
}

const md = new MarkdownIt()
const bodyHtml = computed(() => md.render(product.value?.bodyMd ?? ''))

const relatedItems = computed(() =>
  product.value ? related(product.value as any) : []
)

useSeoMeta({
  title: () => `${product.value?.title} - Ichigo Studio`,
  description: () => `${product.value?.title} - ${product.value?.series}. Phụ kiện in 3D cho đồ chơi DX, in FDM.`,
  ogImage: () => product.value?.cover,
})
</script>

<template>
  <article v-if="product" class="mx-auto max-w-6xl px-4 py-12 md:px-8">
    <NuxtLink
      to="/san-pham"
      class="inline-flex items-center gap-1 font-sans text-sm text-silver hover:text-paper transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hopper"
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-3.5 w-3.5" aria-hidden="true"><polyline points="15 18 9 12 15 6"/></svg>
      Bộ sưu tập
    </NuxtLink>

    <div class="mt-6 grid grid-cols-1 gap-10 lg:grid-cols-2">
      <ProductGallery :images="product.images" :alt="product.title" />

      <div class="lg:py-4">
        <!-- 1 eyebrow per page: series label -->
        <p class="font-sans text-[10px] uppercase tracking-[0.18em] text-hopper font-medium">{{ product.series }}</p>
        <h1 class="mt-2 font-display text-3xl uppercase leading-[1.5] tracking-tight text-paper md:text-4xl md:leading-[1.5]">
          {{ product.title }}
        </h1>

        <!-- Specs: "mecha readout" style - grouped, hairline separators -->
        <dl class="mt-6 border-t border-paper/10 pt-4 font-sans">
          <div class="py-3 border-b border-paper/10">
            <dt class="text-[10px] uppercase tracking-[0.12em] text-silver font-medium">Chất liệu</dt>
            <dd class="mt-0.5 text-sm font-medium text-paper">{{ product.material }}</dd>
          </div>
          <div class="pt-3">
            <dt class="text-[10px] uppercase tracking-[0.12em] text-silver font-medium">Giá tham khảo</dt>
            <dd class="mt-0.5 text-sm font-medium text-hopper">{{ formatPrice(product.price) }}</dd>
          </div>
        </dl>

        <div class="prose prose-sm mt-6 max-w-none" style="color: rgba(238,240,232,0.75);" v-html="bodyHtml" />

        <div class="mt-8">
          <MessengerButton :label="`HỎI MUA ${product.title}`" />
          <p class="mt-2 font-sans text-xs text-silver/70">{{ shop.responseTime }}</p>
        </div>
      </div>
    </div>

    <section v-if="relatedItems.length" class="mt-20" aria-label="Sản phẩm cùng series">
      <h2 class="font-display text-2xl uppercase tracking-tight text-paper mb-8">CÙNG SERIES</h2>
      <div class="grid grid-cols-2 gap-6 lg:grid-cols-4">
        <ProductCard v-for="p in relatedItems" :key="p.slug" :product="p" />
      </div>
    </section>
  </article>
</template>
