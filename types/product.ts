export interface ProductMeta {
  id: string
  slug: string
  title: string
  category: string
  categorySlug: string
  material: string
  price: number | null
  cover: string
  images: string[]
  featured: boolean
  order: number
  createdAt?: number
  // Số món đã bán; null khi dưới ngưỡng công khai (API quyết định).
  sold?: number | null
}

export interface Product extends ProductMeta {
  bodyMd?: string | null
}
