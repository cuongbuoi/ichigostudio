import { CACHED_AT_HEADER, STORE_SECONDS, edgeCache } from '../utils/edge-cache'

// Lưu response 200 của các trang công khai vào Cache API (middleware 03.edge-cache đánh dấu
// event.context.edgeCacheKey). Bỏ x-powered-by trước khi gửi/lưu.
export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('beforeResponse', async (event, response) => {
    removeResponseHeader(event, 'x-powered-by')

    const key = event.context.edgeCacheKey as string | undefined
    const cache = edgeCache()
    if (!key || !cache || getResponseStatus(event) !== 200 || typeof response.body !== 'string') return

    const headers = new Headers()
    for (const [name, value] of Object.entries(getResponseHeaders(event))) {
      if (value === undefined) continue
      headers.set(name, Array.isArray(value) ? value.join(', ') : String(value))
    }
    if (headers.has('set-cookie')) return
    headers.delete('x-edge-cache')
    headers.set('cache-control', `public, max-age=${STORE_SECONDS}`)
    headers.set(CACHED_AT_HEADER, String(Date.now()))

    event.waitUntil(cache.put(key, new Response(response.body, { headers })).catch(() => {}))
  })
})
