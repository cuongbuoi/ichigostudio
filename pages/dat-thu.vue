<script setup lang="ts">
import type { CartProduct } from '~/utils/cart'
import { formatPrice } from '~/utils/products'

const shop = useShop()
useSeoMeta({
  title: `Đặt thử - ${shop.name}`,
  robots: 'noindex, nofollow',
})

const route = useRoute()
const router = useRouter()
const { public: { apiBase } } = useRuntimeConfig()
const { setTestKey } = useCheckoutConfig()

const key = computed(() => {
  const k = route.query.key
  return typeof k === 'string' ? k : ''
})

const status = ref<'loading' | 'ok' | 'invalid'>('loading')
const items = ref<CartProduct[]>([])

onMounted(async () => {
  if (!key.value) { status.value = 'invalid'; return }
  try {
    const res = await $fetch<{ items: CartProduct[] }>(`${apiBase}/public/checkout/test-products`, {
      query: { key: key.value },
    })
    items.value = res.items ?? []
    status.value = 'ok'
    // Lưu key + refetch config để giỏ hiện ngay, không cần tải lại trang.
    await setTestKey(key.value)
    // Đưa key khỏi thanh địa chỉ và lịch sử để GA4 page_view không gửi ?key=...
    // (Chủ shop vẫn cần bật GA4 "Redact data > query parameter" với tham số `key`.)
    await router.replace({ query: {} })
  } catch {
    status.value = 'invalid'
  }
})
</script>

<template>
  <section class="mx-auto max-w-content px-4 py-16 md:px-8">
    <h1 class="font-display text-4xl uppercase leading-[1.5] tracking-tight text-paper md:text-5xl md:leading-[1.5]">ĐẶT THỬ</h1>

    <div aria-live="polite" class="empty:hidden">
      <p v-if="status === 'invalid'" class="mt-8 font-sans text-sm text-paper">Link thử không hợp lệ.</p>
      <p v-else-if="status === 'ok'" class="mt-8 rounded border border-hopper/40 bg-panel px-4 py-3 font-sans text-sm text-paper">
        Chế độ đặt thử: đơn được đánh dấu TEST
      </p>
    </div>

    <div v-if="status === 'loading'" class="mt-8 space-y-3" aria-busy="true" aria-label="Đang tải">
      <div class="h-20 animate-pulse rounded bg-panel" />
      <div class="h-20 animate-pulse rounded bg-panel" />
    </div>


    <template v-else-if="status === 'ok'">
      <p v-if="!items.length" class="mt-6 font-sans text-sm font-light text-silver">Chưa có sản phẩm thử nào.</p>
      <ul v-else class="mt-6 divide-y divide-paper/10 border-y border-paper/10">
        <li v-for="p in items" :key="p.id" class="flex flex-wrap items-center gap-4 py-4">
          <div class="h-16 w-16 shrink-0 overflow-hidden rounded bg-panel2">
            <img v-if="p.cover" :src="p.cover" alt="" width="64" height="64" loading="lazy" class="h-full w-full object-cover" />
          </div>
          <div class="min-w-0 flex-1">
            <p class="font-sans text-sm text-paper">{{ p.title }}</p>
            <p class="mt-1 font-sans text-sm font-light text-silver">{{ formatPrice(p.price) }}</p>
          </div>
          <AddToCartButton :product="p" source="dat-thu" />
        </li>
      </ul>
      <NuxtLink
        to="/gio-hang"
        class="mt-6 inline-flex rounded bg-hopper px-6 py-3 font-sans text-sm font-medium tracking-wide text-night transition hover:bg-hopper-bright focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hopper"
      >Xem giỏ hàng</NuxtLink>
    </template>
  </section>
</template>
