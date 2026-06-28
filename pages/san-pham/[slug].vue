<script setup lang="ts">
const route = useRoute()
const slug = computed(() => String(route.params.slug))

const { related } = useProducts()
const shop = useShop()

const { data: product } = await useAsyncData(`product-${slug.value}`, () =>
  queryCollection('products').where('slug', '=', slug.value).first()
)

if (!product.value) {
  throw createError({ statusCode: 404, statusMessage: 'Khong tim thay san pham' })
}

const relatedItems = computed(() =>
  product.value ? related(product.value as any) : []
)

useSeoMeta({
  title: () => `${product.value?.title} - Henshin Studio`,
  description: () => `Figure ${product.value?.title}, ${product.value?.series}, ti le ${product.value?.scale}. In FDM, son thu cong.`,
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
      Bo suu tap
    </NuxtLink>

    <div class="mt-6 grid grid-cols-1 gap-10 lg:grid-cols-2">
      <ProductGallery :images="product.images" :alt="product.title" />

      <div class="lg:py-4">
        <!-- 1 eyebrow per page: series label -->
        <p class="font-sans text-[10px] uppercase tracking-[0.18em] text-hopper font-medium">{{ product.series }}</p>
        <h1 class="mt-2 font-display text-3xl uppercase tracking-tight text-paper md:text-4xl">
          {{ product.title }}
        </h1>

        <!-- Specs: "mecha readout" style - grouped, hairline separators -->
        <dl class="mt-6 border-t border-paper/10 pt-4 font-sans">
          <div class="grid grid-cols-2 gap-x-6 gap-y-3 text-sm pb-4 border-b border-paper/10">
            <div>
              <dt class="text-[10px] uppercase tracking-[0.12em] text-silver font-medium">Ti le</dt>
              <dd class="mt-0.5 font-medium text-paper">{{ product.scale }}</dd>
            </div>
            <div>
              <dt class="text-[10px] uppercase tracking-[0.12em] text-silver font-medium">Chieu cao</dt>
              <dd class="mt-0.5 font-medium text-paper">{{ product.height }}</dd>
            </div>
          </div>
          <div class="py-3 border-b border-paper/10">
            <dt class="text-[10px] uppercase tracking-[0.12em] text-silver font-medium">Chat lieu</dt>
            <dd class="mt-0.5 text-sm font-medium text-paper">{{ product.material }}</dd>
          </div>
          <div class="pt-3">
            <dt class="text-[10px] uppercase tracking-[0.12em] text-silver font-medium">Gia tham khao</dt>
            <dd class="mt-0.5 text-sm font-medium text-hopper">{{ product.priceRef }}</dd>
          </div>
        </dl>

        <div class="prose prose-sm mt-6 max-w-none" style="color: rgba(238,240,232,0.75);">
          <ContentRenderer :value="product" />
        </div>

        <div class="mt-8">
          <MessengerButton :label="`HOI MUA ${product.title}`" />
          <p class="mt-2 font-sans text-xs text-silver/70">{{ shop.responseTime }}</p>
        </div>
      </div>
    </div>

    <section v-if="relatedItems.length" class="mt-20" aria-label="San pham cung series">
      <h2 class="font-display text-2xl uppercase tracking-tight text-paper mb-8">CUNG SERIES</h2>
      <div class="grid grid-cols-2 gap-6 lg:grid-cols-4">
        <ProductCard v-for="p in relatedItems" :key="p.slug" :product="p" />
      </div>
    </section>
  </article>
</template>
