import type { ProductMeta, Product } from '../types/product'

export function sortByOrder(items: ProductMeta[]): ProductMeta[] {
  return [...items].sort((a, b) => a.order - b.order)
}

export function getFeatured(items: ProductMeta[]): ProductMeta[] {
  return sortByOrder(items.filter(i => i.featured))
}

export function getSeriesList(items: ProductMeta[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const i of sortByOrder(items)) {
    if (!seen.has(i.series)) { seen.add(i.series); out.push(i.series) }
  }
  return out
}

export function filterBySeries(items: ProductMeta[], series: string | null): ProductMeta[] {
  const sorted = sortByOrder(items)
  if (!series || series === 'all') return sorted
  return sorted.filter(i => i.series === series)
}

export function getRelated(items: ProductMeta[], current: ProductMeta, limit = 4): ProductMeta[] {
  return sortByOrder(items)
    .filter(i => i.series === current.series && i.slug !== current.slug)
    .slice(0, limit)
}

export function mapApiProduct(api: any): Product {
  const images: string[] = Array.isArray(api?.images) ? api.images.map((i: any) => i.url) : []
  return {
    id: api.id,
    slug: api.slug,
    title: api.title,
    series: api.series,
    material: api.material,
    price: api.price ?? null,
    cover: api.cover ?? images[0] ?? '',
    images,
    featured: !!api.featured,
    order: api.order ?? 0,
    bodyMd: api.bodyMd ?? null,
  }
}

export function formatPrice(price: number | null): string {
  if (price == null) return 'Liên hệ'
  return `${price.toLocaleString('vi-VN')} ₫`
}
