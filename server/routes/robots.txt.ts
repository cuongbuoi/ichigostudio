export default defineEventHandler((event) => {
  const site = useRuntimeConfig(event).public.siteUrl
  setHeader(event, 'content-type', 'text/plain; charset=utf-8')
  // Cho phép mọi bot; trỏ tới sitemap để Google/Bing khám phá đủ trang.
  return `User-agent: *
Allow: /

Sitemap: ${site}/sitemap.xml
`
})
