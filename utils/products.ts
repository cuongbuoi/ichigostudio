import type { ProductMeta } from '../types/product'

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
