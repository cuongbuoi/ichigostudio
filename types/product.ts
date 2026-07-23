export interface ProductMeta {
  id: string
  slug: string
  title: string
  series: string
  material: string
  price: number | null
  cover: string
  images: string[]
  featured: boolean
  order: number
}

export interface Product extends ProductMeta {
  bodyMd?: string | null
}
