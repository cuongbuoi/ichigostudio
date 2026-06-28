<script setup lang="ts">
import { buildMessengerHref } from '~/utils/messenger'
const shop = useShop()
const href = computed(() => buildMessengerHref(shop.messengerUrl))
</script>

<template>
  <a
    :href="href"
    target="_blank"
    rel="noopener noreferrer"
    aria-label="Lien he qua Messenger"
    class="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-hopper text-night shadow-lg transition hover:bg-hopper-bright active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hopper-bright"
  >
    <svg viewBox="0 0 24 24" class="h-6 w-6" fill="currentColor" aria-hidden="true">
      <path d="M12 2C6.5 2 2 6.1 2 11.2c0 2.9 1.4 5.5 3.7 7.2V22l3.4-1.9c.9.3 1.9.4 2.9.4 5.5 0 10-4.1 10-9.2S17.5 2 12 2zm1 12.4l-2.5-2.7-4.9 2.7 5.4-5.7 2.6 2.7 4.8-2.7-5.4 5.7z"/>
    </svg>
  </a>
</template>
