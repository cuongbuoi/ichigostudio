import { describe, it, expect } from 'vitest'
import { sortByOrder, getFeatured, getSeriesList, getNewest, filterBySeries, getRelated, mapApiProduct, formatPrice } from '../utils/products'
import type { ProductMeta } from '../types/product'

const p = (over: Partial<ProductMeta>): ProductMeta => ({
  id: 'id', title: 't', slug: 's', series: 'Kamen Rider',
  material: 'PLA', price: null, featured: false, order: 0,
  images: [], cover: '', ...over,
})

const items: ProductMeta[] = [
  p({ slug: 'a', series: 'Ultraman', order: 2, featured: true }),
  p({ slug: 'b', series: 'Kamen Rider', order: 1, featured: false }),
  p({ slug: 'c', series: 'Ultraman', order: 3, featured: true }),
]

describe('utils/products', () => {
  it('sortByOrder sắp tăng dần theo order', () => {
    expect(sortByOrder(items).map(i => i.slug)).toEqual(['b', 'a', 'c'])
  })
  it('getFeatured chỉ lấy featured và đã sort', () => {
    expect(getFeatured(items).map(i => i.slug)).toEqual(['a', 'c'])
  })
  it('getSeriesList trả series duy nhất theo thứ tự xuất hiện sau sort', () => {
    expect(getSeriesList(items)).toEqual(['Kamen Rider', 'Ultraman'])
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
  it('filterBySeries lọc đúng; null trả tất cả', () => {
    expect(filterBySeries(items, 'Ultraman').map(i => i.slug)).toEqual(['a', 'c'])
    expect(filterBySeries(items, null).length).toBe(3)
    expect(filterBySeries(items, 'all').length).toBe(3)
  })
  it('getRelated lấy cùng series khác slug, giới hạn limit', () => {
    expect(getRelated(items, items[0], 4).map(i => i.slug)).toEqual(['c'])
  })
})

describe('mapApiProduct', () => {
  it('maps images [{url}] -> string[] và cover fallback ảnh đầu', () => {
    const r = mapApiProduct({ id: '1', slug: 's', title: 'T', series: 'X', material: 'PLA', price: 360000, cover: null, featured: false, order: 1, bodyMd: '# hi', images: [{ url: '/media/a.jpg', sort: 0 }, { url: '/media/b.jpg', sort: 1 }] })
    expect(r.images).toEqual(['/media/a.jpg', '/media/b.jpg'])
    expect(r.cover).toBe('/media/a.jpg')
    expect(r.price).toBe(360000)
    expect(r.bodyMd).toBe('# hi')
  })
  it('list item không có images -> images [], cover từ API', () => {
    const r = mapApiProduct({ id: '1', slug: 's', title: 'T', series: 'X', material: 'PLA', price: null, cover: '/media/c.jpg', featured: true, order: 2 })
    expect(r.images).toEqual([])
    expect(r.cover).toBe('/media/c.jpg')
    expect(r.price).toBeNull()
  })
})

describe('formatPrice', () => {
  it('null -> Liên hệ', () => { expect(formatPrice(null)).toBe('Liên hệ') })
  it('số -> định dạng vi-VN + ₫', () => { expect(formatPrice(360000)).toBe('360.000 ₫') })
})
