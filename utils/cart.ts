export interface CartEntry {
  productId: string
  qty: number
}

export interface CartProduct {
  id: string
  slug: string
  title: string
  price: number | null
  cover: string
}

export type CartLine = CartProduct & { qty: number; lineTotal: number }

export const MAX_QTY = 10
export const MAX_LINES = 20

const clampQty = (qty: number): number => Math.min(qty, MAX_QTY)

export function addToCart(cart: CartEntry[], productId: string, qty = 1): CartEntry[] {
  const existing = cart.find(e => e.productId === productId)
  if (existing) {
    return cart.map(e => (e.productId === productId ? { ...e, qty: clampQty(e.qty + qty) } : e))
  }
  if (cart.length >= MAX_LINES || qty <= 0) return [...cart]
  return [...cart, { productId, qty: clampQty(qty) }]
}

export function setQty(cart: CartEntry[], productId: string, qty: number): CartEntry[] {
  if (qty <= 0) return removeFromCart(cart, productId)
  return cart.map(e => (e.productId === productId ? { ...e, qty: clampQty(qty) } : e))
}

export function removeFromCart(cart: CartEntry[], productId: string): CartEntry[] {
  return cart.filter(e => e.productId !== productId)
}

export function resolveCart(
  cart: CartEntry[],
  products: CartProduct[],
): { lines: CartLine[]; unavailable: CartEntry[]; subtotal: number } {
  const byId = new Map(products.map(p => [p.id, p]))
  const lines: CartLine[] = []
  const unavailable: CartEntry[] = []
  let subtotal = 0
  for (const entry of cart) {
    const p = byId.get(entry.productId)
    if (!p || p.price == null || p.price <= 0) {
      unavailable.push(entry)
      continue
    }
    const lineTotal = p.price * entry.qty
    subtotal += lineTotal
    lines.push({ ...p, qty: entry.qty, lineTotal })
  }
  return { lines, unavailable, subtotal }
}

// Chỉ nhận mảng {productId: string, qty: số nguyên >= 1}; còn lại trả [] và không bao giờ throw.
export function parseCart(raw: string | null): CartEntry[] {
  if (!raw) return []
  try {
    const data: unknown = JSON.parse(raw)
    if (!Array.isArray(data)) return []
    const out: CartEntry[] = []
    for (const item of data) {
      if (
        !item || typeof item !== 'object'
        || typeof (item as any).productId !== 'string'
        || !Number.isInteger((item as any).qty)
        || (item as any).qty < 1
      ) return []
      out.push({ productId: (item as any).productId, qty: (item as any).qty })
    }
    return out
  } catch {
    return []
  }
}
