export interface SavedOrder {
  code: string
  phone: string
  savedAt: number
}

const STORAGE_KEY = 'ichigo.orders.v1'
const MAX_ORDERS = 20

function read(): SavedOrder[] {
  try {
    const data: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')
    if (!Array.isArray(data)) return []
    return data.filter(
      (o): o is SavedOrder =>
        !!o && typeof o.code === 'string' && typeof o.phone === 'string' && typeof o.savedAt === 'number',
    )
  } catch {
    return []
  }
}

function write(orders: SavedOrder[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(orders))
  } catch {
    // storage bị chặn: bỏ qua
  }
}

/** Đơn đã đặt trên thiết bị này (để tra cứu lại), mới nhất trước, tối đa 20. */
export function useSavedOrders() {
  const orders = useState<SavedOrder[]>('saved-orders', () => [])
  const hydrated = useState<boolean>('saved-orders-hydrated', () => false)

  if (import.meta.client) {
    onMounted(() => {
      if (hydrated.value) return
      const stored = read()
      const extra = orders.value.filter(o => !stored.some(s => s.code === o.code))
      orders.value = [...extra, ...stored].slice(0, MAX_ORDERS)
      hydrated.value = true
    })
  }

  function save(o: SavedOrder) {
    if (orders.value.some(x => x.code === o.code)) return
    orders.value = [o, ...orders.value].slice(0, MAX_ORDERS)
    if (import.meta.client && hydrated.value) write(orders.value)
  }

  function remove(code: string) {
    orders.value = orders.value.filter(o => o.code !== code)
    if (import.meta.client && hydrated.value) write(orders.value)
  }

  return { orders, save, remove }
}
