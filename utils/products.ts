import type { ProductMeta, Product } from '../types/product'

export interface CategoryRef {
  name: string
  slug: string
}

export function sortByOrder(items: ProductMeta[]): ProductMeta[] {
  return [...items].sort((a, b) => a.order - b.order)
}

export function getFeatured(items: ProductMeta[]): ProductMeta[] {
  return sortByOrder(items.filter(i => i.featured))
}

// Danh mục duy nhất (theo slug) theo thứ tự xuất hiện sau sort. Bỏ SP chưa phân loại.
export function getCategoryList(items: ProductMeta[]): CategoryRef[] {
  const seen = new Set<string>()
  const out: CategoryRef[] = []
  for (const i of sortByOrder(items)) {
    if (i.categorySlug && !seen.has(i.categorySlug)) {
      seen.add(i.categorySlug)
      out.push({ name: i.category, slug: i.categorySlug })
    }
  }
  return out
}

export function filterByCategory(items: ProductMeta[], slug: string | null): ProductMeta[] {
  const sorted = sortByOrder(items)
  if (!slug || slug === 'all') return sorted
  return sorted.filter(i => i.categorySlug === slug)
}

export function getNewest(items: ProductMeta[], limit = 6): ProductMeta[] {
  return [...items].sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0)).slice(0, limit)
}

export function getRelated(items: ProductMeta[], current: ProductMeta, limit = 4): ProductMeta[] {
  if (!current.categorySlug) return []
  return sortByOrder(items)
    .filter(i => i.categorySlug === current.categorySlug && i.slug !== current.slug)
    .slice(0, limit)
}

export function mapApiProduct(api: any): Product {
  const images: string[] = Array.isArray(api?.images) ? api.images.map((i: any) => i.url) : []
  return {
    id: api.id,
    slug: api.slug,
    title: api.title,
    // Danh mục quản lý (fallback series denormalized nếu API cũ).
    category: api.categoryName ?? api.series ?? '',
    categorySlug: api.categorySlug ?? '',
    material: api.material,
    price: api.price ?? null,
    cover: api.cover ?? images[0] ?? '',
    images,
    featured: !!api.featured,
    order: api.order ?? 0,
    createdAt: api.createdAt ?? 0,
    sold: api.sold ?? null,
    bodyMd: api.bodyMd ?? null,
  }
}

export function formatPrice(price: number | null): string {
  if (price == null) return 'Liên hệ'
  return `${price.toLocaleString('vi-VN')} ₫`
}
