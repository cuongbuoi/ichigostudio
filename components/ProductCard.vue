<script setup lang="ts">
import type { ProductMeta } from '~/types/product'
defineProps<{ product: ProductMeta }>()
</script>

<template>
  <NuxtLink :to="`/san-pham/${product.slug}`" class="group block">
    <div class="relative overflow-hidden rounded bg-panel border border-paper/10 transition hover:border-hopper">
      <NuxtImg
        :src="product.cover"
        :alt="`Figure ${product.title} - in FDM, sơn thủ công`"
        loading="lazy"
        width="600"
        height="750"
        class="aspect-[4/5] w-full object-cover transition duration-500 group-hover:scale-[1.03]"
      />
      <!-- Technical badge -->
      <span class="absolute bottom-2 right-2 font-sans text-[9px] font-medium tracking-[0.15em] text-silver/60 bg-night/70 px-1.5 py-0.5 rounded-sm">FDM</span>
    </div>
    <div class="mt-3">
      <p class="font-sans text-[10px] uppercase tracking-[0.15em] text-hopper font-medium">{{ product.series }}</p>
      <h3 class="mt-1 font-sans text-base font-semibold leading-snug text-paper">{{ product.title }}</h3>
      <p class="mt-0.5 font-sans text-xs font-light text-silver">Tỉ lệ {{ product.scale }}</p>
    </div>
  </NuxtLink>
</template>
