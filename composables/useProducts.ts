import { sortByOrder, getFeatured, getSeriesList, getRelated } from '~/utils/products'
import type { ProductMeta } from '~/types/product'

export function useProducts() {
  const { data } = useAsyncData('products', () =>
    queryCollection('products').all() as Promise<any[]>
  )
  const all = computed<ProductMeta[]>(() => sortByOrder((data.value ?? []) as ProductMeta[]))
  const featured = computed(() => getFeatured(all.value))
  const seriesList = computed(() => getSeriesList(all.value))
  const related = (current: ProductMeta) => getRelated(all.value, current)
  return { all, featured, seriesList, related }
}
