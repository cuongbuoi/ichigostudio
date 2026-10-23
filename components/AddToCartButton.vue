<script setup lang="ts">
const props = defineProps<{
  product: { id: string; title: string; price: number | null }
  source?: string
  /** Icon-only, padding nhỏ (thanh dính đáy mobile). Không chèn link vào hàng. */
  compact?: boolean
}>()

const { cartVisible } = useCheckoutConfig()
const { add } = useCart()
const { gtag } = useGtag()

const canBuy = computed(() => cartVisible.value && props.product.price != null && props.product.price > 0)
const justAdded = ref(false)
let timer: ReturnType<typeof setTimeout> | undefined

function onAdd() {
  const price = props.product.price
  if (price == null || price <= 0) return
  add(props.product.id)
  justAdded.value = true
  clearTimeout(timer)
  timer = setTimeout(() => { justAdded.value = false }, 2000)
  gtag('event', 'add_to_cart', {
    currency: 'VND',
    value: price,
    source: props.source ?? 'generic',
    items: [{ item_id: props.product.id, item_name: props.product.title, price, quantity: 1 }],
  })
}

onBeforeUnmount(() => clearTimeout(timer))
</script>

<template>
  <div v-if="canBuy" :class="compact ? 'inline-flex' : 'inline-flex items-center gap-3'">
    <button
      type="button"
      @click="onAdd"
      :aria-label="compact ? `Thêm ${product.title} vào giỏ` : undefined"
      :class="[
        'inline-flex items-center justify-center rounded border border-hopper font-sans text-sm font-medium tracking-wide transition active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hopper',
        compact ? 'h-10 w-10' : 'gap-2 px-6 py-3',
        compact && justAdded ? 'bg-hopper text-night' : 'text-hopper hover:bg-hopper hover:text-night',
      ]"
    >
      <svg v-if="compact && justAdded" viewBox="0 0 24 24" class="h-4 w-4 shrink-0" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <polyline points="5 12 10 17 19 7" />
      </svg>
      <svg v-else viewBox="0 0 24 24" class="h-4 w-4 shrink-0" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <circle cx="9" cy="20" r="1.5" /><circle cx="18" cy="20" r="1.5" />
        <path d="M2 3h3l2.5 12h11l2-8H6" />
      </svg>
      <template v-if="!compact">{{ justAdded ? 'Đã thêm vào giỏ' : 'Thêm vào giỏ' }}</template>
    </button>
    <NuxtLink
      v-if="justAdded && !compact"
      to="/gio-hang"
      class="font-sans text-sm text-hopper underline underline-offset-4 hover:text-hopper-bright focus-visible:outline focus-visible:outline-2 focus-visible:outline-hopper rounded"
    >Xem giỏ</NuxtLink>
    <span class="sr-only" role="status" aria-live="polite">{{ justAdded ? 'Đã thêm vào giỏ' : '' }}</span>
  </div>
</template>
