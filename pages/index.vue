<script setup lang="ts">
const shop = useShop()
const { all, featured, newest, seriesList } = useProducts()
const { featured: feedbackImages } = useFeedbacks()

// Thẻ series cho khối "Duyệt theo series": ảnh lấy từ sản phẩm đầu tiên có cover.
const seriesCards = computed(() =>
  seriesList.value.map((s) => {
    const inSeries = all.value.filter((p) => p.series === s)
    return { series: s, cover: inSeries.find((p) => p.cover)?.cover ?? '', count: inSeries.length }
  }),
)

const steps = [
  { n: '01', t: 'Nhắn shop', d: 'Nhắn Messenger hoặc Facebook, gửi mẫu và series bạn muốn.' },
  { n: '02', t: 'Chốt mẫu & màu', d: 'Cùng chốt phối màu, chất liệu và giá cuối cho món của bạn.' },
  { n: '03', t: 'Cọc & in', d: 'Cọc 50% hoặc thanh toán đủ, shop bắt đầu in theo đơn.' },
  { n: '04', t: 'Giao hàng', d: 'In xong, đóng gói kỹ và ship tận nơi toàn quốc.' },
]

const faqs = [
  { q: 'Sản phẩm làm bằng chất liệu gì?', a: 'In FDM bằng nhựa PLA+, phối màu trực tiếp bằng nhựa chứ không dùng sơn, nên màu bền và không lo tróc.' },
  { q: 'In mất bao lâu?', a: 'Tùy mẫu và số lượng, thường vài ngày tới hơn một tuần. Shop báo thời gian cụ thể khi chốt đơn.' },
  { q: 'Thanh toán như thế nào?', a: 'Cọc 50% để bắt đầu in, phần còn lại thanh toán trước khi giao. Hoặc thanh toán đủ ngay từ đầu cũng được.' },
  { q: 'Có ship toàn quốc không?', a: 'Có. Shop đóng gói kỹ và gửi qua đơn vị vận chuyển tới tận nơi trên toàn quốc.' },
  { q: 'Đồ chơi trong ảnh có bán kèm không?', a: 'Không. Đồ chơi DX trong ảnh chỉ để minh họa cách dùng phụ kiện, không bao gồm khi mua.' },
]

useSeoMeta({
  title: `${shop.name} - Phụ kiện in 3D cho đồ chơi DX`,
  description: shop.tagline,
})

// FAQPage schema — rất hợp AEO: AI có thể trích thẳng cặp hỏi-đáp.
useJsonLd(
  {
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  },
  'faq',
)
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
      <p class="mb-2 font-sans text-[10px] uppercase tracking-[0.2em] text-hopper">DX CUSTOM / FDM / PLA+</p>
      <h1 class="font-display text-5xl uppercase leading-[1.5] tracking-tight text-paper md:text-7xl md:leading-[1.5]">
        PHỤ KIỆN IN 3D<br />CHO ĐỒ CHƠI DX.
      </h1>
      <p class="mt-5 max-w-[42ch] font-sans text-sm font-light leading-relaxed text-silver">
        Phụ kiện và đế trưng bày in FDM cho đồ chơi DX: Super Sentai, Kamen Rider, Beyblade và hơn thế. Phối màu theo yêu cầu.
      </p>
      <div class="mt-8 flex flex-wrap gap-3">
        <NuxtLink
          to="/san-pham"
          class="inline-flex items-center bg-hopper px-6 py-3 font-sans text-sm font-medium tracking-wide text-night transition hover:bg-hopper-bright active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hopper-bright rounded-sm"
        >XEM BỘ SƯU TẬP</NuxtLink>
        <MessengerButton variant="ghost" label="Nhắn Messenger" source="home-hero" />
      </div>
    </div>

    <!-- Hero image panel -->
    <div class="relative overflow-hidden rounded bg-panel border border-paper/10">
      <!-- Compound-eye SVG watermark (decorative, always shown in hero panel) -->
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
        src="/hero-in-3d.webp"
        alt="Đầu phun máy in 3D FDM đang đùn nhựa filament xanh - Ichigo Studio"
        width="1024"
        height="1024"
        sizes="sm:100vw md:50vw lg:700px"
        preload
        fetchpriority="high"
        loading="eager"
        class="aspect-[6/7] w-full object-cover"
      />
    </div>
  </section>

  <!-- BROWSE BY SERIES -->
  <section v-if="seriesCards.length" class="mx-auto max-w-content px-4 pb-16 md:px-8">
    <SectionHeading
      title="DUYỆT THEO SERIES"
      subtitle="Chọn thẳng franchise bạn đang chơi."
    />
    <div class="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      <NuxtLink
        v-for="s in seriesCards"
        :key="s.series"
        :to="{ path: '/san-pham', query: { series: s.series } }"
        class="group relative overflow-hidden rounded bg-panel border border-paper/10 transition hover:border-hopper focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hopper"
      >
        <NuxtImg
          v-if="s.cover"
          :src="s.cover"
          :alt="s.series"
          loading="lazy"
          width="400"
          class="aspect-[4/3] w-full object-cover opacity-70 transition duration-500 group-hover:opacity-100 group-hover:scale-[1.04]"
        />
        <div v-else class="aspect-[4/3] w-full bg-panel2"></div>
        <div class="pointer-events-none absolute inset-0 bg-gradient-to-t from-night/90 via-night/40 to-transparent"></div>
        <div class="absolute inset-x-0 bottom-0 p-3">
          <p class="font-display text-base uppercase leading-tight tracking-tight text-paper md:text-lg">{{ s.series }}</p>
          <p class="font-sans text-[11px] text-silver">{{ s.count }} sản phẩm</p>
        </div>
      </NuxtLink>
    </div>
  </section>

  <!-- FEATURED PRODUCTS -->
  <section class="mx-auto max-w-content px-4 pb-16 md:px-8">
    <SectionHeading
      title="SẢN PHẨM NỔI BẬT"
      subtitle="Những mẫu được yêu thích nhất tại shop."
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

  <!-- NEW ARRIVALS -->
  <section v-if="newest.length" class="mx-auto max-w-content px-4 pb-16 md:px-8">
    <SectionHeading
      title="SẢN PHẨM MỚI NHẤT TẠI SHOP"
      subtitle="Những mẫu mới nhất vừa cập nhật."
    />
    <div class="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
      <ProductCard v-for="p in newest" :key="p.slug" :product="p" />
    </div>
  </section>

  <!-- KHÁCH HÀNG FEEDBACK -->
  <section v-if="feedbackImages.length" class="mx-auto max-w-content px-4 pb-16 md:px-8">
    <SectionHeading
      title="KHÁCH HÀNG NÓI GÌ"
      subtitle="Ảnh thật khách gửi sau khi nhận hàng."
    />
    <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      <NuxtLink
        v-for="(f, i) in feedbackImages.slice(0, 10)"
        :key="i"
        to="/feedback"
        class="group relative aspect-square overflow-hidden rounded border border-paper/10 transition hover:border-hopper focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hopper"
      >
        <NuxtImg :src="f.imageUrl" alt="Feedback khách hàng Ichigo Studio" loading="lazy" width="400" class="size-full object-cover transition duration-500 group-hover:scale-105" />
      </NuxtLink>
    </div>
    <div class="mt-8">
      <NuxtLink to="/feedback" class="font-sans text-sm font-medium text-hopper hover:text-hopper-bright hover:underline underline-offset-4 transition">Xem tất cả feedback &rsaquo;</NuxtLink>
    </div>
  </section>

  <!-- ORDER PROCESS (4 steps) -->
  <section class="bg-panel py-20">
    <div class="mx-auto max-w-content px-4 md:px-8">
      <SectionHeading
        title="ĐẶT HÀNG NHƯ THẾ NÀO?"
        subtitle="Bốn bước gọn, in theo yêu cầu từng đơn."
      />
      <ol class="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <li v-for="s in steps" :key="s.n" class="relative rounded border border-paper/10 bg-night/40 p-5">
          <span class="font-display text-4xl leading-none text-hopper/70">{{ s.n }}</span>
          <p class="mt-3 font-sans text-sm font-medium uppercase tracking-wide text-paper">{{ s.t }}</p>
          <p class="mt-1.5 font-sans text-sm font-light leading-relaxed text-silver">{{ s.d }}</p>
        </li>
      </ol>
    </div>
  </section>

  <!-- CUSTOM ORDER -->
  <section class="mx-auto max-w-content px-4 py-20 md:px-8">
    <div class="rounded border border-hopper/30 bg-panel p-8 md:p-12">
      <p class="font-sans text-[10px] uppercase tracking-[0.2em] text-hopper">CUSTOM / IN THEO YÊU CẦU</p>
      <h2 class="mt-2 font-display text-3xl uppercase leading-[1.5] tracking-tight text-paper md:text-4xl md:leading-[1.5]">
        CÓ MẪU RIÊNG MUỐN IN?
      </h2>
      <p class="mt-3 max-w-[52ch] font-sans text-sm font-light leading-relaxed text-silver">
        Gửi ảnh hoặc file 3D mẫu bạn muốn, shop báo giá và thời gian in. Nhận phối màu theo yêu cầu, số lượng nhỏ để giữ chất lượng từng món.
      </p>
      <div class="mt-8">
        <MessengerButton label="Gửi mẫu, nhận báo giá" source="home-custom" />
      </div>
    </div>
  </section>

  <!-- THEO DÕI SOCIAL -->
  <section class="mx-auto max-w-content px-4 py-16 md:px-8">
    <div class="rounded border border-hopper/30 bg-panel p-8 md:flex md:items-center md:justify-between md:p-10">
      <div>
        <p class="font-sans text-[10px] uppercase tracking-[0.2em] text-hopper">FACEBOOK / TIKTOK</p>
        <h2 class="mt-2 font-display text-2xl uppercase leading-tight tracking-tight text-paper md:text-3xl">Theo dõi Ichigo Studio</h2>
        <p class="mt-2 max-w-[46ch] font-sans text-sm font-light text-silver">Mẫu mới, video in 3D và feedback khách cập nhật liên tục trên Facebook và TikTok.</p>
      </div>
      <div class="mt-6 md:mt-0">
        <SocialLinks source="home" variant="buttons" />
      </div>
    </div>
  </section>

  <!-- FAQ -->
  <section class="mx-auto max-w-content px-4 pb-20 md:px-8">
    <SectionHeading title="CÂU HỎI THƯỜNG GẶP" />
    <div class="border-t border-paper/10">
      <details v-for="f in faqs" :key="f.q" class="group border-b border-paper/10 py-4">
        <summary class="flex cursor-pointer list-none items-center justify-between font-sans text-sm font-medium text-paper [&::-webkit-details-marker]:hidden">
          <span>{{ f.q }}</span>
          <span class="ml-4 shrink-0 text-lg leading-none text-hopper transition-transform duration-200 group-open:rotate-45">+</span>
        </summary>
        <p class="mt-3 max-w-[65ch] font-sans text-sm font-light leading-relaxed text-silver">{{ f.a }}</p>
      </details>
    </div>
  </section>

  <!-- CTA SECTION -->
  <section class="mx-auto max-w-content px-4 py-24 md:px-8">
    <h2 class="font-display text-3xl uppercase leading-[1.5] tracking-tight text-paper md:text-4xl md:leading-[1.5]">
      ĐÃ TÌM THẤY SẢN PHẨM ƯNG Ý CHƯA?
    </h2>
    <p class="mt-3 max-w-[45ch] font-sans text-sm font-light text-silver">
      Nhắn shop qua Messenger để hỏi giá, chọn phối màu hoặc mẫu theo yêu cầu.
    </p>
    <div class="mt-8">
      <MessengerButton label="Nhắn Messenger" source="home-cta" />
    </div>
  </section>
</template>
