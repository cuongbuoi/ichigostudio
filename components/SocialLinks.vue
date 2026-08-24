<script setup lang="ts">
const props = withDefaults(defineProps<{
  /** Vị trí đặt (để phân biệt trong GA4): 'footer' | 'home' | 'blog' ... */
  source?: string
  /** 'icons' = nút tròn nhỏ; 'buttons' = nút có nhãn to. */
  variant?: 'icons' | 'buttons'
}>(), { source: 'generic', variant: 'icons' })

const shop = useShop()
const { gtag } = useGtag()
function track(network: string) {
  gtag('event', 'social_click', { network, source: props.source })
}

const links = computed(() =>
  [
    { key: 'facebook', label: 'Facebook', href: (shop as any).facebookUrl },
    { key: 'tiktok', label: 'TikTok', href: (shop as any).tiktokUrl },
  ].filter((l) => l.href),
)
</script>

<template>
  <div :class="variant === 'buttons' ? 'flex flex-wrap gap-3' : 'flex items-center gap-3'">
    <a
      v-for="l in links"
      :key="l.key"
      :href="l.href"
      target="_blank"
      rel="noopener noreferrer"
      :aria-label="`Theo dõi Ichigo Studio trên ${l.label}`"
      @click="track(l.key)"
      :class="[
        'inline-flex items-center gap-2 font-sans font-medium tracking-wide transition active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hopper',
        variant === 'buttons'
          ? 'rounded px-5 py-2.5 text-sm border border-silver/30 text-paper hover:border-hopper hover:text-hopper-bright'
          : 'h-10 w-10 justify-center rounded-full border border-silver/25 text-silver hover:border-hopper hover:text-hopper-bright',
      ]"
    >
      <!-- Facebook -->
      <svg v-if="l.key === 'facebook'" viewBox="0 0 24 24" class="h-5 w-5 shrink-0" fill="currentColor" aria-hidden="true">
        <path d="M22 12.06C22 6.48 17.52 2 11.94 2 6.36 2 1.88 6.48 1.88 12.06c0 5.02 3.68 9.19 8.49 9.94v-7.03H7.83v-2.91h2.54V9.85c0-2.51 1.49-3.9 3.78-3.9 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56v1.87h2.78l-.44 2.91h-2.34V22c4.81-.75 8.49-4.92 8.49-9.94z"/>
      </svg>
      <!-- TikTok -->
      <svg v-else viewBox="0 0 24 24" class="h-5 w-5 shrink-0" fill="currentColor" aria-hidden="true">
        <path d="M16.6 5.82a4.28 4.28 0 0 1-1.06-2.82h-3.2v12.9a2.34 2.34 0 0 1-2.34 2.28 2.34 2.34 0 0 1-2.33-2.34 2.34 2.34 0 0 1 3.02-2.24V8.3a5.54 5.54 0 0 0-5.94 5.52A5.54 5.54 0 0 0 10.3 19.9a5.54 5.54 0 0 0 5.5-5.52V8.9a7.5 7.5 0 0 0 4.2 1.28V6.98a4.28 4.28 0 0 1-3.4-1.16z"/>
      </svg>
      <span v-if="variant === 'buttons'">{{ l.label }}</span>
    </a>
  </div>
</template>
