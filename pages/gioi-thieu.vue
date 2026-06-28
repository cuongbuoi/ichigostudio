<script setup lang="ts">
const shop = useShop()
useSeoMeta({
  title: `Giới thiệu - ${shop.name}`,
  description: 'Câu chuyện xưởng figure in 3D tokusatsu và quy trình làm sản phẩm.',
})
const steps = [
  { t: 'Dựng & tinh chỉnh model', d: 'Chọn lọc và xử lý file 3D, căn chỉnh chi tiết trước khi in.' },
  { t: 'In resin độ phân giải cao', d: 'In từng phần, làm sạch bề mặt và lắp ghép cẩn thận.' },
  { t: 'Sơn thủ công nhiều lớp', d: 'Lên màu, đổ bóng và phủ bảo vệ để model bền màu khi trưng bày.' },
]
</script>

<template>
  <section class="mx-auto max-w-content px-4 py-16 md:px-8">
    <div class="max-w-[60ch]">
      <h1 class="font-display text-4xl tracking-tight md:text-5xl">Làm figure vì mê tokusatsu</h1>
      <p class="mt-6 text-lg text-ink/65 dark:text-bone/65">
        {{ shop.name }} là xưởng nhỏ chuyên figure in 3D các nhân vật tokusatsu.
        Chúng tôi làm số lượng giới hạn, tập trung vào độ chi tiết và nước sơn.
      </p>
    </div>

    <div class="mt-12 grid gap-6 md:grid-cols-3">
      <NuxtImg v-for="n in 3" :key="n" :src="`https://picsum.photos/seed/about-${n}/800/600`"
        :alt="`Hình ảnh xưởng ${n}`" width="800" height="600" loading="lazy"
        class="aspect-[4/3] w-full rounded-xl object-cover" />
    </div>

    <div class="mt-20">
      <SectionHeading title="Quy trình" />
      <div class="grid gap-px overflow-hidden rounded-2xl bg-ink/10 dark:bg-bone/10 md:grid-cols-3">
        <div v-for="(s, i) in steps" :key="i" class="bg-bone p-8 dark:bg-ink">
          <p class="font-display text-4xl text-accent">{{ i + 1 }}</p>
          <h3 class="mt-3 font-display text-lg">{{ s.t }}</h3>
          <p class="mt-2 text-sm text-ink/60 dark:text-bone/60">{{ s.d }}</p>
        </div>
      </div>
    </div>

    <div class="mt-20 flex flex-col items-start gap-4">
      <p class="font-display text-2xl">Muốn một mẫu theo yêu cầu?</p>
      <MessengerButton label="Trao đổi với shop" />
    </div>
  </section>
</template>
