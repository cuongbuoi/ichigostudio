// http → https (301) + HSTS. Chỉ dựa vào header Cloudflare gắn ở edge
// (x-forwarded-proto / cf-visitor), nên `yarn dev` trên localhost không bị redirect.
// Asset tĩnh do Workers Assets phục vụ trực tiếp không đi qua đây; nên bật thêm
// "Always Use HTTPS" trên dashboard Cloudflare để phủ cả asset.
export default defineEventHandler((event) => {
  const proto = getRequestHeader(event, 'x-forwarded-proto')
  const visitor = getRequestHeader(event, 'cf-visitor') ?? ''
  const isHttp = proto === 'http' || visitor.includes('"scheme":"http"')

  if (isHttp) {
    const host = getRequestHeader(event, 'host')
    if (host) return sendRedirect(event, `https://${host}${event.path}`, 301)
  }

  setResponseHeaders(event, {
    'Strict-Transport-Security': 'max-age=31536000',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'X-Frame-Options': 'SAMEORIGIN',
  })
})
