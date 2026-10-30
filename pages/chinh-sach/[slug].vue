<script setup lang="ts">
import MarkdownIt from 'markdown-it'
import { getPolicy, POLICIES } from '~/utils/policies'
import { breadcrumbJsonLd, type Crumb } from '~/utils/structured-data'

const route = useRoute()
const policy = getPolicy(String(route.params.slug))
if (!policy) {
  throw createError({ statusCode: 404, statusMessage: 'Không tìm thấy trang' })
}

const { public: { siteUrl, apiBase } } = useRuntimeConfig()
const url = `${siteUrl}/chinh-sach/${policy.slug}`

// html tắt: nội dung do shop soạn trong utils/policies.ts, chỉ cần Markdown cơ bản.
const md = new MarkdownIt({ linkify: true })
const sections = policy.sections.map((s) => ({ heading: s.heading, html: md.render(s.body) }))
const others = POLICIES.filter((p) => p.slug !== policy.slug)

// Thông tin người bán nhập ở admin (Cài đặt > Thông tin người bán). Ô trống thì ẩn; API lỗi thì ẩn cả khối.
interface Seller { name: string; address: string; phone: string; email: string }
const { data: seller } = await useAsyncData('seller', () =>
  $fetch<Seller>(`${apiBase}/public/seller`).catch(() => null),
)
const sellerRows = computed(() =>
  [
    { label: 'Người bán', value: seller.value?.name },
    { label: 'Địa chỉ', value: seller.value?.address },
    { label: 'Điện thoại', value: seller.value?.phone },
    { label: 'Email', value: seller.value?.email },
  ].filter((r) => r.value),
)

const crumbs: Crumb[] = [
  { name: 'Trang chủ', to: '/' },
  { name: 'Chính sách', to: '/chinh-sach' },
  { name: policy.name },
]

useSeoMeta({
  title: policy.title,
  description: policy.description,
  ogTitle: policy.title,
  ogDescription: policy.description,
})

useJsonLd(
  [
    {
      '@type': 'WebPage',
      '@id': `${url}#webpage`,
      name: policy.h1,
      description: policy.description,
      url,
      inLanguage: 'vi-VN',
      dateModified: policy.updated,
      isPartOf: { '@id': `${siteUrl}/#website` },
      about: { '@id': `${siteUrl}/#organization` },
    },
    breadcrumbJsonLd(crumbs, siteUrl, url),
  ],
  'policy',
)
</script>

<template>
  <article class="mx-auto max-w-3xl px-4 py-12 md:px-8">
    <Breadcrumbs :items="crumbs" />

    <header class="mt-6">
      <h1 class="font-display text-3xl uppercase leading-[1.4] tracking-tight text-paper md:text-4xl md:leading-[1.4]">{{ policy.h1 }}</h1>
      <p class="mt-3 font-sans text-xs text-silver/70">
        Cập nhật: <time :datetime="policy.updated">{{ policy.updated.split('-').reverse().join('/') }}</time>
      </p>
      <p class="mt-6 font-sans text-sm font-light leading-relaxed text-silver">{{ policy.intro }}</p>
    </header>

    <div class="mt-10 space-y-10">
      <section v-for="s in sections" :key="s.heading">
        <h2 class="font-display text-xl uppercase tracking-tight text-paper">{{ s.heading }}</h2>
        <div
          class="prose prose-invert prose-sm mt-3 max-w-none prose-a:text-hopper prose-li:my-1"
          style="color: rgba(238,240,232,0.8);"
          v-html="s.html"
        />
      </section>
    </div>

    <section class="mt-12 rounded border border-hopper/30 bg-panel p-6" aria-label="Liên hệ">
      <dl v-if="sellerRows.length" class="mb-5 space-y-2 font-sans text-sm">
        <div v-for="r in sellerRows" :key="r.label" class="flex flex-wrap gap-x-2">
          <dt class="text-silver/70">{{ r.label }}:</dt>
          <dd class="text-paper">{{ r.value }}</dd>
        </div>
      </dl>
      <p class="font-sans text-sm text-silver">Nếu có câu hỏi về chính sách, bạn liên hệ Ichigo Studio qua Messenger.</p>
      <MessengerButton class="mt-4" variant="ghost" label="Liên hệ qua Messenger" :source="`policy-${policy.slug}`" />
    </section>

    <nav class="mt-12 border-t border-paper/10 pt-8" aria-label="Chính sách khác">
      <h2 class="font-sans text-[10px] uppercase tracking-[0.15em] text-silver font-medium">Chính sách khác</h2>
      <ul class="mt-3 flex flex-wrap gap-x-6 gap-y-2">
        <li v-for="p in others" :key="p.slug">
          <NuxtLink
            :to="`/chinh-sach/${p.slug}`"
            class="rounded font-sans text-sm text-hopper underline underline-offset-4 transition hover:text-hopper-bright focus-visible:outline focus-visible:outline-2 focus-visible:outline-hopper"
          >{{ p.h1 }}</NuxtLink>
        </li>
      </ul>
    </nav>
  </article>
</template>
