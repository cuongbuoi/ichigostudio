export interface Product {
  title: string
  slug: string
  series: string
  scale?: string
  height?: string
  capacity?: string
  material: string
  priceRef: string
  featured: boolean
  order: number
  images: string[]
  cover: string
  description?: string
}

export type ProductMeta = Omit<Product, 'description'>
