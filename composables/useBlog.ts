export interface BlogListItem {
  slug: string
  title: string
  excerpt: string | null
  coverImage: string | null
  publishedAt: number | null
  categoryName: string | null
  categorySlug: string | null
  // Danh mục SẢN PHẨM admin gắn cho bài (null nếu chưa gắn).
  productCategoryName?: string | null
  productCategorySlug?: string | null
  updatedAt?: number | null
}
export interface BlogCategoryItem {
  name: string
  slug: string
}

export function useBlog() {
  const { public: { apiBase } } = useRuntimeConfig()
  const { data } = useAsyncData('blog-posts', async () => {
    try {
      return await $fetch<{ items: BlogListItem[]; categories: BlogCategoryItem[] }>(`${apiBase}/public/posts`)
    } catch {
      return { items: [] as BlogListItem[], categories: [] as BlogCategoryItem[] }
    }
  })
  const posts = computed<BlogListItem[]>(() => data.value?.items ?? [])
  const categories = computed<BlogCategoryItem[]>(() => data.value?.categories ?? [])
  const relatedByCategory = (slug: string, categorySlug: string | null, limit = 3) =>
    posts.value.filter((p) => p.slug !== slug && categorySlug && p.categorySlug === categorySlug).slice(0, limit)
  return { posts, categories, relatedByCategory }
}

export function formatPostDate(ms?: number | null): string {
  if (!ms) return ''
  const d = new Date(ms + 7 * 3600 * 1000)
  return `${d.getUTCDate()}/${d.getUTCMonth() + 1}/${d.getUTCFullYear()}`
}
