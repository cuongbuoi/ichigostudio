<script setup lang="ts">
import { formatPostDate } from '~/composables/useBlog'

const { posts, categories } = useBlog()
const route = useRoute()
const active = ref(typeof route.query.category === 'string' ? route.query.category : 'all')
const visible = computed(() =>
  active.value === 'all' ? posts.value : posts.value.filter((p) => p.categorySlug === active.value),
)

useSeoMeta({
  title: 'Blog - Ichigo Studio',
  description: 'Bài viết, hướng dẫn và tin tức về mô hình in 3D, phụ kiện tokusatsu DX từ Ichigo Studio.',
})

const { public: { siteUrl } } = useRuntimeConfig()
useJsonLd(
  () => [
    {
      '@type': 'CollectionPage',
      name: 'Blog',
      url: `${siteUrl}/blog`,
      mainEntity: {
        '@type': 'ItemList',
        numberOfItems: posts.value.length,
        itemListElement: posts.value.map((p, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          url: `${siteUrl}/blog/${p.slug}`,
          name: p.title,
        })),
      },
    },
    {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Trang chủ', item: siteUrl },
        { '@type': 'ListItem', position: 2, name: 'Blog', item: `${siteUrl}/blog` },
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
      title="BLOG"
      subtitle="Hướng dẫn, tin tức & hậu trường in 3D"
    />

    <!-- Bộ lọc danh mục -->
    <div v-if="categories.length" class="mb-10 flex flex-wrap gap-2">
      <button
        type="button"
        class="rounded-full border px-4 py-1.5 font-sans text-xs font-medium tracking-[0.1em] transition"
        :class="active === 'all' ? 'border-hopper bg-hopper/10 text-paper' : 'border-paper/15 text-silver hover:text-paper'"
        @click="active = 'all'"
      >TẤT CẢ</button>
      <button
        v-for="c in categories"
        :key="c.slug"
        type="button"
        class="rounded-full border px-4 py-1.5 font-sans text-xs font-medium tracking-[0.1em] uppercase transition"
        :class="active === c.slug ? 'border-hopper bg-hopper/10 text-paper' : 'border-paper/15 text-silver hover:text-paper'"
        @click="active = c.slug"
      >{{ c.name }}</button>
    </div>

    <div v-if="visible.length" class="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
      <NuxtLink
        v-for="p in visible"
        :key="p.slug"
        :to="`/blog/${p.slug}`"
        class="group flex flex-col overflow-hidden rounded-lg border border-paper/10 bg-panel transition hover:border-hopper/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-hopper"
      >
        <div class="aspect-[16/10] overflow-hidden bg-night">
          <NuxtImg
            v-if="p.coverImage"
            :src="p.coverImage"
            :alt="p.title"
            class="h-full w-full object-cover transition duration-500 group-hover:scale-105"
            loading="lazy"
          />
          <div v-else class="flex h-full w-full items-center justify-center text-silver/40 font-display text-sm">ICHIGO</div>
        </div>
        <div class="flex flex-1 flex-col p-5">
          <p v-if="p.categoryName" class="font-sans text-[10px] uppercase tracking-[0.18em] text-hopper font-medium">{{ p.categoryName }}</p>
          <h2 class="mt-2 font-display text-lg uppercase leading-snug tracking-tight text-paper">{{ p.title }}</h2>
          <p v-if="p.excerpt" class="mt-2 flex-1 font-sans text-sm leading-relaxed text-silver line-clamp-3">{{ p.excerpt }}</p>
          <p class="mt-4 font-sans text-xs text-silver/60">{{ formatPostDate(p.publishedAt) }}</p>
        </div>
      </NuxtLink>
    </div>
    <p v-else class="py-20 text-center font-sans text-sm text-silver">
      Chưa có bài viết nào. Ghé lại sau nhé!
    </p>
  </section>
</template>
