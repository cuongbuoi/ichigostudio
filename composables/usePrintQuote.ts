// Đặt in theo file STL: đọc cấu hình, ước lượng tức thì (parser STL thuần,
// không cần three.js), upload + poll báo giá.

export interface PrintConfigMaterial { id: string; label: string; pricePerGram: number }
export interface PrintConfigQuality { id: string; label: string }
export interface PrintConfig {
  enabled: boolean
  build: { x: number; y: number; z: number }
  maxFiles: number
  maxFileMb: number
  materials: PrintConfigMaterial[]
  qualities: PrintConfigQuality[]
}

export interface QuoteFile {
  id: string
  fileName: string
  qty: number
  status: 'pending' | 'slicing' | 'done' | 'failed'
  estGrams: number | null
  grams: number | null
  printSeconds: number | null
  plateCount: number | null
  bbox: { x: number; y: number; z: number } | null
  errorMsg: string | null
}

export interface QuoteJob {
  id: string
  status: 'pending' | 'slicing' | 'quoted' | 'failed' | 'expired' | 'ordered'
  materialId: string
  qualityId: string
  grams: number | null
  printSeconds: number | null
  total: number | null
  errorMsg: string | null
  createdAt: number
  files: QuoteFile[]
}

export interface StlEstimate {
  /** Kích thước bao (mm). */
  dims: { x: number; y: number; z: number }
  /** Thể tích đặc (cm³). */
  volumeCm3: number
  /** Khối lượng ước lượng sơ bộ (g) — chỉ tham khảo, giá thật theo slice. */
  estGrams: number
}

// Parser STL thuần (binary + ascii). Trả bbox + thể tích (tổng signed tetra).
export function estimateStl(buf: ArrayBuffer, density = 1.24): StlEstimate | null {
  const bytes = new Uint8Array(buf)
  const tris: number[][] = [] // mỗi tam giác = [x0,y0,z0, x1,y1,z1, x2,y2,z2]

  const asBinary = () => {
    if (bytes.length < 84) return false
    const dv = new DataView(buf)
    const n = dv.getUint32(80, true)
    if (84 + n * 50 !== bytes.length) return false
    let off = 84
    for (let i = 0; i < n; i++) {
      const v: number[] = []
      for (let k = 0; k < 3; k++) {
        const b = off + 12 + k * 12
        v.push(dv.getFloat32(b, true), dv.getFloat32(b + 4, true), dv.getFloat32(b + 8, true))
      }
      tris.push(v)
      off += 50
    }
    return true
  }

  const asAscii = () => {
    const text = new TextDecoder().decode(bytes)
    const nums = text.match(/vertex\s+(\S+)\s+(\S+)\s+(\S+)/g)
    if (!nums) return false
    const verts: number[] = []
    for (const line of nums) {
      const m = line.match(/vertex\s+(\S+)\s+(\S+)\s+(\S+)/)
      if (m) verts.push(+m[1], +m[2], +m[3])
    }
    for (let i = 0; i + 8 < verts.length; i += 9) tris.push(verts.slice(i, i + 9))
    return tris.length > 0
  }

  if (!asBinary()) if (!asAscii()) return null
  if (!tris.length) return null

  let minX = Infinity, minY = Infinity, minZ = Infinity
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity
  let vol6 = 0
  for (const t of tris) {
    const [ax, ay, az, bx, by, bz, cx, cy, cz] = t
    // signed volume of tetra (origin, a, b, c) × 6 = a · (b × c)
    vol6 += ax * (by * cz - bz * cy) - ay * (bx * cz - bz * cx) + az * (bx * cy - by * cx)
    for (const [x, y, z] of [[ax, ay, az], [bx, by, bz], [cx, cy, cz]]) {
      if (x < minX) minX = x; if (x > maxX) maxX = x
      if (y < minY) minY = y; if (y > maxY) maxY = y
      if (z < minZ) minZ = z; if (z > maxZ) maxZ = z
    }
  }
  const volumeMm3 = Math.abs(vol6) / 6
  const volumeCm3 = volumeMm3 / 1000
  // ~35% khối đặc (vách + đáy/nóc + 15% infill) — chỉ sơ bộ.
  const estGrams = volumeCm3 * density * 0.35
  return {
    dims: { x: maxX - minX, y: maxY - minY, z: maxZ - minZ },
    volumeCm3,
    estGrams,
  }
}

export function usePrintConfig() {
  const { public: { apiBase } } = useRuntimeConfig()
  const { data } = useAsyncData('print-config', async () => {
    try {
      return await $fetch<PrintConfig>(`${apiBase}/print-quote/config`)
    } catch {
      return { enabled: false, build: { x: 256, y: 256, z: 261 }, maxFiles: 20, maxFileMb: 60, materials: [], qualities: [] } as PrintConfig
    }
  })
  return data
}

export function createQuote(form: FormData) {
  const { public: { apiBase } } = useRuntimeConfig()
  return $fetch<{ id: string }>(`${apiBase}/print-quote`, { method: 'POST', body: form })
}

export function fetchQuote(id: string) {
  const { public: { apiBase } } = useRuntimeConfig()
  return $fetch<QuoteJob>(`${apiBase}/print-quote/${id}`)
}

export function formatVnd(n: number): string {
  return new Intl.NumberFormat('vi-VN').format(n) + '₫'
}

export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.round((seconds % 3600) / 60)
  return h ? `${h}h${m.toString().padStart(2, '0')}` : `${m} phút`
}
