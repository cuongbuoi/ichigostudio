<script setup lang="ts">
import { filterBySeries } from '~/utils/products'
const { all, seriesList } = useProducts()
const active = ref('all')
const visible = computed(() => filterBySeries(all.value, active.value))

useSeoMeta({
  title: 'Bộ sưu tập - Ichigo Studio',
  description: 'Bộ sưu tập phụ kiện in 3D cho đồ chơi DX: Super Sentai, Kamen Rider, Beyblade.',
})
</script>

<template>
  <section class="mx-auto max-w-content px-4 py-16 md:px-8">
    <SectionHeading
      title="BỘ SƯU TẬP"
      subtitle="Phụ kiện và đế trưng bày in FDM cho đồ chơi DX, phối màu bằng nhựa. Lọc theo dòng bên dưới."
    />

    <SeriesFilter :series="seriesList" v-model="active" class="mb-10" />

    <div v-if="visible.length" class="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
      <ProductCard v-for="p in visible" :key="p.slug" :product="p" />
    </div>
    <p v-else class="py-20 text-center font-sans text-sm text-silver">
      Chưa có sản phẩm trong series này. Nhắn shop để đặt mẫu riêng.
    </p>
  </section>
</template>
