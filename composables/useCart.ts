import { addToCart, setQty, removeFromCart, parseCart, type CartEntry, type CartProduct } from '~/utils/cart'
import { mapApiProduct } from '~/utils/products'

const STORAGE_KEY = 'ichigo.cart.v1'

function readStorage(): CartEntry[] {
  try {
    return parseCart(localStorage.getItem(STORAGE_KEY))
  } catch {
    return []
  }
}

function writeStorage(entries: CartEntry[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries))
  } catch {
    // storage bị chặn hoặc đầy: giỏ chỉ sống trong phiên
  }
}

/** Giỏ hàng (state dùng chung, lưu localStorage, chỉ nạp phía client). */
export function useCart() {
  const entries = useState<CartEntry[]>('cart', () => [])
  const hydrated = useState<boolean>('cart-hydrated', () => false)

  if (import.meta.client) {
    onMounted(() => {
      if (hydrated.value) return
      const stored = readStorage()
      // Gộp phòng khi đã có mục thêm trước lúc nạp.
      entries.value = entries.value.reduce((acc, e) => addToCart(acc, e.productId, e.qty), stored)
      hydrated.value = true
    })
    watch(entries, (val) => {
      if (hydrated.value) writeStorage(val)
    }, { deep: true })
  }

  const count = computed(() => entries.value.reduce((sum, e) => sum + e.qty, 0))

  return {
    entries,
    count,
    add: (id: string, qty = 1) => { entries.value = addToCart(entries.value, id, qty) },
    setQty: (id: string, qty: number) => { entries.value = setQty(entries.value, id, qty) },
    remove: (id: string) => { entries.value = removeFromCart(entries.value, id) },
    clear: () => { entries.value = [] },
  }
}

/** SP published (useProducts) + SP test (khi testMode) cho trang giỏ/checkout. */
export async function useCartProducts(): Promise<CartProduct[]> {
  const { public: { apiBase } } = useRuntimeConfig()
  const { all } = useProducts()
  const { testMode, testKey } = useCheckoutConfig()

  let published: CartProduct[] = all.value
  if (!published.length) {
    try {
      const res = await $fetch<{ items: any[] }>(`${apiBase}/public/products`)
      published = (res.items ?? []).map(mapApiProduct)
    } catch {
      published = []
    }
  }
  const toCartProduct = (p: any): CartProduct => ({
    id: p.id, slug: p.slug, title: p.title, price: p.price ?? null, cover: p.cover ?? '',
  })
  const result = published.map(toCartProduct)

  if (testMode.value && testKey.value) {
    try {
      const res = await $fetch<{ items: CartProduct[] }>(`${apiBase}/public/checkout/test-products`, {
        query: { key: testKey.value },
      })
      const seen = new Set(result.map(p => p.id))
      for (const p of res.items ?? []) if (!seen.has(p.id)) result.push(toCartProduct(p))
    } catch {
      // 403 hoặc lỗi mạng: bỏ qua SP test
    }
  }
  return result
}
