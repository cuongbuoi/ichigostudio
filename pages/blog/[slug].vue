<script setup lang="ts">
import { formatPostDate } from '~/composables/useBlog'
import { stripLatinRuby } from '~/utils/blog-html'
import { filterByCategory } from '~/utils/products'

const route = useRoute()
const slug = computed(() => String(route.params.slug))
const { public: { apiBase } } = useRuntimeConfig()
const { relatedByCategory } = useBlog()

const { data: post } = await useAsyncData(`post-${slug.value}`, async () => {
  try {
    return await $fetch<any>(`${apiBase}/public/posts/${slug.value}`)
  } catch {
    return null
  }
})

if (!post.value) {
  throw createError({ statusCode: 404, statusMessage: 'Không tìm thấy bài viết' })
}

// bodyHtml đã được sanitize phía admin (DOMPurify) trước khi lưu.
// stripLatinRuby: gỡ furigana bị gắn nhầm lên chữ Việt khi clone guide Bandai.
const bodyHtml = computed(() => stripLatinRuby(post.value?.bodyHtml ?? ''))
const related = computed(() => relatedByCategory(slug.value, post.value?.categorySlug ?? null))

// Sản phẩm thuộc danh mục admin gắn cho bài ("Sản phẩm liên quan").
const { all: allProducts } = useProducts()
const productCategorySlug = computed<string | null>(() => post.value?.productCategorySlug ?? null)
const accessories = computed(() =>
  productCategorySlug.value ? filterByCategory(allProducts.value, productCategorySlug.value).slice(0, 4) : [],
)

useSeoMeta({
  title: () => `${post.value?.title} - Ichigo Studio`,
  description: () => post.value?.excerpt || `${post.value?.title} - Blog Ichigo Studio`,
  ogTitle: () => post.value?.title,
  ogDescription: () => post.value?.excerpt || undefined,
  ogImage: () => post.value?.coverImage || undefined,
  ogType: 'article',
  articlePublishedTime: () => (post.value?.publishedAt ? new Date(post.value.publishedAt).toISOString() : undefined),
})

// JSON-LD: BlogPosting + Breadcrumb.
const { public: { siteUrl } } = useRuntimeConfig()
if (post.value) {
  const p = post.value
  const url = `${siteUrl}/blog/${p.slug}`
  const published = p.publishedAt ? new Date(p.publishedAt).toISOString() : undefined
  const modified = p.updatedAt && p.updatedAt > (p.publishedAt ?? 0) ? new Date(p.updatedAt).toISOString() : published
  useJsonLd(
    [
      {
        '@type': 'BlogPosting',
        headline: p.title,
        ...(p.coverImage ? { image: [p.coverImage] } : {}),
        ...(p.excerpt ? { description: p.excerpt } : {}),
        ...(published ? { datePublished: published, dateModified: modified } : {}),
        ...(p.categoryName ? { articleSection: p.categoryName } : {}),
        inLanguage: 'vi-VN',
        author: { '@type': 'Organization', name: 'Ichigo Studio' },
        publisher: { '@id': `${siteUrl}/#organization` },
        mainEntityOfPage: url,
        url,
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Trang chủ', item: siteUrl },
          { '@type': 'ListItem', position: 2, name: 'Blog', item: `${siteUrl}/blog` },
          { '@type': 'ListItem', position: 3, name: p.title, item: url },
        ],
      },
    ],
    'article',
  )
}
</script>

<template>
  <article v-if="post" class="mx-auto max-w-3xl px-4 py-12 md:px-8">
    <NuxtLink
      to="/blog"
      class="inline-flex items-center gap-1 font-sans text-sm text-silver transition hover:text-paper focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hopper"
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-3.5 w-3.5" aria-hidden="true"><polyline points="15 18 9 12 15 6"/></svg>
      Blog
    </NuxtLink>

    <header class="mt-6">
      <p v-if="post.categoryName" class="font-sans text-[10px] uppercase tracking-[0.18em] text-hopper font-medium">{{ post.categoryName }}</p>
      <h1 class="mt-2 font-display text-3xl uppercase leading-[1.4] tracking-tight text-paper md:text-4xl md:leading-[1.4]">{{ post.title }}</h1>
      <p class="mt-3 font-sans text-xs text-silver/70">{{ formatPostDate(post.publishedAt) }}</p>
    </header>

    <!-- Khung 4:3 giữ chỗ trước khi ảnh tải (cover là trang hướng dẫn dọc, không biết trước tỉ lệ) để không đẩy nội dung (CLS). -->
    <NuxtImg
      v-if="post.coverImage"
      :src="post.coverImage"
      :alt="post.title"
      width="768"
      height="576"
      class="mt-8 aspect-[4/3] w-full rounded-lg border border-paper/10 bg-panel object-contain"
      loading="eager"
      fetchpriority="high"
    />

    <div
      class="prose prose-invert prose-sm mt-8 max-w-none prose-headings:font-display prose-headings:uppercase prose-headings:tracking-tight prose-a:text-hopper"
      style="color: rgba(238,240,232,0.8);"
      v-html="bodyHtml"
    />

    <section v-if="accessories.length" class="mt-12 border-t border-paper/10 pt-10" aria-label="Sản phẩm liên quan">
      <div class="mb-6 flex flex-wrap items-baseline justify-between gap-2">
        <h2 class="font-display text-xl uppercase tracking-tight text-paper">PHỤ KIỆN CHO {{ post.productCategoryName }}</h2>
        <NuxtLink
          :to="`/danh-muc/${productCategorySlug}`"
          class="rounded font-sans text-xs uppercase tracking-[0.12em] text-hopper underline underline-offset-4 transition hover:text-hopper-bright focus-visible:outline focus-visible:outline-2 focus-visible:outline-hopper"
        >Xem tất cả</NuxtLink>
      </div>
      <div class="grid grid-cols-2 gap-6">
        <ProductCard v-for="p in accessories" :key="p.slug" :product="p" />
      </div>
    </section>

    <div class="mt-10 rounded border border-hopper/30 bg-panel p-6">
      <p class="font-sans text-sm text-silver">Theo dõi Ichigo Studio để xem mẫu mới và video in 3D:</p>
      <div class="mt-3"><SocialLinks source="blog" variant="buttons" /></div>
    </div>

    <section v-if="related.length" class="mt-16 border-t border-paper/10 pt-10" aria-label="Bài liên quan">
      <h2 class="mb-6 font-display text-xl uppercase tracking-tight text-paper">BÀI LIÊN QUAN</h2>
      <div class="grid grid-cols-1 gap-6 sm:grid-cols-3">
        <NuxtLink
          v-for="r in related"
          :key="r.slug"
          :to="`/blog/${r.slug}`"
          class="group flex flex-col overflow-hidden rounded-lg border border-paper/10 bg-panel transition hover:border-hopper/40"
        >
          <div class="aspect-[16/10] overflow-hidden bg-night">
            <NuxtImg v-if="r.coverImage" :src="r.coverImage" :alt="r.title" class="h-full w-full object-cover transition duration-500 group-hover:scale-105" loading="lazy" />
          </div>
          <div class="p-4">
            <h3 class="font-display text-sm uppercase leading-snug tracking-tight text-paper">{{ r.title }}</h3>
            <p class="mt-1 font-sans text-xs text-silver/60">{{ formatPostDate(r.publishedAt) }}</p>
          </div>
        </NuxtLink>
      </div>
    </section>
  </article>
</template>
