/**
 * Cache HTML ở edge bằng Cache API của Cloudflare (caches.default).
 *
 * Worker chạy TRƯỚC CDN cache nên response SSR không tự được cache; ta tự lưu
 * vào Cache API (miễn phí, theo từng data center). Kiểu stale-while-revalidate:
 * bản lưu còn mới trong FRESH_MS thì trả thẳng; cũ hơn thì vẫn trả bản cũ ngay
 * và render lại ở nền (waitUntil). Sửa sản phẩm/bài trong admin hiện ra trên
 * store sau khoảng 1 phút (lượt xem đầu sau 1 phút vẫn thấy bản cũ).
 */

export const FRESH_MS = 60_000
/** Thời gian Cache API giữ bản lưu (bản cũ vẫn được trả trong lúc render lại). */
export const STORE_SECONDS = 86_400
export const CACHED_AT_HEADER = 'x-edge-cached-at'

// Chỉ trang công khai, giống nhau với mọi người xem. Giỏ hàng, thanh toán, tra
// cứu đơn, trang đặt thử đều KHÔNG cache.
const CACHEABLE_RE = [
  /^\/$/,
  /^\/(san-pham|danh-muc|blog)(\/[^/]+)?$/,
  /^\/(feedback|in-3d|3d-models|gioi-thieu|lien-he)$/,
  /^\/(sitemap\.xml|llms\.txt|robots\.txt)$/,
]

const TRACKING_PARAM_RE = /^(utm_\w+|fbclid|gclid|gbraid|wbraid|ttclid|msclkid)$/

/** caches.default chỉ có trên Workers; `nuxt dev` (Node) trả undefined = không cache. */
export function edgeCache(): Cache | undefined {
  return (globalThis as { caches?: { default?: Cache } }).caches?.default
}

export function isEdgeCacheablePath(path: string): boolean {
  return CACHEABLE_RE.some((re) => re.test(path))
}

/**
 * Khoá cache: bỏ tham số tracking (không đổi nội dung), sắp xếp phần còn lại. Gắn buildId vì
 * HTML trỏ tới /_nuxt/<hash>.js của đúng bản build; deploy mới thì bản cũ không còn asset đó.
 */
export function edgeCacheKey(url: URL, buildId: string): string {
  const params = [...url.searchParams].filter(([k]) => !TRACKING_PARAM_RE.test(k)).sort(([a], [b]) => a.localeCompare(b))
  const query = new URLSearchParams(params).toString()
  return `${url.origin}/__edge/${buildId}${url.pathname}${query ? `?${query}` : ''}`
}

export function isFresh(cachedAt: string | null, now: number): boolean {
  const t = Number(cachedAt)
  return cachedAt !== null && Number.isFinite(t) && now - t < FRESH_MS
}

// Các mục có slug luôn viết thường; route có id (thanh toán...) có thể có chữ hoa nên không đụng.
const LOWERCASE_SECTION_RE = /^\/(san-pham|danh-muc|blog|feedback|in-3d|3d-models|gioi-thieu|lien-he|gio-hang|don-hang)(\/|$)/i

/** URL chuẩn: bỏ "/" cuối, chữ thường cho các mục nội dung (giữ nguyên mã %XX). */
export function canonicalPath(path: string): string {
  let out = path.length > 1 ? path.replace(/\/+$/, '') || '/' : path
  if (LOWERCASE_SECTION_RE.test(out)) {
    out = out.split(/(%[0-9A-Fa-f]{2})/).map((s, i) => (i % 2 ? s : s.toLowerCase())).join('')
  }
  return out
}
