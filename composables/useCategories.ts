export interface StoreCategory {
  name: string
  slug: string
}

export function useCategories() {
  const { public: { apiBase } } = useRuntimeConfig()
  const { data } = useAsyncData('categories', async () => {
    try {
      const res = await $fetch<{ items: StoreCategory[] }>(`${apiBase}/public/categories`)
      return res.items ?? []
    } catch {
      return [] as StoreCategory[]
    }
  })
  const categories = computed<StoreCategory[]>(() => data.value ?? [])
  const bySlug = (slug: string) => categories.value.find(c => c.slug === slug)
  return { categories, bySlug }
}
