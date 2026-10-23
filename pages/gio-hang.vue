<script setup lang="ts">
import { MAX_QTY, type CartEntry } from '~/utils/cart'
import { formatPrice } from '~/utils/products'

const shop = useShop()
useSeoMeta({
  title: `Giỏ hàng - ${shop.name}`,
  robots: 'noindex, nofollow',
})

const { setQty, remove } = useCart()
const { entries, resolved, ready } = useCartView()

const unavailableTitle = (e: CartEntry) => `Sản phẩm này không còn bán (mã ${e.productId.slice(0, 6)})`
const canCheckout = computed(() => resolved.value.lines.length > 0 && resolved.value.unavailable.length === 0)
const isEmpty = computed(() => entries.value.length === 0)
</script>

<template>
  <section class="mx-auto max-w-content px-4 py-16 md:px-8">
    <h1 class="font-display text-4xl uppercase leading-[1.5] tracking-tight text-paper md:text-5xl md:leading-[1.5]">GIỎ HÀNG</h1>

    <div v-if="!ready" class="mt-8 space-y-3" aria-busy="true" aria-label="Đang tải giỏ hàng">
      <div class="h-24 animate-pulse rounded bg-panel" />
      <div class="h-24 animate-pulse rounded bg-panel" />
    </div>

    <div v-else-if="isEmpty" class="mt-8">
      <p class="font-sans text-sm font-light text-silver">Giỏ hàng của bạn đang trống.</p>
      <NuxtLink
        to="/san-pham"
        class="mt-5 inline-flex rounded bg-hopper px-6 py-3 font-sans text-sm font-medium tracking-wide text-night transition hover:bg-hopper-bright focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hopper"
      >Xem sản phẩm</NuxtLink>
    </div>

    <div v-else class="mt-8 grid gap-10 lg:grid-cols-[1fr_360px]">
      <ul class="divide-y divide-paper/10 border-y border-paper/10">
        <li v-for="line in resolved.lines" :key="line.id" class="flex gap-4 py-5">
          <NuxtLink :to="`/san-pham/${line.slug}`" class="block h-20 w-20 shrink-0 overflow-hidden rounded bg-panel2" tabindex="-1" aria-hidden="true">
            <img v-if="line.cover" :src="line.cover" alt="" width="80" height="80" loading="lazy" class="h-full w-full object-cover" />
          </NuxtLink>
          <div class="min-w-0 flex-1">
            <NuxtLink
              :to="`/san-pham/${line.slug}`"
              class="font-sans text-sm text-paper hover:text-hopper-bright focus-visible:outline focus-visible:outline-2 focus-visible:outline-hopper rounded"
            >{{ line.title }}</NuxtLink>
            <p class="mt-1 font-sans text-sm font-light text-silver">{{ formatPrice(line.price) }}</p>
            <div class="mt-3 flex flex-wrap items-center gap-4">
              <div class="inline-flex items-center rounded border border-paper/20" role="group" :aria-label="`Số lượng ${line.title}`">
                <button
                  type="button"
                  class="h-9 w-9 text-paper transition hover:bg-panel2 disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-hopper"
                  :disabled="line.qty <= 1"
                  aria-label="Giảm số lượng"
                  @click="setQty(line.id, line.qty - 1)"
                >-</button>
                <span class="w-8 text-center font-sans text-sm text-paper" aria-live="polite">{{ line.qty }}</span>
                <button
                  type="button"
                  class="h-9 w-9 text-paper transition hover:bg-panel2 disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-hopper"
                  :disabled="line.qty >= MAX_QTY"
                  aria-label="Tăng số lượng"
                  @click="setQty(line.id, line.qty + 1)"
                >+</button>
              </div>
              <button
                type="button"
                class="font-sans text-xs uppercase tracking-[0.1em] text-silver underline underline-offset-4 hover:text-paper focus-visible:outline focus-visible:outline-2 focus-visible:outline-hopper rounded"
                @click="remove(line.id)"
              >Xoá</button>
            </div>
          </div>
          <p class="shrink-0 font-sans text-sm text-paper">{{ formatPrice(line.lineTotal) }}</p>
        </li>

        <li v-for="e in resolved.unavailable" :key="e.productId" class="flex items-center justify-between gap-4 py-5">
          <p class="font-sans text-sm text-silver" role="status">{{ unavailableTitle(e) }}</p>
          <button
            type="button"
            class="shrink-0 rounded border border-paper/30 px-4 py-2 font-sans text-xs uppercase tracking-[0.1em] text-paper transition hover:border-paper/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-hopper"
            @click="remove(e.productId)"
          >Xoá khỏi giỏ</button>
        </li>
      </ul>

      <aside class="h-fit rounded border border-paper/10 bg-panel p-6">
        <div class="flex items-baseline justify-between font-sans">
          <span class="text-[10px] font-medium uppercase tracking-[0.15em] text-silver">Tạm tính</span>
          <span class="text-xl text-paper">{{ formatPrice(resolved.subtotal) }}</span>
        </div>
        <p class="mt-3 font-sans text-sm font-light text-silver">Phí ship bạn trả khi nhận hàng.</p>
        <p v-if="resolved.unavailable.length" class="mt-3 font-sans text-sm text-paper" aria-live="polite">
          Xoá sản phẩm không còn bán để tiếp tục đặt hàng.
        </p>
        <NuxtLink
          v-if="canCheckout"
          to="/thanh-toan"
          class="mt-5 flex w-full justify-center rounded bg-hopper px-6 py-3 font-sans text-sm font-medium tracking-wide text-night transition hover:bg-hopper-bright focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hopper"
        >Đặt hàng</NuxtLink>
        <button
          v-else
          type="button"
          disabled
          class="mt-5 flex w-full cursor-not-allowed justify-center rounded bg-hopper/40 px-6 py-3 font-sans text-sm font-medium tracking-wide text-night"
        >Đặt hàng</button>
        <NuxtLink to="/san-pham" class="mt-4 block text-center font-sans text-sm text-hopper underline underline-offset-4 hover:text-hopper-bright focus-visible:outline focus-visible:outline-2 focus-visible:outline-hopper rounded">Tiếp tục xem sản phẩm</NuxtLink>
      </aside>
    </div>
  </section>
</template>
