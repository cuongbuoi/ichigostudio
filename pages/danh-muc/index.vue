<script setup lang="ts">
const { categories } = useCategories()
const { all } = useProducts()

// Ghép mỗi danh mục với số SP + ảnh bìa (SP đầu tiên có cover).
const cards = computed(() =>
  categories.value.map((c) => {
    const inCat = all.value.filter(p => p.categorySlug === c.slug)
    return { name: c.name, slug: c.slug, count: inCat.length, cover: inCat.find(p => p.cover)?.cover ?? '' }
  }),
)

const { public: { siteUrl } } = useRuntimeConfig()

useSeoMeta({
  title: 'Danh mục sản phẩm - Ichigo Studio',
  description: 'Danh mục sản phẩm thiết kế và in 3D cho đồ chơi DX, prop và phụ kiện Tokusatsu của Ichigo Studio.',
})

useJsonLd(
  {
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Trang chủ', item: siteUrl },
      { '@type': 'ListItem', position: 2, name: 'Danh mục', item: `${siteUrl}/danh-muc` },
    ],
  },
  'breadcrumb',
)
</script>

<template>
  <section class="mx-auto max-w-content px-4 py-16 md:px-8">
    <SectionHeading
      as="h1"
      title="DANH MỤC"
      subtitle="Chọn dòng bạn đang chơi để xem phụ kiện."
    />

    <div v-if="cards.length" class="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      <NuxtLink
        v-for="c in cards"
        :key="c.slug"
        :to="`/danh-muc/${c.slug}`"
        class="group relative overflow-hidden rounded border border-paper/10 bg-panel transition hover:border-hopper focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hopper"
      >
        <NuxtImg
          v-if="c.cover"
          :src="c.cover"
          :alt="c.name"
          loading="lazy"
          width="400"
          class="aspect-[4/3] w-full object-cover opacity-70 transition duration-500 group-hover:opacity-100 group-hover:scale-[1.04]"
        />
        <div v-else class="aspect-[4/3] w-full bg-panel2"></div>
        <div class="pointer-events-none absolute inset-0 bg-gradient-to-t from-night/90 via-night/40 to-transparent"></div>
        <div class="absolute inset-x-0 bottom-0 p-3">
          <p class="font-display text-base uppercase leading-tight tracking-tight text-paper md:text-lg">{{ c.name }}</p>
          <p class="font-sans text-[11px] text-silver">{{ c.count }} sản phẩm</p>
        </div>
      </NuxtLink>
    </div>
    <p v-else class="py-20 text-center font-sans text-sm text-silver">
      Chưa có danh mục nào. Nhắn shop để đặt mẫu riêng.
    </p>
  </section>
</template>
