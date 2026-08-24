type LdNode = Record<string, any> | Record<string, any>[]

/**
 * Nhúng một khối JSON-LD (schema.org) vào <head>. Nhận object/array tĩnh HOẶC
 * getter (cho dữ liệu async/reactive — evaluate lúc render nên SSR đã có data).
 * `key` tránh trùng khi nhiều khối. Escape `<` để không phá thẻ script.
 */
export function useJsonLd(node: LdNode | (() => LdNode), key: string) {
  const build = () => {
    const n = typeof node === 'function' ? node() : node
    const graph = Array.isArray(n) ? { '@graph': n } : n
    return JSON.stringify({ '@context': 'https://schema.org', ...graph }).replace(/</g, '\\u003c')
  }
  useHead(() => ({
    script: [{ type: 'application/ld+json', innerHTML: build(), key: `ld-${key}` }],
  }))
}
