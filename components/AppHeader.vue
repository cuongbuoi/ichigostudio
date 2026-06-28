<script setup lang="ts">
const shop = useShop()
const links = [
  { to: '/', label: 'TRANG CHỦ' },
  { to: '/san-pham', label: 'BỘ SƯU TẬP' },
  { to: '/gioi-thieu', label: 'GIỚI THIỆU' },
  { to: '/lien-he', label: 'LIÊN HỆ' },
]
const open = ref(false)
</script>

<template>
  <header class="sticky top-0 z-40 border-b border-hopper/30 bg-night/90 backdrop-blur-sm">
    <div class="mx-auto flex h-16 max-w-content items-center justify-between px-4 md:px-8">
      <!-- Logo -->
      <NuxtLink to="/" class="flex items-baseline gap-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-hopper rounded">
        <span class="font-display text-xl uppercase tracking-tight text-paper">{{ shop.name }}</span>
        <span class="font-sans text-[10px] font-light tracking-[0.2em] text-silver" lang="ja">仮面ライダー</span>
      </NuxtLink>

      <!-- Desktop nav -->
      <nav class="hidden items-center gap-6 md:flex" aria-label="Điều hướng chính">
        <NuxtLink
          v-for="l in links"
          :key="l.to"
          :to="l.to"
          class="font-sans text-xs font-medium tracking-[0.12em] text-silver transition hover:text-paper hover:underline decoration-hopper underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-hopper rounded"
        >{{ l.label }}</NuxtLink>
      </nav>

      <!-- Mobile hamburger -->
      <button
        type="button"
        @click="open = !open"
        :aria-expanded="open"
        aria-label="Mở menu điều hướng"
        class="flex md:hidden items-center justify-center p-2 text-silver hover:text-paper focus-visible:outline focus-visible:outline-2 focus-visible:outline-hopper rounded"
      >
        <svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <line v-if="!open" x1="3" y1="6" x2="21" y2="6"/>
          <line v-if="!open" x1="3" y1="12" x2="21" y2="12"/>
          <line v-if="!open" x1="3" y1="18" x2="21" y2="18"/>
          <line v-if="open" x1="6" y1="6" x2="18" y2="18"/>
          <line v-if="open" x1="18" y1="6" x2="6" y2="18"/>
        </svg>
      </button>
    </div>

    <!-- Mobile menu -->
    <nav v-if="open" class="border-t border-hopper/20 bg-panel px-4 py-3 md:hidden" aria-label="Menu di động">
      <NuxtLink
        v-for="l in links"
        :key="l.to"
        :to="l.to"
        @click="open = false"
        class="block py-2.5 font-sans text-sm font-medium tracking-[0.1em] text-silver hover:text-paper focus-visible:outline focus-visible:outline-2 focus-visible:outline-hopper rounded"
      >{{ l.label }}</NuxtLink>
    </nav>
  </header>
</template>
