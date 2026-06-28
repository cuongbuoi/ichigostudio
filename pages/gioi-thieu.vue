<script setup lang="ts">
const shop = useShop()
const { shop: shopConfig } = useAppConfig()
useSeoMeta({
  title: `Giới thiệu - ${shop.name}`,
  description: 'Câu chuyện xưởng figure in FDM tokusatsu và quy trình làm sản phẩm.',
})
const steps = [
  { t: 'Dựng và tinh chỉnh model', d: 'Chọn lọc và xử lý file 3D, căn chỉnh từng chi tiết trước khi in.' },
  { t: 'In FDM (PLA+) từng phần', d: 'In trên máy FDM, xử lý vân lớp và ráp ghép cẩn thận từng mảnh.' },
  { t: 'Sơn thủ công nhiều lớp', d: 'Lên màu, tô bóng và phủ lớp bảo vệ để figure bền màu khi trưng bày.' },
]
const processImages = [
  { src: 'https://picsum.photos/seed/about-fdm-1/800/600', alt: 'Xưởng in FDM figure tokusatsu - hình 1' },
  { src: 'https://picsum.photos/seed/about-fdm-2/800/600', alt: 'Xưởng in FDM figure tokusatsu - hình 2' },
  { src: 'https://picsum.photos/seed/about-fdm-3/800/600', alt: 'Xưởng in FDM figure tokusatsu - hình 3' },
]
</script>

<template>
  <section class="mx-auto max-w-content px-4 py-16 md:px-8">
    <div class="max-w-[60ch]">
      <h1 class="font-display text-4xl uppercase tracking-tight text-paper md:text-5xl">
        LÀM FIGURE VÌ MÊ TOKUSATSU
      </h1>
      <p class="mt-6 font-sans text-sm font-light leading-relaxed text-silver">
        {{ shop.name }} là xưởng nhỏ chuyên figure in FDM các nhân vật tokusatsu.
        Số lượng giới hạn, tập trung vào độ chi tiết và nước sơn.
      </p>
    </div>

    <div class="mt-12 grid gap-4 md:grid-cols-3">
      <template v-for="(img, i) in processImages" :key="i">
        <template v-if="shopConfig.hasPhotos">
          <NuxtImg
            :src="img.src"
            :alt="img.alt"
            width="800"
            height="600"
            loading="lazy"
            class="aspect-[4/3] w-full rounded object-cover border border-paper/10"
          />
        </template>
        <template v-else>
          <FigurePlaceholder
            :label="img.alt"
            ratio="4/3"
            :seed="i"
          />
        </template>
      </template>
    </div>

    <!-- QUY TRINH section: FDM layer-line texture background -->
    <div class="mt-20">
      <h2 class="font-display text-2xl uppercase tracking-tight text-paper mb-8">QUY TRÌNH</h2>
      <div
        class="grid gap-px overflow-hidden rounded bg-panel border border-paper/10 md:grid-cols-3"
        style="background-image: repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(92,138,36,0.03) 3px, rgba(92,138,36,0.03) 4px);"
      >
        <div v-for="(s, i) in steps" :key="i" class="bg-panel p-8">
          <p class="font-display text-4xl text-hopper">{{ i + 1 }}</p>
          <h3 class="mt-3 font-sans text-base font-semibold text-paper">{{ s.t }}</h3>
          <p class="mt-2 font-sans text-sm font-light leading-relaxed text-silver">{{ s.d }}</p>
        </div>
      </div>
    </div>

    <div class="mt-20 flex flex-col items-start gap-4">
      <p class="font-display text-2xl uppercase text-paper">Muốn mẫu theo yêu cầu?</p>
      <MessengerButton label="Trao đổi với shop" />
    </div>
  </section>
</template>
