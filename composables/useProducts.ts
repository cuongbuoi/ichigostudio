import { sortByOrder, getFeatured, getSeriesList, getRelated, mapApiProduct } from '~/utils/products'
import type { ProductMeta } from '~/types/product'

export function useProducts() {
  const { public: { apiBase } } = useRuntimeConfig()
  const { data } = useAsyncData('products', async () => {
    try {
      const res = await $fetch<{ items: any[] }>(`${apiBase}/public/products`)
      return (res.items ?? []).map(mapApiProduct)
    } catch {
      return []
    }
  })
  const all = computed<ProductMeta[]>(() => sortByOrder((data.value ?? []) as ProductMeta[]))
  const featured = computed(() => getFeatured(all.value))
  const seriesList = computed(() => getSeriesList(all.value))
  const related = (current: ProductMeta) => getRelated(all.value, current)
  const getBySlug = (slug: string) => all.value.find(p => p.slug === slug)
  return { all, featured, seriesList, getBySlug, related }
}
