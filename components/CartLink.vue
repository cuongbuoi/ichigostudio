<script setup lang="ts">
const { cartVisible } = useCheckoutConfig()
const { count } = useCart()
</script>

<template>
  <NuxtLink
    v-if="cartVisible"
    to="/gio-hang"
    :aria-label="count ? `Giỏ hàng, ${count} sản phẩm` : 'Giỏ hàng'"
    class="relative inline-flex items-center justify-center p-2 text-silver transition hover:text-paper focus-visible:outline focus-visible:outline-2 focus-visible:outline-hopper rounded"
  >
    <svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <circle cx="9" cy="20" r="1.5" /><circle cx="18" cy="20" r="1.5" />
      <path d="M2 3h3l2.5 12h11l2-8H6" />
    </svg>
    <span
      v-if="count > 0"
      class="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-hopper px-1 font-sans text-[10px] font-semibold leading-none text-night"
    >{{ count }}</span>
  </NuxtLink>
</template>
