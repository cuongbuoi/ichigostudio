<script setup lang="ts">
const shop = useShop()
const { featured } = useProducts()
useSeoMeta({
  title: `${shop.name} - Figure in 3D chủ đề tokusatsu`,
  description: shop.tagline,
})
</script>

<template>
  <!-- HERO: asymmetric split, gọn trong viewport, không center -->
  <section class="mx-auto grid max-w-content items-center gap-10 px-4 pt-16 pb-20 md:grid-cols-2 md:px-8 md:pt-24">
    <div>
      <h1 class="font-display text-4xl leading-[1.05] tracking-tight md:text-6xl">
        Hero tokusatsu,<br />tái hiện bằng in 3D.
      </h1>
      <p class="mt-5 max-w-[42ch] text-lg text-ink/65 dark:text-bone/65">
        {{ shop.tagline }} Sơn thủ công, chi tiết sắc nét, số lượng giới hạn.
      </p>
      <div class="mt-8 flex flex-wrap gap-3">
        <NuxtLink to="/san-pham"
          class="inline-flex items-center rounded-full bg-ink px-6 py-3 text-sm font-medium text-bone transition hover:opacity-90 active:scale-[0.98] dark:bg-bone dark:text-ink">
          Xem bộ sưu tập
        </NuxtLink>
        <MessengerButton variant="ghost" />
      </div>
    </div>
    <div class="overflow-hidden rounded-2xl bg-ink/5 dark:bg-bone/5">
      <NuxtImg src="https://picsum.photos/seed/toku-hero/1200/1400" alt="Figure tokusatsu in 3D"
        width="1200" height="1400" preload class="aspect-[6/7] w-full object-cover" />
    </div>
  </section>

  <!-- FEATURED -->
  <section class="mx-auto max-w-content px-4 md:px-8">
    <SectionHeading title="Sản phẩm nổi bật" subtitle="Vài mẫu được yêu thích nhất trong xưởng." />
    <div class="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
      <ProductCard v-for="p in featured" :key="p.slug" :product="p" />
    </div>
    <div class="mt-10">
      <NuxtLink to="/san-pham" class="text-sm font-medium text-accent hover:underline">Xem tất cả sản phẩm →</NuxtLink>
    </div>
  </section>

  <!-- ABOUT TEASER: layout khác (full-width split ngược) -->
  <section class="mt-24 bg-ink/[0.03] py-20 dark:bg-bone/[0.03]">
    <div class="mx-auto grid max-w-content items-center gap-10 px-4 md:grid-cols-5 md:px-8">
      <div class="overflow-hidden rounded-2xl md:col-span-2">
        <NuxtImg src="https://picsum.photos/seed/toku-workshop/900/900" alt="Xưởng in 3D và sơn thủ công"
          width="900" height="900" loading="lazy" class="aspect-square w-full object-cover" />
      </div>
      <div class="md:col-span-3">
        <h2 class="font-display text-3xl tracking-tight md:text-4xl">Từ file 3D đến figure trưng bày</h2>
        <p class="mt-4 max-w-[55ch] text-ink/65 dark:text-bone/65">
          Mỗi sản phẩm đi qua in resin độ phân giải cao, xử lý bề mặt và sơn nhiều lớp bằng tay.
          Chúng tôi làm số lượng nhỏ để giữ chất lượng từng con.
        </p>
        <NuxtLink to="/gioi-thieu" class="mt-6 inline-block text-sm font-medium text-accent hover:underline">Tìm hiểu quy trình →</NuxtLink>
      </div>
    </div>
  </section>

  <!-- CTA -->
  <section class="mx-auto max-w-content px-4 py-24 text-center md:px-8">
    <h2 class="mx-auto max-w-[20ch] font-display text-3xl tracking-tight md:text-4xl">Tìm thấy con bạn thích?</h2>
    <p class="mx-auto mt-3 max-w-[45ch] text-ink/60 dark:text-bone/60">Nhắn shop qua Messenger để hỏi giá, đặt màu sơn hoặc mẫu theo yêu cầu.</p>
    <div class="mt-8 flex justify-center"><MessengerButton /></div>
  </section>
</template>
