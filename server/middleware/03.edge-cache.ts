import type { H3Event } from 'h3'
import { CACHED_AT_HEADER, edgeCache, edgeCacheKey, isEdgeCacheablePath, isFresh } from '../utils/edge-cache'

// Xem server/utils/edge-cache.ts. Middleware này đọc cache; server/plugins/edge-cache.ts lưu response.
// Mỗi isolate chỉ render lại một trang một lần tại một thời điểm.
const revalidating = new Set<string>()

// Render lại trang ở nền; plugin edge-cache sẽ lưu bản mới.
function revalidate(event: H3Event, key: string): Promise<unknown> {
  const url = new URL(key)
  return useNitroApp().localFetch(url.pathname + url.search, {
    host: url.hostname,
    protocol: 'https:',
    headers: { host: url.host, accept: 'text/html' },
    context: {
      waitUntil: event.context.waitUntil,
      _platform: { ...event.context._platform, edgeCacheRevalidate: true },
    },
  } as RequestInit)
}

export default defineEventHandler(async (event) => {
  const cache = edgeCache()
  const url = getRequestURL(event)
  if (!cache || event.method !== 'GET' || !isEdgeCacheablePath(url.pathname)) return

  const key = edgeCacheKey(url)
  event.context.edgeCacheKey = key
  if (event.context.edgeCacheRevalidate) return

  const hit = await cache.match(key)
  if (!hit) {
    setResponseHeader(event, 'x-edge-cache', 'MISS')
    return
  }

  const fresh = isFresh(hit.headers.get(CACHED_AT_HEADER), Date.now())
  if (!fresh && !revalidating.has(key)) {
    revalidating.add(key)
    event.waitUntil(revalidate(event, key).catch(() => {}).finally(() => revalidating.delete(key)))
  }
  event.context.edgeCacheKey = undefined

  const res = new Response(hit.body, hit)
  res.headers.delete('cache-control')
  res.headers.set('x-edge-cache', fresh ? 'HIT' : 'STALE')
  return res
})
