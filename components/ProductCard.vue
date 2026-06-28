<script setup lang="ts">
import type { ProductMeta } from '~/types/product'
defineProps<{ product: ProductMeta }>()
</script>

<template>
  <NuxtLink :to="`/san-pham/${product.slug}`" class="group block">
    <div class="relative overflow-hidden rounded-xl bg-ink/5 dark:bg-bone/5">
      <NuxtImg :src="product.cover" :alt="product.title" loading="lazy"
        width="600" height="750"
        class="aspect-[4/5] w-full object-cover transition duration-500 group-hover:scale-[1.03]" />
    </div>
    <div class="mt-3">
      <p class="text-xs uppercase tracking-wide text-ink/65 dark:text-bone/65">{{ product.series }}</p>
      <h3 class="mt-1 font-display text-lg leading-snug">{{ product.title }}</h3>
      <p class="mt-0.5 text-sm text-ink/55 dark:text-bone/55">Tỉ lệ {{ product.scale }}</p>
    </div>
  </NuxtLink>
</template>
