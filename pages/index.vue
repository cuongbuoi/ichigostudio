<script setup lang="ts">
const shop = useShop()
const { featured } = useProducts()
useSeoMeta({
  title: `${shop.name} - Figure in FDM chủ đề tokusatsu`,
  description: shop.tagline,
})
</script>

<template>
  <!-- HERO: asymmetric split, dark night, compound-eye watermark -->
  <section class="relative mx-auto grid max-w-content items-center gap-10 overflow-hidden px-4 pt-16 pb-20 md:grid-cols-2 md:px-8 md:pt-20">
    <!-- Speed-line hairlines (decorative, aria-hidden) -->
    <div class="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <div class="absolute right-0 top-0 h-full w-px bg-hopper/20" style="transform: rotate(-8deg) translateX(40%)"></div>
      <div class="absolute right-0 top-0 h-full w-px bg-hopper/10" style="transform: rotate(-8deg) translateX(45%)"></div>
    </div>

    <div class="relative z-10">
      <h1 class="font-display text-5xl uppercase leading-[0.95] tracking-tight text-paper md:text-7xl">
        HERO<br />TOKUSATSU<br />IN FDM.
      </h1>
      <p class="mt-5 max-w-[40ch] font-sans text-sm font-light leading-relaxed text-silver">
        Figure sơn tay, chi tiết sắc nét, số lượng giới hạn. Từ Showa đến Heisei.
      </p>
      <div class="mt-8 flex flex-wrap gap-3">
        <NuxtLink
          to="/san-pham"
          class="inline-flex items-center bg-hopper px-6 py-3 font-sans text-sm font-medium tracking-wide text-night transition hover:bg-hopper-bright active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hopper-bright rounded-sm"
        >XEM BỘ SƯU TẬP</NuxtLink>
        <MessengerButton variant="ghost" label="Nhắn Messenger" />
      </div>
    </div>

    <!-- Hero image panel with compound-eye watermark -->
    <div class="relative overflow-hidden rounded bg-panel border border-paper/10">
      <!-- Compound-eye SVG watermark (decorative) -->
      <svg
        class="pointer-events-none absolute bottom-4 right-4 h-24 w-24 opacity-[0.07]"
        viewBox="0 0 120 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <g fill="#5c8a24">
          <polygon points="60,10 73,17 73,33 60,40 47,33 47,17"/>
          <polygon points="60,42 73,49 73,65 60,72 47,65 47,49"/>
          <polygon points="60,74 73,81 73,97 60,104 47,97 47,81"/>
          <polygon points="28,26 41,33 41,49 28,56 15,49 15,33"/>
          <polygon points="92,26 105,33 105,49 92,56 79,49 79,33"/>
          <polygon points="28,58 41,65 41,81 28,88 15,81 15,65"/>
          <polygon points="92,58 105,65 105,81 92,88 79,81 79,65"/>
        </g>
      </svg>
      <NuxtImg
        src="https://picsum.photos/seed/toku-hero-showa/1200/1400"
        alt="Nhân vật tokusatsu Showa in FDM, sơn thủ công"
        width="1200"
        height="1400"
        preload
        class="aspect-[6/7] w-full object-cover"
      />
    </div>
  </section>

  <!-- FEATURED PRODUCTS -->
  <section class="mx-auto max-w-content px-4 pb-16 md:px-8">
    <SectionHeading
      title="SẢN PHẨM NỔI BẬT"
      subtitle="Những mẫu được yêu thích nhất trong xưởng."
    />
    <div class="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
      <ProductCard v-for="p in featured" :key="p.slug" :product="p" />
    </div>
    <div class="mt-10">
      <NuxtLink
        to="/san-pham"
        class="font-sans text-sm font-medium text-hopper hover:text-hopper-bright hover:underline underline-offset-4 transition"
      >Xem tất cả sản phẩm &rsaquo;</NuxtLink>
    </div>
  </section>

  <!-- ABOUT TEASER: full-width split reversed -->
  <section class="bg-panel py-20">
    <div class="mx-auto grid max-w-content items-center gap-10 px-4 md:grid-cols-5 md:px-8">
      <div class="overflow-hidden rounded md:col-span-2">
        <NuxtImg
          src="https://picsum.photos/seed/toku-workshop-fdm/900/900"
          alt="Xưởng in FDM và sơn thủ công figure tokusatsu"
          width="900"
          height="900"
          loading="lazy"
          class="aspect-square w-full object-cover"
        />
      </div>
      <div class="md:col-span-3">
        <h2 class="font-display text-3xl uppercase tracking-tight text-paper md:text-4xl">
          TỪ FILE 3D ĐẾN FIGURE TRƯNG BÀY
        </h2>
        <p class="mt-4 max-w-[55ch] font-sans text-sm font-light leading-relaxed text-silver">
          Mỗi sản phẩm đi qua in FDM (PLA+), xử lý bề mặt và sơn nhiều lớp bằng tay.
          Số lượng nhỏ để giữ chất lượng từng con.
        </p>
        <NuxtLink
          to="/gioi-thieu"
          class="mt-6 inline-block font-sans text-sm font-medium text-hopper hover:underline underline-offset-4 transition"
        >Tìm hiểu quy trình &rsaquo;</NuxtLink>
      </div>
    </div>
  </section>

  <!-- CTA SECTION -->
  <section class="mx-auto max-w-content px-4 py-24 md:px-8">
    <h2 class="font-display text-3xl uppercase tracking-tight text-paper md:text-4xl">
      TÌM THẤY CON BẠN THÍCH?
    </h2>
    <p class="mt-3 max-w-[45ch] font-sans text-sm font-light text-silver">
      Nhắn shop qua Messenger để hỏi giá, đặt màu sơn hoặc mẫu theo yêu cầu.
    </p>
    <div class="mt-8">
      <MessengerButton label="Nhắn Messenger" />
    </div>
  </section>
</template>
