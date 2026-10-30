export interface CultsModel {
  name: string
  url: string
  image: string | null
  priceCents: number
  currency: string | null
  free: boolean
  downloads: number
  likes: number
  publishedAt: string | null
}

export function useCultsModels() {
  const { public: { apiBase } } = useRuntimeConfig()
  const { data } = useAsyncData('cults-models', async () => {
    try {
      return await $fetch<{ items: CultsModel[]; configured: boolean }>(`${apiBase}/public/cults-models`)
    } catch {
      return { items: [] as CultsModel[], configured: false }
    }
  })
  const models = computed<CultsModel[]>(() => data.value?.items ?? [])
  const configured = computed<boolean>(() => data.value?.configured ?? false)
  return { models, configured }
}

// Hiển thị giá (Cults3D bán theo USD/EUR cho khách quốc tế). Free = miễn phí.
export function formatCultsPrice(m: CultsModel): string {
  if (m.free) return 'Free'
  const amount = m.priceCents / 100
  const cur = m.currency || 'USD'
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: cur }).format(amount)
  } catch {
    return `${amount.toFixed(2)} ${cur}`
  }
}
