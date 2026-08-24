interface SitemapUrl {
  loc: string
  lastmod?: string
  changefreq?: string
  priority?: string
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

export default defineEventHandler(async (event) => {
  const { public: { siteUrl, apiBase } } = useRuntimeConfig(event)

  const urls: SitemapUrl[] = [
    { loc: '/', changefreq: 'weekly', priority: '1.0' },
    { loc: '/san-pham', changefreq: 'daily', priority: '0.9' },
    { loc: '/blog', changefreq: 'weekly', priority: '0.7' },
    { loc: '/feedback', changefreq: 'weekly', priority: '0.6' },
    { loc: '/lien-he', changefreq: 'monthly', priority: '0.5' },
  ]

  // Sản phẩm (đã đăng) — kèm ảnh bìa cho image sitemap.
  try {
    const res = await $fetch<{ items: { slug: string; createdAt?: number; cover?: string | null }[] }>(`${apiBase}/public/products`)
    for (const p of res.items ?? []) {
      urls.push({ loc: `/san-pham/${p.slug}`, lastmod: isoDate(p.createdAt), changefreq: 'weekly', priority: '0.8', image: p.cover ?? undefined })
    }
  } catch { /* API lỗi -> vẫn xuất sitemap trang tĩnh */ }

  // Bài blog (đã đăng)
  try {
    const res = await $fetch<{ items: { slug: string; publishedAt?: number }[] }>(`${apiBase}/public/posts`)
    for (const b of res.items ?? []) {
      urls.push({ loc: `/blog/${b.slug}`, lastmod: isoDate(b.publishedAt), changefreq: 'monthly', priority: '0.6' })
    }
  } catch { /* bỏ qua */ }

  const body = urls
    .map((u) => {
      const parts = [`    <loc>${siteUrl}${u.loc}</loc>`]
      if (u.lastmod) parts.push(`    <lastmod>${u.lastmod}</lastmod>`)
      if (u.changefreq) parts.push(`    <changefreq>${u.changefreq}</changefreq>`)
      if (u.priority) parts.push(`    <priority>${u.priority}</priority>`)
      if (u.image) parts.push(`    <image:image>\n      <image:loc>${xmlEscape(u.image)}</image:loc>\n    </image:image>`)
      return `  <url>\n${parts.join('\n')}\n  </url>`
    })
    .join('\n')

  setHeader(event, 'content-type', 'application/xml; charset=utf-8')
  setHeader(event, 'cache-control', 'public, max-age=3600')
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n${body}\n</urlset>\n`
})
