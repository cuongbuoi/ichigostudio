import { POLICIES } from '../../utils/policies'

interface SitemapUrl {
  loc: string
  lastmod?: string
  image?: string
}

function xmlEscape(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;')
}

function isoDate(ms?: number | null): string | undefined {
  if (!ms) return undefined
  try {
    return new Date(ms).toISOString().slice(0, 10)
  } catch {
    return undefined
  }
}

// Google bỏ qua changefreq/priority nên chỉ khai loc + lastmod (lần sửa thật từ updatedAt).
const STATIC_PAGES = ['/', '/san-pham', '/danh-muc', '/in-3d', '/3d-models', '/blog', '/feedback', '/lien-he', '/chinh-sach', ...POLICIES.map((p) => `/chinh-sach/${p.slug}`)]

export default defineEventHandler(async (event) => {
  const { public: { siteUrl, apiBase } } = useRuntimeConfig(event)

  // API lỗi -> 503 (Google thử lại sau) thay vì sitemap thiếu sản phẩm/bài, tránh bị hiểu là URL đã bỏ.
  let categories: { slug: string }[]
  let products: { slug: string; createdAt?: number; updatedAt?: number; cover?: string | null }[]
  let posts: { slug: string; publishedAt?: number; updatedAt?: number }[]
  try {
    const [c, p, b] = await Promise.all([
      $fetch<{ items: typeof categories }>(`${apiBase}/public/categories`),
      $fetch<{ items: typeof products }>(`${apiBase}/public/products`),
      $fetch<{ items: typeof posts }>(`${apiBase}/public/posts`),
    ])
    categories = c.items ?? []
    products = p.items ?? []
    posts = b.items ?? []
  } catch {
    setResponseStatus(event, 503)
    setHeader(event, 'retry-after', '3600')
    return 'Sitemap tạm thời không khả dụng'
  }

  const urls: SitemapUrl[] = [
    ...STATIC_PAGES.map((loc) => ({ loc })),
    ...categories.map((c) => ({ loc: `/danh-muc/${c.slug}` })),
    // Sản phẩm (đã đăng) kèm ảnh bìa cho image sitemap.
    ...products.map((p) => ({ loc: `/san-pham/${p.slug}`, lastmod: isoDate(p.updatedAt ?? p.createdAt), image: p.cover ?? undefined })),
    ...posts.map((b) => ({ loc: `/blog/${b.slug}`, lastmod: isoDate(b.updatedAt ?? b.publishedAt) })),
  ]

  const body = urls
    .map((u) => {
      const parts = [`    <loc>${siteUrl}${u.loc}</loc>`]
      if (u.lastmod) parts.push(`    <lastmod>${u.lastmod}</lastmod>`)
      if (u.image) parts.push(`    <image:image>\n      <image:loc>${xmlEscape(u.image)}</image:loc>\n    </image:image>`)
      return `  <url>\n${parts.join('\n')}\n  </url>`
    })
    .join('\n')

  setHeader(event, 'content-type', 'application/xml; charset=utf-8')
  setHeader(event, 'cache-control', 'public, max-age=3600')
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n${body}\n</urlset>\n`
})
