import { canonicalPath } from '../utils/edge-cache'

// Một URL cho mỗi trang: /san-pham/ và /San-Pham → 301 về /san-pham (giữ query).
// Bỏ qua asset/file (/_nuxt, /cdn-cgi, có đuôi .xxx) vì tên file có thể có chữ hoa.
export default defineEventHandler((event) => {
  const url = getRequestURL(event)
  const path = url.pathname
  if (path.startsWith('/_') || path.startsWith('/cdn-cgi/') || /\.[a-z0-9]+$/i.test(path)) return
  const next = canonicalPath(path)
  if (next !== path) return sendRedirect(event, next + url.search, 301)
})
