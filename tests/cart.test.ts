import { describe, it, expect } from 'vitest'
import { addToCart, setQty, removeFromCart, resolveCart, parseCart, MAX_QTY, MAX_LINES } from '../utils/cart'
import { CUSTOMER_STATUS_LABELS } from '../utils/order-status'
import type { CartProduct } from '../utils/cart'

const prod = (over: Partial<CartProduct>): CartProduct => ({
  id: 'a', slug: 'a', title: 'A', price: 150000, cover: '', ...over,
})

describe('addToCart', () => {
  it('thêm dòng mới với qty 1', () => {
    expect(addToCart([], 'a')).toEqual([{ productId: 'a', qty: 1 }])
  })
  it('cộng dồn và cắt ở MAX_QTY', () => {
    expect(addToCart([{ productId: 'a', qty: 1 }], 'a', 15)).toEqual([{ productId: 'a', qty: MAX_QTY }])
  })
  it('không thêm dòng mới khi đủ MAX_LINES', () => {
    const full = Array.from({ length: MAX_LINES }, (_, i) => ({ productId: `p${i}`, qty: 1 }))
    expect(addToCart(full, 'new')).toEqual(full)
    expect(addToCart(full, 'p0')[0].qty).toBe(2)
  })
  it('không mutate đầu vào', () => {
    const c = [{ productId: 'a', qty: 1 }]
    addToCart(c, 'a')
    expect(c).toEqual([{ productId: 'a', qty: 1 }])
  })
})

describe('setQty / removeFromCart', () => {
  const cart = [{ productId: 'a', qty: 2 }, { productId: 'b', qty: 1 }]
  it('qty <= 0 xoá dòng', () => {
    expect(setQty(cart, 'a', 0)).toEqual([{ productId: 'b', qty: 1 }])
    expect(setQty(cart, 'a', -3)).toEqual([{ productId: 'b', qty: 1 }])
  })
  it('cắt ở MAX_QTY', () => {
    expect(setQty(cart, 'a', 99)[0].qty).toBe(MAX_QTY)
  })
  it('removeFromCart', () => {
    expect(removeFromCart(cart, 'b')).toEqual([{ productId: 'a', qty: 2 }])
  })
})

describe('resolveCart', () => {
  it('tính subtotal và tách unavailable', () => {
    const r = resolveCart(
      [{ productId: 'a', qty: 2 }, { productId: 'b', qty: 1 }, { productId: 'c', qty: 1 }],
      [prod({ id: 'a' }), prod({ id: 'b', slug: 'b', price: null })],
    )
    expect(r.subtotal).toBe(300000)
    expect(r.lines).toHaveLength(1)
    expect(r.lines[0]).toMatchObject({ id: 'a', qty: 2, lineTotal: 300000 })
    expect(r.unavailable).toEqual([{ productId: 'b', qty: 1 }, { productId: 'c', qty: 1 }])
  })
  it('giá <= 0 là unavailable', () => {
    const r = resolveCart([{ productId: 'a', qty: 1 }], [prod({ price: 0 })])
    expect(r.unavailable).toHaveLength(1)
    expect(r.subtotal).toBe(0)
  })
})

describe('parseCart', () => {
  it('JSON hỏng hoặc null', () => {
    expect(parseCart('{oops')).toEqual([])
    expect(parseCart(null)).toEqual([])
  })
  it('sai shape', () => {
    expect(parseCart('[{"productId":1}]')).toEqual([])
    expect(parseCart('{"a":1}')).toEqual([])
    expect(parseCart('[{"productId":"a","qty":0}]')).toEqual([])
    expect(parseCart('[{"productId":"a","qty":1.5}]')).toEqual([])
    expect(parseCart('[null]')).toEqual([])
  })
  it('hợp lệ', () => {
    expect(parseCart('[{"productId":"a","qty":2}]')).toEqual([{ productId: 'a', qty: 2 }])
  })
})

describe('CUSTOMER_STATUS_LABELS', () => {
  it('đủ nhãn', () => {
    expect(CUSTOMER_STATUS_LABELS).toEqual({
      pending: 'Đã nhận đơn', in_progress: 'Đang in', ready: 'In xong, chờ gửi',
      delivered: 'Đã gửi hàng', completed: 'Hoàn tất', cancelled: 'Đã hủy',
    })
  })
})
