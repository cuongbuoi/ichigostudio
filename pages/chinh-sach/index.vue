<script setup lang="ts">
import { POLICIES } from '~/utils/policies'
import { breadcrumbJsonLd, type Crumb } from '~/utils/structured-data'

const { public: { siteUrl } } = useRuntimeConfig()
const url = `${siteUrl}/chinh-sach`
const crumbs: Crumb[] = [{ name: 'Trang chủ', to: '/' }, { name: 'Chính sách' }]

useSeoMeta({
  title: 'Chính sách mua hàng, vận chuyển và đổi trả | Ichigo Studio',
  description: 'Tổng hợp chính sách mua hàng của Ichigo Studio: vận chuyển và giao hàng, đổi trả và bảo hành, thanh toán và huỷ đơn, bảo mật thông tin khách hàng.',
})

useJsonLd(
  [
    {
      '@type': 'CollectionPage',
      name: 'Chính sách mua hàng',
      url,
      inLanguage: 'vi-VN',
      isPartOf: { '@id': `${siteUrl}/#website` },
      hasPart: POLICIES.map((p) => ({ '@type': 'WebPage', name: p.h1, url: `${siteUrl}/chinh-sach/${p.slug}` })),
    },
    breadcrumbJsonLd(crumbs, siteUrl, url),
  ],
  'policies',
)
</script>

<template>
  <section class="mx-auto max-w-content px-4 py-12 md:px-8">
    <Breadcrumbs :items="crumbs" />
    <div class="mt-6">
      <SectionHeading as="h1" title="CHÍNH SÁCH" subtitle="Vận chuyển, đổi trả, thanh toán và bảo mật thông tin khi mua hàng tại Ichigo Studio." />
    </div>
    <ul class="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <li v-for="p in POLICIES" :key="p.slug">
        <NuxtLink
          :to="`/chinh-sach/${p.slug}`"
          class="block h-full rounded-lg border border-paper/10 bg-panel p-6 transition hover:border-hopper/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hopper"
        >
          <h2 class="font-display text-lg uppercase tracking-tight text-paper">{{ p.h1 }}</h2>
          <p class="mt-2 font-sans text-sm font-light text-silver">{{ p.intro }}</p>
        </NuxtLink>
      </li>
    </ul>
  </section>
</template>
