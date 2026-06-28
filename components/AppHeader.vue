<script setup lang="ts">
const shop = useShop()
const links = [
  { to: '/', label: 'Trang chu' },
  { to: '/san-pham', label: 'Bo suu tap' },
  { to: '/gioi-thieu', label: 'Gioi thieu' },
  { to: '/lien-he', label: 'Lien he' },
]
const open = ref(false)
</script>

<template>
  <header class="sticky top-0 z-40 border-b border-ink/10 bg-bone/80 backdrop-blur dark:border-bone/10 dark:bg-ink/80">
    <div class="mx-auto flex h-16 max-w-content items-center justify-between px-4 md:px-8">
      <NuxtLink to="/" class="font-display text-lg tracking-tight">{{ shop.name }}</NuxtLink>
      <nav class="hidden items-center gap-8 md:flex" aria-label="Dieu huong chinh">
        <NuxtLink v-for="l in links" :key="l.to" :to="l.to"
          class="text-sm text-ink/70 transition hover:text-ink dark:text-bone/70 dark:hover:text-bone focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent rounded">{{ l.label }}</NuxtLink>
        <ColorModeToggle />
      </nav>
      <div class="flex items-center gap-2 md:hidden">
        <ColorModeToggle />
        <button type="button" @click="open = !open" aria-label="Mo menu" class="p-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent rounded">
          <span aria-hidden="true">&#9776;</span>
        </button>
      </div>
    </div>
    <nav v-if="open" class="border-t border-ink/10 px-4 py-3 md:hidden dark:border-bone/10" aria-label="Menu di dong">
      <NuxtLink v-for="l in links" :key="l.to" :to="l.to" @click="open = false"
        class="block py-2 text-ink/80 dark:text-bone/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent rounded">{{ l.label }}</NuxtLink>
    </nav>
  </header>
</template>
