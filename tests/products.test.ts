import { describe, it, expect } from 'vitest'
import { sortByOrder, getFeatured, getSeriesList, filterBySeries, getRelated } from '../utils/products'
import type { ProductMeta } from '../types/product'

const p = (over: Partial<ProductMeta>): ProductMeta => ({
  title: 't', slug: 's', series: 'Kamen Rider', scale: '1/12', height: '18 cm',
  material: 'resin', priceRef: 'Liên hệ', featured: false, order: 0,
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
  it('filterBySeries lọc đúng; null trả tất cả', () => {
    expect(filterBySeries(items, 'Ultraman').map(i => i.slug)).toEqual(['a', 'c'])
    expect(filterBySeries(items, null).length).toBe(3)
    expect(filterBySeries(items, 'all').length).toBe(3)
  })
  it('getRelated lấy cùng series khác slug, giới hạn limit', () => {
    const cur = items[0] // slug a, Ultraman
    expect(getRelated(items, cur, 4).map(i => i.slug)).toEqual(['c'])
  })
})
