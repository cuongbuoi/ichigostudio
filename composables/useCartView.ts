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
  const { entries } = useCart()
  const { testMode, testKey } = useCheckoutConfig()
  const blockedIds = useUnavailableIds()
  const loadCartProducts = useCartProductsLoader()
  const products = ref<CartProduct[] | null>(null)

  let seq = 0
  async function load() {
    const mySeq = ++seq
    let list: CartProduct[]
    try {
      list = await loadCartProducts()
    } catch {
      list = []
    }
    // Chỉ lần nạp mới nhất được ghi (tránh kết quả cũ về trễ đè lên).
    if (mySeq === seq) products.value = list
  }

  onMounted(load)
  watch([testMode, testKey], load)

  // SP bị gỡ khỏi giỏ (hoặc thêm lại sau khi gỡ) thì hết bị đánh dấu không còn bán.
  watch(entries, (list) => {
    if (!blockedIds.value.length) return
    const inCart = new Set(list.map(e => e.productId))
    const next = blockedIds.value.filter(id => inCart.has(id))
    if (next.length !== blockedIds.value.length) blockedIds.value = next
  }, { deep: true })

  const resolved = computed(() => {
    const list = (products.value ?? []).filter(p => !blockedIds.value.includes(p.id))
    return resolveCart(entries.value, list)
  })
  const ready = computed(() => products.value !== null)

  return { entries, products, resolved, ready, blockedIds }
}
