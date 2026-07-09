<script setup lang="ts">
import type { ProductMeta } from '~/types/product'
defineProps<{ product: ProductMeta }>()
const { shop } = useAppConfig()
</script>

<template>
  <NuxtLink :to="`/san-pham/${product.slug}`" class="group block">
    <div class="relative overflow-hidden rounded bg-panel border border-paper/10 transition hover:border-hopper">
      <template v-if="shop.hasPhotos">
        <NuxtImg
          :src="product.cover"
          :alt="`${product.title} - phụ kiện in 3D`"
          loading="lazy"
          width="600"
          class="aspect-square w-full object-contain transition duration-500 group-hover:scale-[1.03]"
        />
      </template>
      <template v-else>
        <FigurePlaceholder
          :label="product.title"
          ratio="1/1"
          :seed="product.slug"
        />
      </template>
      <!-- Technical badge -->
      <span class="absolute bottom-2 right-2 font-sans text-[9px] font-medium tracking-[0.15em] text-silver/60 bg-night/70 px-1.5 py-0.5 rounded-sm">FDM</span>
    </div>
    <div class="mt-3">
      <p class="font-sans text-[10px] uppercase tracking-[0.15em] text-hopper font-medium">{{ product.series }}</p>
      <h3 class="mt-1 font-sans text-base font-semibold leading-snug text-paper">{{ product.title }}</h3>
      <p v-if="product.scale" class="mt-0.5 font-sans text-xs font-light text-silver">Tỉ lệ {{ product.scale }}</p>
      <p v-else-if="product.capacity" class="mt-0.5 font-sans text-xs font-light text-silver">{{ product.capacity }}</p>
    </div>
  </NuxtLink>
</template>
