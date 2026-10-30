import { describe, it, expect } from 'vitest'
import { productCrumbs, breadcrumbJsonLd, productJsonLd } from '../utils/structured-data'
import type { ProductMeta } from '../types/product'

const SITE = 'https://ichigostudio.vn'
const base: ProductMeta = {
  id: 'p1', slug: 'khay-x', title: 'Khay X', category: 'Kamen Rider My-th', categorySlug: 'kamen-rider-my-th',
  material: 'PLA', price: 260000, cover: 'https://cdn/c.webp', images: [], featured: false, order: 0,
}

describe('productCrumbs', () => {
  it('4 cấp qua danh mục', () => {
    expect(productCrumbs(base)).toEqual([
      { name: 'Trang chủ', to: '/' },
      { name: 'Danh mục', to: '/danh-muc' },
      { name: 'Kamen Rider My-th', to: '/danh-muc/kamen-rider-my-th' },
      { name: 'Khay X' },
    ])
  })
  it('chưa gán danh mục thì qua Bộ sưu tập', () => {
    expect(productCrumbs({ ...base, categorySlug: '' }).map((c) => c.name)).toEqual(['Trang chủ', 'Bộ sưu tập', 'Khay X'])
  })
})

describe('breadcrumbJsonLd', () => {
  it('URL tuyệt đối, mục cuối là URL trang hiện tại', () => {
    const ld = breadcrumbJsonLd(productCrumbs(base), SITE, `${SITE}/san-pham/khay-x`)
    expect(ld.itemListElement.map((i) => i.item)).toEqual([
      SITE, `${SITE}/danh-muc`, `${SITE}/danh-muc/kamen-rider-my-th`, `${SITE}/san-pham/khay-x`,
    ])
    expect(ld.itemListElement[3].position).toBe(4)
  })
})

describe('productJsonLd', () => {
  it('có sku, @id, seller, itemCondition; mô tả lấy chất liệu thật', () => {
    const ld = productJsonLd(base, SITE) as any
    expect(ld.sku).toBe('p1')
    expect(ld['@id']).toBe(`${SITE}/san-pham/khay-x#product`)
    expect(ld.description).toContain('(PLA)')
    expect(ld.description).not.toContain('PLA+')
    expect(ld.image).toEqual(['https://cdn/c.webp'])
    expect(ld.offers.seller).toEqual({ '@id': `${SITE}/#organization` })
    expect(ld.offers.itemCondition).toBe('https://schema.org/NewCondition')
  })
  it('không có giá thì không khai Offer', () => {
    expect(productJsonLd({ ...base, price: null }, SITE)).not.toHaveProperty('offers')
  })
})
