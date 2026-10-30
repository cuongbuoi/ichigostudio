<script setup lang="ts">
import MarkdownIt from 'markdown-it'
import { mapApiProduct, formatPrice } from '~/utils/products'
import { productCrumbs, productJsonLd, breadcrumbJsonLd } from '~/utils/structured-data'

const route = useRoute()
const slug = computed(() => String(route.params.slug))
const { public: { apiBase } } = useRuntimeConfig()
const { related } = useProducts()
const shop = useShop()

const { data: product } = await useAsyncData(`product-${slug.value}`, async () => {
  try {
    const api = await $fetch<any>(`${apiBase}/public/products/${slug.value}`)
    return mapApiProduct(api)
  } catch {
    return null
  }
})

if (!product.value) {
  throw createError({ statusCode: 404, statusMessage: 'Không tìm thấy sản phẩm' })
}

// breaks: true — chủ shop gõ mỗi dòng một Enter (kiểu bài social), nên xuống
// dòng đơn phải thành <br> thay vì bị dồn thành khoảng trắng như Markdown chuẩn.
const md = new MarkdownIt({ breaks: true, linkify: true })
const bodyHtml = computed(() => md.render(product.value?.bodyMd ?? ''))

const relatedItems = computed(() =>
  product.value ? related(product.value as any) : []
)

// Social proof ngay trên trang SP.
const { all: feedbackAll } = useFeedbacks()
const feedbackImages = computed(() => feedbackAll.value.slice(0, 6))

// Điểm tin cậy hiển thị cạnh nút mua (chip sự thật, giảm do dự).
const trustPoints = ['🚚 Giao hàng toàn quốc', '💳 Thanh toán trước', '🎨 Phối màu theo yêu cầu', '🖨 In theo đơn']

useSeoMeta({
  title: () => `${product.value?.title} - Ichigo Studio`,
  description: () => `${product.value?.title} - ${product.value?.category}. Thiết kế và in 3D bởi Ichigo Studio.`,
  ogImage: () => product.value?.cover,
})

// Bài hướng dẫn gắn với danh mục của SP (admin chọn "Sản phẩm liên quan" khi soạn bài).
const { posts } = useBlog()
const guides = computed(() =>
  product.value?.categorySlug ? posts.value.filter((b) => b.productCategorySlug === product.value!.categorySlug).slice(0, 3) : [],
)

const crumbs = computed(() => (product.value ? productCrumbs(product.value) : []))

// JSON-LD: Product + đường dẫn (Breadcrumb). Dữ liệu đã resolve nhờ await ở trên.
const { public: { siteUrl } } = useRuntimeConfig()
if (product.value) {
  const p = product.value
  useJsonLd(
    [productJsonLd(p, siteUrl), breadcrumbJsonLd(crumbs.value, siteUrl, `${siteUrl}/san-pham/${p.slug}`)],
    'product',
  )
}
</script>

<template>
  <article v-if="product" class="mx-auto max-w-6xl px-4 pt-12 pb-28 md:px-8 md:pb-12">
    <Breadcrumbs :items="crumbs" />

    <div class="mt-6 grid grid-cols-1 gap-10 lg:grid-cols-2">
      <ProductGallery :images="product.images" :alt="product.title" />

      <div class="lg:py-4">
        <!-- 1 eyebrow per page: danh mục, link về trang danh mục -->
        <NuxtLink
          v-if="product.categorySlug"
          :to="`/danh-muc/${product.categorySlug}`"
          class="rounded font-sans text-[10px] uppercase tracking-[0.18em] text-hopper font-medium transition hover:text-hopper-bright focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hopper"
        >{{ product.category }}</NuxtLink>
        <p v-else class="font-sans text-[10px] uppercase tracking-[0.18em] text-hopper font-medium">{{ product.category }}</p>
        <h1 class="mt-2 font-display text-3xl uppercase leading-[1.5] tracking-tight text-paper md:text-4xl md:leading-[1.5]">
          {{ product.title }}
        </h1>

        <!-- Specs: "mecha readout" style - grouped, hairline separators -->
        <dl class="mt-6 border-t border-paper/10 pt-4 font-sans">
          <div class="py-3 border-b border-paper/10">
            <dt class="text-[10px] uppercase tracking-[0.12em] text-silver font-medium">Chất liệu</dt>
            <dd class="mt-0.5 text-sm font-medium text-paper">{{ product.material }}</dd>
          </div>
          <div v-if="product.sold" class="py-3 border-b border-paper/10">
            <dt class="text-[10px] uppercase tracking-[0.12em] text-silver font-medium">Đã bán</dt>
            <dd class="mt-0.5 text-sm font-medium text-paper">{{ product.sold }} sản phẩm</dd>
          </div>
          <div class="pt-3">
            <dt class="text-[10px] uppercase tracking-[0.12em] text-silver font-medium">Giá tham khảo</dt>
            <dd class="mt-0.5 text-sm font-medium text-hopper">{{ formatPrice(product.price) }}</dd>
          </div>
        </dl>

        <div class="prose prose-sm mt-6 max-w-none" style="color: rgba(238,240,232,0.75);" v-html="bodyHtml" />

        <div class="mt-8">
          <div class="flex flex-wrap items-center gap-3">
            <AddToCartButton :product="{ id: product.id, title: product.title, price: product.price }" source="product" />
            <MessengerButton :label="`HỎI MUA ${product.title}`" source="product" :item="product.title" :ref-code="`sp-${product.slug}`" />
          </div>
          <p class="mt-2 font-sans text-xs text-silver/70">{{ shop.responseTime }}</p>
        </div>

        <!-- Điểm tin cậy -->
        <ul class="mt-6 grid grid-cols-2 gap-2">
          <li v-for="t in trustPoints" :key="t" class="rounded border border-paper/10 bg-panel/60 px-3 py-2 font-sans text-xs text-silver">{{ t }}</li>
        </ul>

        <!-- Phương thức thanh toán -->
        <PaymentMethods class="mt-3" />
      </div>
    </div>

    <!-- Feedback khách (social proof đúng điểm quyết định) -->
    <section v-if="feedbackImages.length" class="mt-20" aria-label="Feedback khách hàng">
      <h2 class="mb-8 font-display text-2xl uppercase tracking-tight text-paper">KHÁCH ĐÃ NHẬN</h2>
      <div class="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
        <NuxtLink
          v-for="(f, i) in feedbackImages"
          :key="i"
          to="/feedback"
          class="group aspect-square overflow-hidden rounded-lg border border-paper/10 bg-panel"
        >
          <NuxtImg :src="f.imageUrl" alt="Feedback khách hàng Ichigo Studio" loading="lazy" width="300" class="size-full object-cover transition duration-500 group-hover:scale-105" />
        </NuxtLink>
      </div>
    </section>

    <section v-if="guides.length" class="mt-20" aria-label="Bài viết liên quan">
      <h2 class="mb-8 font-display text-2xl uppercase tracking-tight text-paper">BÀI VIẾT LIÊN QUAN</h2>
      <div class="grid grid-cols-1 gap-6 sm:grid-cols-3">
        <NuxtLink
          v-for="g in guides"
          :key="g.slug"
          :to="`/blog/${g.slug}`"
          class="group flex flex-col overflow-hidden rounded-lg border border-paper/10 bg-panel transition hover:border-hopper/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hopper"
        >
          <div class="aspect-[16/10] overflow-hidden bg-night">
            <NuxtImg v-if="g.coverImage" :src="g.coverImage" :alt="g.title" width="400" class="h-full w-full object-cover transition duration-500 group-hover:scale-105" loading="lazy" />
          </div>
          <div class="p-4">
            <p v-if="g.categoryName" class="font-sans text-[10px] uppercase tracking-[0.15em] text-hopper font-medium">{{ g.categoryName }}</p>
            <h3 class="mt-1 font-display text-sm uppercase leading-snug tracking-tight text-paper">{{ g.title }}</h3>
          </div>
        </NuxtLink>
      </div>
    </section>

    <section v-if="relatedItems.length" class="mt-20" aria-label="Sản phẩm cùng danh mục">
      <h2 class="font-display text-2xl uppercase tracking-tight text-paper mb-8">CÙNG DANH MỤC</h2>
      <div class="grid grid-cols-2 gap-6 lg:grid-cols-4">
        <ProductCard v-for="p in relatedItems" :key="p.slug" :product="p" />
      </div>
    </section>

    <!-- Thanh Hỏi mua dính đáy (chỉ mobile) -->
    <div class="fixed inset-x-0 bottom-0 z-40 border-t border-hopper/30 bg-night/95 px-4 py-3 backdrop-blur md:hidden">
      <div class="mx-auto flex max-w-6xl items-center gap-2 pr-16 sm:gap-3">
        <div class="min-w-0 flex-1">
          <p class="hidden truncate font-sans text-[10px] uppercase tracking-wide text-silver sm:block">{{ product.title }}</p>
          <p class="truncate font-sans text-sm font-medium text-hopper">{{ formatPrice(product.price) }}</p>
        </div>
        <AddToCartButton :product="{ id: product.id, title: product.title, price: product.price }" source="product-sticky" compact class="shrink-0" />
        <MessengerButton label="Hỏi mua" source="product-sticky" :item="product.title" :ref-code="`sp-${product.slug}`" class="shrink-0 !px-3 !py-2.5 sm:!px-6 sm:!py-3" />
      </div>
    </div>
  </article>
</template>
