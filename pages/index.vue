<script setup lang="ts">
import { formatPostDate } from '~/composables/useBlog'

const shop = useShop()
const { all, featured, newest, categoryList } = useProducts()
const { all: allFeedbacks, featured: feedbackImages } = useFeedbacks()
const { posts: blogPosts } = useBlog()
// Giỏ hàng bật/tắt từ API (chỉ biết ở client): copy cách mua đổi theo cờ này.
const { enabled: checkoutEnabled } = useCheckoutConfig()

// Ngày mẫu mới nhất lên kệ, cho subtitle khối "mới nhất".
const newestDate = computed(() => formatPostDate(newest.value[0]?.createdAt))

// 3 bài mới nhất cho khối blog ở home (API đã sort theo publishedAt giảm dần).
const latestPosts = computed(() => blogPosts.value.slice(0, 3))
// ISO datetime cho <time datetime> (máy đọc được, tốt cho SEO).
const isoDate = (ms?: number | null) => (ms ? new Date(ms).toISOString() : undefined)

// Thẻ danh mục cho khối "Duyệt theo danh mục": ảnh lấy từ SP đầu tiên có cover.
const categoryCards = computed(() =>
  categoryList.value.map((c) => {
    const inCat = all.value.filter((p) => p.categorySlug === c.slug)
    return { name: c.name, slug: c.slug, cover: inCat.find((p) => p.cover)?.cover ?? '', count: inCat.length }
  }),
)

const steps = computed(() => [
  {
    n: '01',
    t: 'Liên hệ',
    d: checkoutEnabled.value
      ? 'Gửi mẫu và dòng đồ chơi bạn quan tâm qua Messenger hoặc Facebook. Với sản phẩm có sẵn, bạn có thể đặt hàng trực tiếp trên website.'
      : 'Gửi mẫu và dòng đồ chơi bạn quan tâm qua Messenger hoặc Facebook.',
  },
  { n: '02', t: 'Xác nhận mẫu và màu', d: 'Ichigo Studio cùng bạn thống nhất phối màu, chất liệu và báo giá chính thức.' },
  { n: '03', t: 'Thanh toán và sản xuất', d: 'Đơn hàng được thanh toán trước, sau đó Ichigo Studio tiến hành in theo đơn.' },
  { n: '04', t: 'Giao hàng', d: 'Sản phẩm được đóng gói cẩn thận và giao tận nơi trên toàn quốc.' },
])

const faqs = computed(() => [
  { q: 'Sản phẩm được làm bằng chất liệu gì?', a: 'Sản phẩm được in FDM bằng nhựa PLA+. Màu sắc được phối trực tiếp bằng nhựa thay vì sơn, nên bền màu và không bị bong tróc.' },
  { q: 'Thời gian hoàn thiện một đơn hàng là bao lâu?', a: 'Thời gian hoàn thiện tùy theo mẫu, trung bình từ 3 đến 4 ngày. Với đơn hàng số lượng lớn, thời gian khoảng 1 tuần. Thời gian cụ thể sẽ được thông báo khi xác nhận đơn.' },
  {
    q: 'Hình thức thanh toán như thế nào?',
    a: checkoutEnabled.value
      ? 'Đơn hàng được thanh toán trước toàn bộ giá trị sản phẩm để Ichigo Studio tiến hành in. Khi đặt hàng trên website, bạn có thể thanh toán bằng mã VietQR.'
      : 'Đơn hàng được thanh toán trước toàn bộ giá trị sản phẩm để Ichigo Studio tiến hành in.',
  },
  { q: 'Ichigo Studio có giao hàng toàn quốc không?', a: 'Có. Sản phẩm được đóng gói cẩn thận và giao tận nơi trên toàn quốc. Phí vận chuyển được thanh toán khi nhận hàng.' },
  { q: 'Sản phẩm bị gãy trong quá trình vận chuyển thì xử lý thế nào?', a: 'Bạn vui lòng quay video khi mở hàng. Nếu có chi tiết bị gãy, bạn gửi video cho Ichigo Studio để được gửi bù chi tiết đó.' },
  { q: 'Đồ chơi trong ảnh có được bán kèm không?', a: 'Không. Đồ chơi DX trong ảnh chỉ dùng để minh họa cách sử dụng phụ kiện và không bao gồm trong sản phẩm.' },
])

useSeoMeta({
  title: `${shop.name} - Thiết kế và in 3D đồ chơi DX`,
  description: shop.tagline,
})

// FAQPage schema — rất hợp AEO: AI có thể trích thẳng cặp hỏi-đáp.
useJsonLd(
  () => ({
    '@type': 'FAQPage',
    mainEntity: faqs.value.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  }),
  'faq',
)

// ItemList các bài blog mới nhất -> Google hiểu danh sách bài, giúp index nhanh
// (crawler ghé home nhiều nhất). Getter để SSR có sẵn data async.
const { public: { siteUrl } } = useRuntimeConfig()
useJsonLd(
  () =>
    latestPosts.value.length
      ? {
          '@type': 'ItemList',
          name: 'Bài viết mới nhất',
          itemListElement: latestPosts.value.map((p, i) => ({
            '@type': 'ListItem',
            position: i + 1,
            url: `${siteUrl}/blog/${p.slug}`,
            item: {
              '@type': 'BlogPosting',
              headline: p.title,
              url: `${siteUrl}/blog/${p.slug}`,
              mainEntityOfPage: `${siteUrl}/blog/${p.slug}`,
              inLanguage: 'vi-VN',
              ...(p.coverImage ? { image: [p.coverImage] } : {}),
              ...(p.excerpt ? { description: p.excerpt } : {}),
              ...(p.publishedAt ? { datePublished: new Date(p.publishedAt).toISOString() } : {}),
              ...(p.categoryName ? { articleSection: p.categoryName } : {}),
              author: { '@type': 'Organization', name: 'Ichigo Studio' },
              publisher: { '@type': 'Organization', name: 'Ichigo Studio' },
            },
          })),
        }
      : {},
  'home-blog',
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
        THIẾT KẾ VÀ IN 3D<br />ĐỒ CHƠI DX.
      </h1>
      <p class="mt-5 max-w-[42ch] font-sans text-base font-medium leading-relaxed text-hopper md:text-lg">Với tinh thần "{{ shop.slogan }}"</p>
      <p class="mt-3 max-w-[48ch] font-sans text-sm font-light leading-relaxed text-silver">
        {{ shop.tagline }} Màu sắc được phối trực tiếp bằng nhựa in thay vì sơn, nên bền màu và không bị bong tróc.
      </p>
      <div class="mt-8 flex flex-wrap gap-3">
        <NuxtLink
          to="/san-pham"
          class="inline-flex items-center bg-hopper px-6 py-3 font-sans text-sm font-medium tracking-wide text-night transition hover:bg-hopper-bright active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hopper-bright rounded-sm"
        >XEM BỘ SƯU TẬP</NuxtLink>
        <MessengerButton variant="ghost" label="Liên hệ qua Messenger" source="home-hero" />
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
        src="/hero-logo.jpg"
        alt="Logo Ichigo Studio, in 3D phụ kiện tokusatsu custom"
        width="1024"
        height="1024"
        sizes="sm:100vw md:50vw lg:700px"
        preload
        fetchpriority="high"
        loading="eager"
        class="aspect-square w-full object-contain"
      />
    </div>
  </section>

  <!-- BROWSE BY CATEGORY -->
  <section v-if="categoryCards.length" class="mx-auto max-w-content px-4 pb-16 md:px-8">
    <SectionHeading
      title="DUYỆT THEO DANH MỤC"
      subtitle="Tìm phụ kiện theo dòng đồ chơi bạn đang sưu tầm."
    />
    <div class="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      <NuxtLink
        v-for="c in categoryCards"
        :key="c.slug"
        :to="`/danh-muc/${c.slug}`"
        class="group relative overflow-hidden rounded bg-panel border border-paper/10 transition hover:border-hopper focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hopper"
      >
        <NuxtImg
          v-if="c.cover"
          :src="c.cover"
          :alt="c.name"
          loading="lazy"
          width="400"
          class="aspect-[4/3] w-full object-cover opacity-70 transition duration-500 group-hover:opacity-100 group-hover:scale-[1.04]"
        />
        <div v-else class="aspect-[4/3] w-full bg-panel2"></div>
        <div class="pointer-events-none absolute inset-0 bg-gradient-to-t from-night/90 via-night/40 to-transparent"></div>
        <div class="absolute inset-x-0 bottom-0 p-3">
          <p class="font-display text-base uppercase leading-tight tracking-tight text-paper md:text-lg">{{ c.name }}</p>
          <p class="font-sans text-[11px] text-silver">{{ c.count }} sản phẩm</p>
        </div>
      </NuxtLink>
    </div>
  </section>

  <!-- FEATURED PRODUCTS -->
  <section class="mx-auto max-w-content px-4 pb-16 md:px-8">
    <SectionHeading
      title="SẢN PHẨM NỔI BẬT"
      subtitle="Những mẫu tiêu biểu do Ichigo Studio lựa chọn."
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
      title="SẢN PHẨM MỚI"
      :subtitle="newestDate ? `Cập nhật gần nhất ngày ${newestDate}.` : 'Những mẫu vừa được cập nhật.'"
    />
    <div class="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
      <ProductCard v-for="p in newest" :key="p.slug" :product="p" />
    </div>
  </section>

  <!-- KHÁCH HÀNG FEEDBACK -->
  <section v-if="feedbackImages.length" class="mx-auto max-w-content px-4 pb-16 md:px-8">
    <SectionHeading
      title="PHẢN HỒI TỪ KHÁCH HÀNG"
      :subtitle="`${allFeedbacks.length} hình ảnh thực tế do khách hàng gửi sau khi nhận sản phẩm.`"
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
      <NuxtLink to="/feedback" class="font-sans text-sm font-medium text-hopper hover:text-hopper-bright hover:underline underline-offset-4 transition">Xem tất cả phản hồi &rsaquo;</NuxtLink>
    </div>
  </section>

  <!-- ORDER PROCESS (4 steps) -->
  <section class="bg-panel py-20">
    <div class="mx-auto max-w-content px-4 md:px-8">
      <SectionHeading
        title="QUY TRÌNH ĐẶT HÀNG"
        subtitle="Mỗi sản phẩm được in riêng theo từng đơn hàng."
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
        BẠN CÓ MẪU RIÊNG CẦN IN?
      </h2>
      <p class="mt-3 max-w-[52ch] font-sans text-sm font-light leading-relaxed text-silver">
        Bạn gửi hình ảnh hoặc file 3D của mẫu mong muốn, Ichigo Studio sẽ báo giá và thời gian hoàn thiện. Ichigo Studio nhận phối màu theo yêu cầu và sản xuất số lượng nhỏ để đảm bảo chất lượng từng sản phẩm.
      </p>
      <div class="mt-8">
        <MessengerButton label="Gửi mẫu và nhận báo giá" source="home-custom" />
      </div>
    </div>
  </section>

  <!-- BLOG / HƯỚNG DẪN (SEO: internal link tới bài mới, cào & index nhanh) -->
  <section v-if="latestPosts.length" class="mx-auto max-w-content px-4 pb-16 md:px-8" aria-labelledby="home-blog-heading">
    <div class="mb-10 max-w-content">
      <h2 id="home-blog-heading" class="font-display text-3xl uppercase leading-[1.5] tracking-tight text-paper md:text-4xl md:leading-[1.5]">HƯỚNG DẪN &amp; BLOG</h2>
      <p class="mt-3 max-w-[60ch] font-sans text-sm font-light text-silver">Hướng dẫn sử dụng đồ chơi DX, hậu trường in 3D và tin tức tokusatsu.</p>
    </div>
    <div class="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
      <article
        v-for="p in latestPosts"
        :key="p.slug"
        class="group flex flex-col overflow-hidden rounded-lg border border-paper/10 bg-panel transition hover:border-hopper/40"
      >
        <NuxtLink
          :to="`/blog/${p.slug}`"
          class="flex flex-1 flex-col focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hopper"
        >
          <div class="aspect-[16/10] overflow-hidden bg-night">
            <NuxtImg
              v-if="p.coverImage"
              :src="p.coverImage"
              :alt="p.title"
              width="400"
              height="250"
              sizes="sm:100vw md:50vw lg:380px"
              class="h-full w-full object-cover transition duration-500 group-hover:scale-105"
              loading="lazy"
            />
            <div v-else class="flex h-full w-full items-center justify-center text-silver/40 font-display text-sm">ICHIGO</div>
          </div>
          <div class="flex flex-1 flex-col p-5">
            <p v-if="p.categoryName" class="font-sans text-[10px] uppercase tracking-[0.18em] text-hopper font-medium">{{ p.categoryName }}</p>
            <h3 class="mt-2 font-display text-lg uppercase leading-snug tracking-tight text-paper">{{ p.title }}</h3>
            <p v-if="p.excerpt" class="mt-2 flex-1 font-sans text-sm leading-relaxed text-silver line-clamp-3">{{ p.excerpt }}</p>
            <time v-if="p.publishedAt" :datetime="isoDate(p.publishedAt)" class="mt-4 font-sans text-xs text-silver/60">{{ formatPostDate(p.publishedAt) }}</time>
          </div>
        </NuxtLink>
      </article>
    </div>
    <div class="mt-10">
      <NuxtLink
        to="/blog"
        class="font-sans text-sm font-medium text-hopper hover:text-hopper-bright hover:underline underline-offset-4 transition"
      >Xem tất cả bài viết &rsaquo;</NuxtLink>
    </div>
  </section>

  <!-- THEO DÕI SOCIAL -->
  <section class="mx-auto max-w-content px-4 py-16 md:px-8">
    <div class="rounded border border-hopper/30 bg-panel p-8 md:flex md:items-center md:justify-between md:p-10">
      <div>
        <p class="font-sans text-[10px] uppercase tracking-[0.2em] text-hopper">FACEBOOK / TIKTOK / CULTS3D</p>
        <h2 class="mt-2 font-display text-2xl uppercase leading-tight tracking-tight text-paper md:text-3xl">Theo dõi Ichigo Studio</h2>
        <p class="mt-2 max-w-[46ch] font-sans text-sm font-light text-silver">Sản phẩm mới, video quá trình in 3D và phản hồi của khách hàng được cập nhật thường xuyên trên Facebook và TikTok. File in 3D của Ichigo Studio hiện có trên Cults3D.</p>
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
      BẠN CẦN TƯ VẤN THÊM?
    </h2>
    <p class="mt-3 max-w-[45ch] font-sans text-sm font-light text-silver">
      Ichigo Studio hỗ trợ báo giá, tư vấn phối màu và nhận in theo yêu cầu qua Messenger. {{ shop.responseTime }}.
    </p>
    <div class="mt-8 flex flex-wrap items-center gap-6">
      <MessengerButton label="Liên hệ qua Messenger" source="home-cta" />
      <NuxtLink
        to="/san-pham"
        class="font-sans text-sm font-medium text-hopper hover:text-hopper-bright hover:underline underline-offset-4 transition"
      >Xem bộ sưu tập &rsaquo;</NuxtLink>
    </div>
  </section>
</template>
