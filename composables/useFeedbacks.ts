export interface FeedbackItem {
  imageUrl: string
  featured: boolean
}

export function useFeedbacks() {
  const { public: { apiBase } } = useRuntimeConfig()
  const { data } = useAsyncData('feedbacks', async () => {
    try {
      const res = await $fetch<{ items: FeedbackItem[] }>(`${apiBase}/public/feedbacks`)
      return res.items ?? []
    } catch {
      return [] as FeedbackItem[]
    }
  })
  const all = computed<FeedbackItem[]>(() => data.value ?? [])
  const featured = computed(() => all.value.filter((f) => f.featured))
  return { all, featured }
}
