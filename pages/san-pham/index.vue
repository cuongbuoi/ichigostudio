<script setup lang="ts">
import { filterBySeries } from '~/utils/products'
const { all, seriesList } = useProducts()
const active = ref('all')
const visible = computed(() => filterBySeries(all.value, active.value))

useSeoMeta({
  title: 'Bo suu tap - Henshin Studio',
  description: 'Bo suu tap figure in FDM chu de tokusatsu, son thu cong.',
})
</script>

<template>
  <section class="mx-auto max-w-content px-4 py-16 md:px-8">
    <SectionHeading
      title="BO SUU TAP"
      subtitle="Moi model in FDM (PLA+), xu ly be mat va hoan thien son thu cong. Loc theo series ben duoi."
    />

    <SeriesFilter :series="seriesList" v-model="active" class="mb-10" />

    <div v-if="visible.length" class="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
      <ProductCard v-for="p in visible" :key="p.slug" :product="p" />
    </div>
    <p v-else class="py-20 text-center font-sans text-sm text-silver">
      Chua co san pham trong series nay. Nhan shop de dat mau rieng.
    </p>
  </section>
</template>
