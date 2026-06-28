<script setup lang="ts">
const route = useRoute()
const slug = computed(() => String(route.params.slug))

const { related } = useProducts()
const shop = useShop()

const { data: product } = await useAsyncData(`product-${slug.value}`, () =>
  queryCollection('products').where('slug', '=', slug.value).first()
)

if (!product.value) {
  throw createError({ statusCode: 404, statusMessage: 'Không tìm thấy sản phẩm' })
}

const relatedItems = computed(() =>
  product.value ? related(product.value as any) : []
)

useSeoMeta({
  title: () => `${product.value?.title} - Henshin Studio`,
  description: () =>
    `Figure ${product.value?.title}, ${product.value?.series}, tỉ lệ ${product.value?.scale}.`,
  ogImage: () => product.value?.cover,
})
</script>

<template>
  <article v-if="product" class="mx-auto max-w-6xl px-4 py-12 md:px-8">
    <NuxtLink
      to="/san-pham"
      class="inline-flex items-center gap-1 text-sm text-ink/65 hover:text-ink dark:text-bone/65 dark:hover:text-bone transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-3.5 w-3.5" aria-hidden="true"><polyline points="15 18 9 12 15 6"/></svg>
      Bộ sưu tập
    </NuxtLink>

    <div class="mt-6 grid grid-cols-1 gap-10 lg:grid-cols-2">
      <ProductGallery :images="product.images" :alt="product.title" />

      <div class="lg:py-4">
        <p class="text-sm uppercase tracking-wide text-accent">{{ product.series }}</p>
        <h1 class="mt-2 font-display text-3xl font-bold md:text-4xl tracking-tight">
          {{ product.title }}
        </h1>

        <dl class="mt-6 grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
          <div>
            <dt class="text-ink/65 dark:text-bone/65">Tỉ lệ</dt>
            <dd class="mt-0.5 font-medium">{{ product.scale }}</dd>
          </div>
          <div>
            <dt class="text-ink/65 dark:text-bone/65">Chiều cao</dt>
            <dd class="mt-0.5 font-medium">{{ product.height }}</dd>
          </div>
          <div class="col-span-2">
            <dt class="text-ink/65 dark:text-bone/65">Chất liệu</dt>
            <dd class="mt-0.5 font-medium">{{ product.material }}</dd>
          </div>
          <div>
            <dt class="text-ink/65 dark:text-bone/65">Giá tham khảo</dt>
            <dd class="mt-0.5 font-medium">{{ product.priceRef }}</dd>
          </div>
        </dl>

        <div class="prose prose-sm mt-6 max-w-none text-ink/80 dark:prose-invert dark:text-bone/80">
          <ContentRenderer :value="product" />
        </div>

        <div class="mt-8">
          <MessengerButton :label="`Hỏi mua ${product.title}`" />
          <p class="mt-2 text-xs text-ink/65 dark:text-bone/65">{{ shop.responseTime }}</p>
        </div>
      </div>
    </div>

    <section v-if="relatedItems.length" class="mt-20" aria-label="Sản phẩm cùng series">
      <SectionHeading title="Cùng series" />
      <div class="mt-8 grid grid-cols-2 gap-6 lg:grid-cols-4">
        <ProductCard v-for="p in relatedItems" :key="p.slug" :product="p" />
      </div>
    </section>
  </article>
</template>
