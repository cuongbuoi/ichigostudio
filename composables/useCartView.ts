import { resolveCart, type CartProduct } from '~/utils/cart'

/** Id SP bị API báo không còn bán (409), để giỏ đánh dấu ngay dù danh sách SP chưa cập nhật. */
export function useUnavailableIds() {
  return useState<string[]>('cart-unavailable-ids', () => [])
}

/**
 * Dữ liệu giỏ cho trang giỏ/checkout: chỉ nạp phía client (SSR render khung chờ).
 * `ready` = đã mount và đã có danh sách SP.
 */
export function useCartView() {
  const nuxtApp = useNuxtApp()
  const { entries } = useCart()
  const { testMode, testKey } = useCheckoutConfig()
  const blockedIds = useUnavailableIds()
  const products = ref<CartProduct[] | null>(null)

  async function load() {
    try {
      products.value = await nuxtApp.runWithContext(() => useCartProducts())
    } catch {
      products.value = []
    }
  }

  onMounted(load)
  watch([testMode, testKey], () => { if (products.value) load() })

  const resolved = computed(() => {
    const list = (products.value ?? []).filter(p => !blockedIds.value.includes(p.id))
    return resolveCart(entries.value, list)
  })
  const ready = computed(() => products.value !== null)

  return { entries, products, resolved, ready, blockedIds }
}
