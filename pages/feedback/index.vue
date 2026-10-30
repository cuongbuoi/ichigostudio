<script setup lang="ts">
const { all } = useFeedbacks()

// Masonry bằng flex-cột: mỗi cột là một stack độc lập -> ảnh so le, không canh hàng.
// Số cột co giãn theo bề rộng màn hình (mặc định 4 cho SSR/desktop).
const colCount = ref(4)
function updateCols() {
  const w = window.innerWidth
  colCount.value = w < 640 ? 2 : w < 1024 ? 3 : 4
}
onMounted(() => {
  updateCols()
  window.addEventListener('resize', updateCols, { passive: true })
})
onUnmounted(() => window.removeEventListener('resize', updateCols))

// Phân bổ xen kẽ (round-robin) để giữ thứ tự mới -> cũ và các cột cân nhau.
const columns = computed(() => {
  const cols: { imageUrl: string }[][] = Array.from({ length: colCount.value }, () => [])
  all.value.forEach((f, i) => cols[i % colCount.value].push(f))
  return cols
})

useSeoMeta({
  title: 'Feedback khách hàng - Ichigo Studio',
  description: 'Ảnh thật khách hàng gửi sau khi nhận sản phẩm in 3D từ Ichigo Studio.',
})
</script>

<template>
  <section class="mx-auto max-w-content px-4 py-16 md:px-8">
    <SectionHeading
      as="h1"
      title="FEEDBACK KHÁCH HÀNG"
      subtitle="Ảnh thật khách gửi sau khi nhận hàng — cảm ơn mọi người đã ủng hộ!"
    />

    <div v-if="all.length" class="flex items-start gap-3">
      <div v-for="(col, ci) in columns" :key="ci" class="flex min-w-0 flex-1 flex-col gap-3">
        <div
          v-for="(f, i) in col"
          :key="i"
          class="overflow-hidden rounded-lg border border-paper/10 bg-panel transition hover:border-hopper/40"
        >
          <NuxtImg
            :src="f.imageUrl"
            alt="Feedback khách hàng Ichigo Studio"
            loading="lazy"
            width="500"
            sizes="sm:50vw md:33vw lg:25vw"
            class="block h-auto w-full"
          />
        </div>
      </div>
    </div>
    <p v-else class="py-20 text-center font-sans text-sm text-silver">
      Chưa có feedback nào. Mua hàng và gửi ảnh cho shop nhé!
    </p>
  </section>
</template>
