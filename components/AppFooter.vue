<script setup lang="ts">
const shop = useShop()
</script>

<template>
  <footer class="mt-24 border-t border-hopper/30 bg-night">
    <div class="mx-auto flex max-w-content flex-col gap-6 px-4 py-12 md:flex-row md:items-end md:justify-between md:px-8">
      <div>
        <span class="inline-flex items-center justify-center overflow-hidden rounded-xl bg-paper">
          <NuxtImg src="/logo.png" :alt="shop.name" width="240" height="240" class="h-24 w-24 object-contain" />
        </span>
        <p class="mt-3 max-w-[40ch] font-sans text-sm font-light text-silver/80">{{ shop.tagline }}</p>
        <p class="mt-1 font-sans text-sm font-light text-silver/70">{{ shop.area }}</p>
      </div>
      <MessengerButton variant="ghost" label="Nhắn tin cho shop" />
    </div>
    <div class="border-t border-paper/10 py-4 text-center font-sans text-xs text-silver/60">
      &copy; {{ new Date().getFullYear() }} {{ shop.name }}. In FDM nhiều màu.
    </div>
  </footer>
</template>
