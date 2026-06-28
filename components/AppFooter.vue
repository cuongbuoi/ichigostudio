<script setup lang="ts">
const shop = useShop()
</script>

<template>
  <footer class="mt-24 border-t border-ink/10 dark:border-bone/10">
    <div class="mx-auto flex max-w-content flex-col gap-6 px-4 py-12 md:flex-row md:items-end md:justify-between md:px-8">
      <div>
        <p class="font-display text-xl tracking-tight">{{ shop.name }}</p>
        <p class="mt-2 max-w-[40ch] text-sm text-ink/60 dark:text-bone/60">{{ shop.tagline }}</p>
        <p class="mt-1 text-sm text-ink/50 dark:text-bone/50">Khu vuc: {{ shop.area }}</p>
      </div>
      <MessengerButton variant="ghost" label="Nhan tin cho shop" />
    </div>
    <div class="border-t border-ink/10 py-4 text-center text-xs text-ink/40 dark:border-bone/10 dark:text-bone/40">
      &copy; {{ new Date().getFullYear() }} {{ shop.name }}
    </div>
  </footer>
</template>
