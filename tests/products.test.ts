import { describe, it, expect } from 'vitest'
import { sortByOrder, getFeatured, getCategoryList, getNewest, filterByCategory, getRelated, mapApiProduct, formatPrice } from '../utils/products'
import type { ProductMeta } from '../types/product'

const p = (over: Partial<ProductMeta>): ProductMeta => ({
  id: 'id', title: 't', slug: 's', category: 'Kamen Rider', categorySlug: 'kamen-rider',
  material: 'PLA', price: null, featured: false, order: 0,
  images: [], cover: '', ...over,
})

const items: ProductMeta[] = [
  p({ slug: 'a', category: 'Ultraman', categorySlug: 'ultraman', order: 2, featured: true }),
  p({ slug: 'b', category: 'Kamen Rider', categorySlug: 'kamen-rider', order: 1, featured: false }),
  p({ slug: 'c', category: 'Ultraman', categorySlug: 'ultraman', order: 3, featured: true }),
]

describe('utils/products', () => {
  it('sortByOrder sắp tăng dần theo order', () => {
    expect(sortByOrder(items).map(i => i.slug)).toEqual(['b', 'a', 'c'])
  })
  it('getFeatured chỉ lấy featured và đã sort', () => {
    expect(getFeatured(items).map(i => i.slug)).toEqual(['a', 'c'])
  })
  it('getCategoryList trả danh mục duy nhất theo thứ tự xuất hiện sau sort', () => {
    expect(getCategoryList(items)).toEqual([
      { name: 'Kamen Rider', slug: 'kamen-rider' },
      { name: 'Ultraman', slug: 'ultraman' },
    ])
  })
  it('getCategoryList bỏ SP chưa phân loại', () => {
    expect(getCategoryList([p({ slug: 'x', category: '', categorySlug: '' })])).toEqual([])
  })
  it('getNewest sắp theo createdAt giảm dần và cắt theo limit', () => {
    const byDate = [
      p({ slug: 'old', createdAt: 100 }),
      p({ slug: 'new', createdAt: 300 }),
      p({ slug: 'mid', createdAt: 200 }),
    ]
    expect(getNewest(byDate).map(i => i.slug)).toEqual(['new', 'mid', 'old'])
    expect(getNewest(byDate, 2).map(i => i.slug)).toEqual(['new', 'mid'])
  })
  it('filterByCategory lọc theo slug; null/all trả tất cả', () => {
    expect(filterByCategory(items, 'ultraman').map(i => i.slug)).toEqual(['a', 'c'])
    expect(filterByCategory(items, null).length).toBe(3)
    expect(filterByCategory(items, 'all').length).toBe(3)
  })
  it('getRelated lấy cùng danh mục khác slug, giới hạn limit', () => {
    expect(getRelated(items, items[0], 4).map(i => i.slug)).toEqual(['c'])
  })
  it('getRelated rỗng khi SP chưa phân loại', () => {
    expect(getRelated(items, p({ slug: 'z', category: '', categorySlug: '' }))).toEqual([])
  })
})

describe('mapApiProduct', () => {
  it('maps images [{url}] -> string[] và cover fallback ảnh đầu, category từ categoryName', () => {
    const r = mapApiProduct({ id: '1', slug: 's', title: 'T', categoryName: 'Gavv', categorySlug: 'gavv', material: 'PLA', price: 360000, cover: null, featured: false, order: 1, bodyMd: '# hi', images: [{ url: '/media/a.jpg', sort: 0 }, { url: '/media/b.jpg', sort: 1 }] })
    expect(r.images).toEqual(['/media/a.jpg', '/media/b.jpg'])
    expect(r.cover).toBe('/media/a.jpg')
    expect(r.price).toBe(360000)
    expect(r.bodyMd).toBe('# hi')
    expect(r.category).toBe('Gavv')
    expect(r.categorySlug).toBe('gavv')
  })
  it('fallback series (API cũ) + chưa phân loại -> categorySlug rỗng', () => {
    const r = mapApiProduct({ id: '1', slug: 's', title: 'T', series: 'X', material: 'PLA', price: null, cover: '/media/c.jpg', featured: true, order: 2 })
    expect(r.category).toBe('X')
    expect(r.categorySlug).toBe('')
    expect(r.cover).toBe('/media/c.jpg')
    expect(r.price).toBeNull()
    expect(r.sold).toBeNull()
  })
  it('sold lấy từ API (API đã áp ngưỡng)', () => {
    expect(mapApiProduct({ id: '1', slug: 's', title: 'T', material: 'PLA', price: 1, sold: 42 }).sold).toBe(42)
  })
})

describe('formatPrice', () => {
  it('null -> Liên hệ', () => { expect(formatPrice(null)).toBe('Liên hệ') })
  it('số -> định dạng vi-VN + ₫', () => { expect(formatPrice(360000)).toBe('360.000 ₫') })
})
