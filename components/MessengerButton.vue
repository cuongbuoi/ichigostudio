<script setup lang="ts">
import { buildMessengerHref } from '~/utils/messenger'
const props = withDefaults(defineProps<{ label?: string; variant?: 'primary' | 'ghost' }>(), {
  label: 'Lien he qua Messenger', variant: 'primary',
})
const shop = useShop()
const href = computed(() => buildMessengerHref(shop.messengerUrl))
</script>

<template>
  <a
    :href="href"
    target="_blank"
    rel="noopener noreferrer"
    :class="[
      'inline-flex items-center gap-2 px-6 py-3 font-sans text-sm font-medium tracking-wide transition active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hopper',
      variant === 'primary'
        ? 'bg-hopper text-night hover:bg-hopper-bright rounded'
        : 'border border-silver/30 text-silver hover:border-silver/60 hover:text-paper rounded',
    ]"
  >
    <svg viewBox="0 0 24 24" class="h-4 w-4 shrink-0" fill="currentColor" aria-hidden="true">
      <path d="M12 2C6.5 2 2 6.1 2 11.2c0 2.9 1.4 5.5 3.7 7.2V22l3.4-1.9c.9.3 1.9.4 2.9.4 5.5 0 10-4.1 10-9.2S17.5 2 12 2zm1 12.4l-2.5-2.7-4.9 2.7 5.4-5.7 2.6 2.7 4.8-2.7-5.4 5.7z"/>
    </svg>
    {{ label }}
  </a>
</template>
