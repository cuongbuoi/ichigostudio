<script setup lang="ts">
const shop = useShop()
useSeoMeta({
  title: `Giới thiệu - ${shop.name}`,
  description: 'Câu chuyện xưởng phụ kiện in 3D cho đồ chơi DX và quy trình làm sản phẩm.',
})
const steps = [
  { t: 'Dựng model khớp đồ chơi', d: 'Đo và dựng file 3D vừa khít với đồ chơi DX, căn chỉnh trước khi in.' },
  { t: 'In FDM (PLA+) từng phần', d: 'In trên máy FDM, xử lý vân lớp và ráp ghép cẩn thận từng mảnh.' },
  { t: 'Phối màu bằng nhựa', d: 'Lên màu trực tiếp khi in bằng nhựa (AMS), không dùng sơn, chọn phối màu khi đặt.' },
]
const processImages = [
  'Xưởng in 3D phụ kiện DX - hình 1',
  'Xưởng in 3D phụ kiện DX - hình 2',
  'Xưởng in 3D phụ kiện DX - hình 3',
]
</script>

<template>
  <section class="mx-auto max-w-content px-4 py-16 md:px-8">
    <div class="max-w-[60ch]">
      <h1 class="font-display text-4xl uppercase leading-[1.5] tracking-tight text-paper md:text-5xl md:leading-[1.5]">
        PHỤ KIỆN IN 3D CHO ĐỒ CHƠI DX
      </h1>
      <p class="mt-6 font-sans text-sm font-light leading-relaxed text-silver">
        {{ shop.name }} là xưởng nhỏ chuyên phụ kiện và đế trưng bày in FDM cho đồ chơi DX:
        Super Sentai, Kamen Rider, Beyblade và hơn thế. Số lượng giới hạn, tập trung vào độ vừa khít và phối màu nhựa.
      </p>
    </div>

    <div class="mt-12 grid gap-4 md:grid-cols-3">
      <FigurePlaceholder
        v-for="(label, i) in processImages"
        :key="i"
        :label="label"
        ratio="4/3"
        :seed="i"
      />
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
