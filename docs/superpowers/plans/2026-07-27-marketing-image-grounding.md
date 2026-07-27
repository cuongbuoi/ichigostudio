# Content marketing từ ảnh + Google Search grounding — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cho AI (Gemini) nhìn ảnh sản phẩm thật + dùng Google Search grounding khi sinh content marketing, để bài bám đúng sản phẩm và không bịa facts nhân vật/series.

**Architecture:** Mở rộng feature Phase 4 hiện có. Backend (`ichigo-studio-api`): `generateText` nhận thêm ảnh (`inline_data`) và bật `tools:[google_search]`, trả `{ text, sources }`; route `/marketing/generate` nhận hoặc `productId` (Worker tự đọc ≤4 ảnh từ R2) hoặc `images[]` base64 ad-hoc. Admin (`ichigo-studio-admin`): `MarketingPage.vue` thêm toggle "Sản phẩm đã lưu | Ảnh ad-hoc", dropzone ≤4 ảnh, hiển thị nguồn tham khảo.

**Tech Stack:** Cloudflare Workers + Hono + Drizzle (D1) + R2, Gemini `gemini-2.5-flash` v1beta `generateContent`; Vue 3 + Vite + TanStack vue-query + shadcn-vue; vitest (`cloudflare:test` cho API).

## Global Constraints

- Nhà cung cấp AI: **Gemini** `gemini-2.5-flash`, endpoint `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`, header `x-goog-api-key`. Key qua secret `GEMINI_API_KEY` (KHÔNG vào repo).
- Copy tiếng Việt, **KHÔNG dùng gạch ngang dài (em dash)**.
- **Cap tối đa 4 ảnh/lần** generate (cả product lẫn ad-hoc).
- Nạp ảnh product theo **Phương án A**: client gửi `productId`, Worker đọc ảnh từ R2 binding `BUCKET`.
- Ảnh ad-hoc **không lưu lịch sử**; KHÔNG đổi schema `marketing_content`. Lưu chỉ khi có `productId` (giữ nguyên `POST /`, `GET /`, `DELETE /:id`).
- Gemini REST dùng snake_case cho các key mới: `inline_data`/`mime_type`, `tools: [{ google_search: {} }]`.
- `product_images.url` = `{origin}/media/products/{uuid}-{name}`; R2 key = `pathname` bỏ tiền tố `/media/`.
- Không tự lưu khi generate. Store không đổi.

---

### Task 1: `gemini.ts` — nhận ảnh, bật grounding, trả `{ text, sources }`

**Files:**
- Modify: `ichigo-studio-api/src/lib/gemini.ts`
- Test: `ichigo-studio-api/tests/gemini.test.ts` (create)

**Interfaces:**
- Consumes: `fetch` toàn cục (mock trong test).
- Produces:
  ```ts
  export interface GeminiSource { uri: string; title: string }
  export interface GenerateOptions {
    images?: { mimeType: string; data: string }[]
    useSearch?: boolean
  }
  export async function generateText(
    apiKey: string,
    prompt: string,
    opts?: GenerateOptions,
  ): Promise<{ text: string; sources: GeminiSource[] }>
  export class GeminiError extends Error { status: number }
  ```

- [ ] **Step 1: Viết test thất bại** — tạo `ichigo-studio-api/tests/gemini.test.ts`:

```ts
import { describe, it, expect, afterEach, vi } from 'vitest'
import { generateText, GeminiError } from '../src/lib/gemini'

function okResponse(body: unknown) {
  return new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } })
}

describe('generateText', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('gửi prompt text và trả về text ghép', async () => {
    const fetchMock = vi.fn(async () => okResponse({ candidates: [{ content: { parts: [{ text: 'xin ' }, { text: 'chào' }] } }] }))
    vi.stubGlobal('fetch', fetchMock)
    const { text, sources } = await generateText('k', 'PROMPT')
    expect(text).toBe('xin chào')
    expect(sources).toEqual([])
    const body = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string)
    expect(body.contents[0].parts[0].text).toBe('PROMPT')
    expect(body.tools).toBeUndefined()
  })

  it('ghép ảnh thành inline_data và bật google_search', async () => {
    const fetchMock = vi.fn(async () => okResponse({ candidates: [{ content: { parts: [{ text: 'ok' }] } }] }))
    vi.stubGlobal('fetch', fetchMock)
    await generateText('k', 'P', { images: [{ mimeType: 'image/webp', data: 'BASE64' }], useSearch: true })
    const body = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string)
    const parts = body.contents[0].parts
    expect(parts[0].text).toBe('P')
    expect(parts[1].inline_data).toEqual({ mime_type: 'image/webp', data: 'BASE64' })
    expect(body.tools).toEqual([{ google_search: {} }])
  })

  it('trích sources từ groundingMetadata, loại trùng, tối đa 5', async () => {
    const chunk = (uri: string, title: string) => ({ web: { uri, title } })
    const fetchMock = vi.fn(async () => okResponse({
      candidates: [{
        content: { parts: [{ text: 'ok' }] },
        groundingMetadata: { groundingChunks: [chunk('https://a', 'A'), chunk('https://a', 'A dup'), chunk('https://b', 'B')] },
      }],
    }))
    vi.stubGlobal('fetch', fetchMock)
    const { sources } = await generateText('k', 'P', { useSearch: true })
    expect(sources).toEqual([{ uri: 'https://a', title: 'A' }, { uri: 'https://b', title: 'B' }])
  })

  it('ném GeminiError khi HTTP lỗi', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('quota', { status: 429 })))
    await expect(generateText('k', 'P')).rejects.toBeInstanceOf(GeminiError)
  })

  it('ném GeminiError khi response rỗng', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => okResponse({ candidates: [{ content: { parts: [{ text: '' }] } }] })))
    await expect(generateText('k', 'P')).rejects.toBeInstanceOf(GeminiError)
  })
})
```

- [ ] **Step 2: Chạy test, xác nhận fail**

Run: `cd ichigo-studio-api && yarn vitest run tests/gemini.test.ts`
Expected: FAIL (các test ảnh/sources/return-shape fail vì `generateText` hiện trả `string`, chưa có options).

- [ ] **Step 3: Viết implementation** — thay toàn bộ nội dung `src/lib/gemini.ts`:

```ts
// Gọi Gemini generateContent (REST v1beta). Tách riêng để test dễ (mock fetch).

const MODEL = 'gemini-2.5-flash'
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`

export class GeminiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

export interface GeminiSource {
  uri: string
  title: string
}

export interface GenerateOptions {
  // Ảnh ngữ liệu (base64, KHÔNG kèm data URI prefix). Tối đa cap ở tầng schema.
  images?: { mimeType: string; data: string }[]
  // Bật Google Search grounding để xác minh facts nhân vật/series.
  useSearch?: boolean
}

interface GroundingChunk {
  web?: { uri?: string; title?: string }
}
interface GeminiResponse {
  candidates?: {
    content?: { parts?: { text?: string }[] }
    groundingMetadata?: { groundingChunks?: GroundingChunk[] }
  }[]
}

// Rút nguồn tham khảo từ grounding, loại URL trùng, tối đa 5.
function extractSources(cand: GeminiResponse['candidates'] extends (infer C)[] ? C : never): GeminiSource[] {
  const chunks = cand?.groundingMetadata?.groundingChunks ?? []
  const seen = new Set<string>()
  const out: GeminiSource[] = []
  for (const ch of chunks) {
    const uri = ch.web?.uri
    if (!uri || seen.has(uri)) continue
    seen.add(uri)
    out.push({ uri, title: ch.web?.title ?? uri })
    if (out.length >= 5) break
  }
  return out
}

/**
 * Gửi prompt (kèm ảnh + tùy chọn grounding) tới Gemini, trả text + nguồn.
 * Cho model suy nghĩ chút (thinkingBudget nhỏ) để bám bộ quy tắc chống văn-mẫu.
 * Ném GeminiError khi lỗi.
 */
export async function generateText(
  apiKey: string,
  prompt: string,
  opts: GenerateOptions = {},
): Promise<{ text: string; sources: GeminiSource[] }> {
  const parts: unknown[] = [{ text: prompt }]
  for (const img of opts.images ?? []) {
    parts.push({ inline_data: { mime_type: img.mimeType, data: img.data } })
  }

  const body: Record<string, unknown> = {
    contents: [{ parts }],
    generationConfig: {
      temperature: 1.15,
      topP: 0.95,
      maxOutputTokens: 4096,
      thinkingConfig: { thinkingBudget: 1024 },
    },
  }
  if (opts.useSearch) body.tools = [{ google_search: {} }]

  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'x-goog-api-key': apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const errBody = await res.text().catch(() => '')
    throw new GeminiError(`gemini_http_${res.status}: ${errBody.slice(0, 200)}`, res.status)
  }

  const data = (await res.json()) as GeminiResponse
  const cand = data.candidates?.[0]
  const text = cand?.content?.parts?.map((p) => p.text ?? '').join('') ?? ''
  if (!text.trim()) throw new GeminiError('gemini_empty_response', 502)
  return { text: text.trim(), sources: extractSources(cand) }
}
```

- [ ] **Step 4: Chạy test, xác nhận pass**

Run: `cd ichigo-studio-api && yarn vitest run tests/gemini.test.ts`
Expected: PASS (5 test).

- [ ] **Step 5: Commit**

```bash
cd ichigo-studio-api
git add src/lib/gemini.ts tests/gemini.test.ts
git commit -m "feat(api): gemini nhận ảnh inline + google_search grounding, trả sources"
```

---

### Task 2: `marketing-prompts.ts` — product optional + khối VISION/GROUNDING

**Files:**
- Modify: `ichigo-studio-api/src/lib/marketing-prompts.ts`
- Test: `ichigo-studio-api/tests/marketing-prompts.test.ts` (create)

**Interfaces:**
- Consumes: `MarketingFormat`, `Product` từ `../db/schema`.
- Produces:
  ```ts
  export type PromptProduct = Pick<Product, 'title' | 'series' | 'material' | 'price' | 'bodyMd'>
  export function buildPrompt(
    format: MarketingFormat,
    product: PromptProduct | null,   // null = ad-hoc (chỉ ảnh + note)
    note?: string,
  ): string
  ```

- [ ] **Step 1: Viết test thất bại** — tạo `ichigo-studio-api/tests/marketing-prompts.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { buildPrompt } from '../src/lib/marketing-prompts'

const product = { title: 'Set dây Zeztz', series: 'Kamen Rider Gavv', material: 'TPU + PLA', price: 360000, bodyMd: null }

describe('buildPrompt', () => {
  it('có product: chèn tên + note + khối VISION/GROUNDING + cấm em dash', () => {
    const p = buildPrompt('facebook', product, 'sale 10%')
    expect(p).toContain('Set dây Zeztz')
    expect(p).toContain('sale 10%')
    expect(p).toContain('THẤY RÕ trong ảnh')       // VISION
    expect(p).toContain('kết quả tìm kiếm')          // GROUNDING
    expect(p).toContain('không bịa')                 // ràng buộc chống bịa (case-insensitive check dưới)
    expect(p.toLowerCase()).toContain('gạch ngang')  // nhắc cấm em dash
    expect(p).not.toContain('—')                // bản thân prompt không chứa em dash
  })

  it('ad-hoc (product null): không chèn block field, vẫn có VISION/GROUNDING', () => {
    const p = buildPrompt('tiktok', null, 'hàng mới')
    expect(p).toContain('hàng mới')
    expect(p).toContain('THẤY RÕ trong ảnh')
    expect(p).not.toContain('- Tên:')                // không có productBlock
  })
})
```

- [ ] **Step 2: Chạy test, xác nhận fail**

Run: `cd ichigo-studio-api && yarn vitest run tests/marketing-prompts.test.ts`
Expected: FAIL (`buildPrompt` chưa nhận `null`, chưa có khối VISION/GROUNDING).

- [ ] **Step 3: Viết implementation** — sửa `src/lib/marketing-prompts.ts`. Thêm 2 hằng khối mới ngay trước `FORMAT_INSTRUCTION`:

```ts
// Chống bịa nguồn 1: những gì AI THẤY trong ảnh.
const VISION = `Có kèm ảnh sản phẩm thật ở cuối. Khi tả ngoại hình, CHỈ mô tả những gì THẤY RÕ trong ảnh (bộ phận, màu sắc, chi tiết in, cách lắp vào đồ chơi). KHÔNG suy đoán chi tiết không nhìn thấy. Nếu ảnh và ghi chú mâu thuẫn, viết chung chung thay vì đoán bừa.`

// Chống bịa nguồn 2: facts nhân vật/series (dễ sai nhất).
const GROUNDING = `Dùng kết quả tìm kiếm để XÁC MINH tên nhân vật, series, tên thiết bị/driver trước khi viết. Nếu tra không ra hoặc không chắc chắn, viết chung chung (ví dụ "nhân vật Kamen Rider" thay vì gán sai tên cụ thể). TUYỆT ĐỐI không bịa tên nhân vật, năm ra mắt, hay cốt truyện.`
```

Sửa chữ ký + thân `buildPrompt` (giữ nguyên `PERSONA`, `ANTI_SLOP`, `HUMAN_STYLE`, `SEO`, `FORMAT_INSTRUCTION`, `productBlock`, `priceLine`):

```ts
export function buildPrompt(format: MarketingFormat, product: PromptProduct | null, note?: string): string {
  const noteBlock = note?.trim() ? `\nGhi chú thêm từ chủ shop (ưu tiên bám theo): ${note.trim()}` : ''
  const productSection = product
    ? `Thông tin sản phẩm (chỉ dùng dữ liệu có thật dưới đây, không bịa thêm thông số):\n${productBlock(product)}`
    : `Chưa có thông tin field sản phẩm. Chỉ dựa vào ẢNH và ghi chú của chủ shop bên dưới, tuyệt đối không bịa thông số không có căn cứ.`

  return `${PERSONA}

${ANTI_SLOP}

${HUMAN_STYLE}

${SEO}

${VISION}

${GROUNDING}

${productSection}
${noteBlock}

Nhiệm vụ: ${FORMAT_INSTRUCTION[format]}

Chỉ trả về nội dung bài, không thêm lời dẫn, không giải thích, không ghi "Đây là bài viết".`
}
```

Lưu ý: `ANTI_SLOP` đã chứa cụm "dấu gạch ngang dài (em dash)" và "không bịa" xuất hiện trong `productSection`/`GROUNDING` — thỏa các assert. Đảm bảo không gõ ký tự `—` nào trong file.

- [ ] **Step 4: Chạy test, xác nhận pass**

Run: `cd ichigo-studio-api && yarn vitest run tests/marketing-prompts.test.ts`
Expected: PASS (2 test).

- [ ] **Step 5: Commit**

```bash
cd ichigo-studio-api
git add src/lib/marketing-prompts.ts tests/marketing-prompts.test.ts
git commit -m "feat(api): prompt marketing cho ảnh (VISION) + grounding, product optional"
```

---

### Task 3: `schemas/marketing.ts` + `routes/marketing.ts` — nhận ảnh product (R2) & ad-hoc

**Files:**
- Modify: `ichigo-studio-api/src/schemas/marketing.ts`
- Modify: `ichigo-studio-api/src/routes/marketing.ts`
- Test: `ichigo-studio-api/tests/marketing.test.ts` (bổ sung; cập nhật test cũ đọc `.text`)

**Interfaces:**
- Consumes: `generateText(apiKey, prompt, { images, useSearch })` (Task 1); `buildPrompt(format, product|null, note)` (Task 2).
- Produces: `POST /marketing/generate` body `{ format, note?, productId?, images?: {mimeType,data}[] }` (refine: cần `productId` hoặc ≥1 `images`, `images` ≤4). Trả `{ content, sources }`.

- [ ] **Step 1: Viết test thất bại** — sửa `tests/marketing.test.ts`.

Cập nhật test cũ `'generate -> calls Gemini and returns content'`: response mock giữ nguyên (đọc `content` không đổi). Thêm import `productImages` vào dòng import schema:

```ts
import { users, products, productImages, marketingContent } from '../src/db/schema'
```

Thêm các test mới trong `describe('marketing', ...)`:

```ts
it('generate với productId: đọc ảnh R2 -> inline_data + bật google_search', async () => {
  // Seed 1 ảnh vào R2 + product_images.
  const key = 'products/img-1.webp'
  await env.BUCKET.put(key, new Uint8Array([1, 2, 3]), { httpMetadata: { contentType: 'image/webp' } })
  await getDb(env.DB).insert(productImages).values({ id: 'pi-1', productId: PID, url: `http://x/media/${key}`, sort: 0 })

  const fetchMock = vi.fn(async () =>
    new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: 'BÀI' }] }, groundingMetadata: { groundingChunks: [{ web: { uri: 'https://kr.fandom.com', title: 'Gavv' } }] } }] }), { status: 200, headers: { 'content-type': 'application/json' } }),
  )
  vi.stubGlobal('fetch', fetchMock)

  const res = await app.request('/marketing/generate', authed(t, { method: 'POST', body: JSON.stringify({ productId: PID, format: 'facebook' }) }), { ...env, GEMINI_API_KEY: 'k' })
  expect(res.status).toBe(200)
  const json = await res.json<{ content: string; sources: { uri: string }[] }>()
  expect(json.content).toBe('BÀI')
  expect(json.sources).toEqual([{ uri: 'https://kr.fandom.com', title: 'Gavv' }])

  const body = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string)
  const parts = body.contents[0].parts
  expect(parts.some((p: { inline_data?: unknown }) => p.inline_data)).toBe(true)
  expect(body.tools).toEqual([{ google_search: {} }])
})

it('generate ad-hoc với images[]: forward, không cần product', async () => {
  const fetchMock = vi.fn(async () =>
    new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: 'ADHOC' }] } }] }), { status: 200, headers: { 'content-type': 'application/json' } }),
  )
  vi.stubGlobal('fetch', fetchMock)
  const res = await app.request('/marketing/generate', authed(t, { method: 'POST', body: JSON.stringify({ format: 'tiktok', images: [{ mimeType: 'image/webp', data: 'QUJD' }] }) }), { ...env, GEMINI_API_KEY: 'k' })
  expect(res.status).toBe(200)
  expect((await res.json<{ content: string }>()).content).toBe('ADHOC')
  const body = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string)
  expect(body.contents[0].parts[1].inline_data).toEqual({ mime_type: 'image/webp', data: 'QUJD' })
})

it('generate -> 400 khi thiếu cả productId lẫn images', async () => {
  const res = await app.request('/marketing/generate', authed(t, { method: 'POST', body: JSON.stringify({ format: 'facebook' }) }), { ...env, GEMINI_API_KEY: 'k' })
  expect(res.status).toBe(400)
})

it('generate -> 400 khi quá 4 ảnh', async () => {
  const imgs = Array.from({ length: 5 }, () => ({ mimeType: 'image/webp', data: 'QUJD' }))
  const res = await app.request('/marketing/generate', authed(t, { method: 'POST', body: JSON.stringify({ format: 'facebook', images: imgs }) }), { ...env, GEMINI_API_KEY: 'k' })
  expect(res.status).toBe(400)
})
```

- [ ] **Step 2: Chạy test, xác nhận fail**

Run: `cd ichigo-studio-api && yarn vitest run tests/marketing.test.ts`
Expected: FAIL (schema chưa cho ad-hoc/refine; route chưa đọc R2/sources; test cũ có thể vẫn pass).

- [ ] **Step 3a: Viết schema** — thay `generateInputSchema` trong `src/schemas/marketing.ts` (giữ `marketingFormats`, `saveInputSchema`, các `type`):

```ts
const imageSchema = z.object({
  mimeType: z.string().regex(/^image\//, 'invalid_image_mime'),
  data: z.string().min(1), // base64, không kèm data URI prefix
})

export const generateInputSchema = z
  .object({
    format: z.enum(marketingFormats),
    note: z.string().max(500).optional(),
    productId: z.string().min(1).optional(),
    images: z.array(imageSchema).max(4).optional(),
  })
  .refine((v) => !!v.productId || (v.images?.length ?? 0) > 0, {
    message: 'need_product_or_images',
  })
```

- [ ] **Step 3b: Viết route** — thay handler `POST /generate` trong `src/routes/marketing.ts`. Cập nhật import + thêm helper đọc R2:

```ts
import { productImages, products, marketingContent } from '../db/schema'
import type { GeminiSource } from '../lib/gemini'
```

(Bảo đảm dòng import schema có `productImages`.)

Thêm helper (đặt trên `marketingRoutes.post('/generate' ...)`):

```ts
// Đọc tối đa `max` ảnh của sản phẩm từ R2 -> base64 cho Gemini. Ảnh lỗi/thiếu
// thì bỏ qua (không làm hỏng cả request).
async function loadProductImages(
  bucket: R2Bucket,
  urls: string[],
  max: number,
): Promise<{ mimeType: string; data: string }[]> {
  const out: { mimeType: string; data: string }[] = []
  for (const url of urls.slice(0, max)) {
    let key: string
    try {
      key = new URL(url).pathname.replace(/^\/media\//, '')
    } catch {
      continue
    }
    const obj = await bucket.get(key)
    if (!obj) continue
    const buf = await obj.arrayBuffer()
    out.push({
      mimeType: obj.httpMetadata?.contentType ?? 'image/webp',
      data: bufferToBase64(buf),
    })
  }
  return out
}

// btoa nhận binary string; chuyển bytes -> binary string theo khối để tránh
// tràn stack với ảnh lớn.
function bufferToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf)
  let binary = ''
  const CHUNK = 0x8000
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK))
  }
  return btoa(binary)
}
```

Thay handler:

```ts
marketingRoutes.post('/generate', zValidator('json', generateInputSchema), async (c) => {
  const apiKey = c.env.GEMINI_API_KEY
  if (!apiKey) return c.json({ error: 'ai_not_configured' }, 503)

  const { productId, format, note, images: adhoc } = c.req.valid('json')
  const db = getDb(c.env.DB)

  let product = null
  let images = adhoc ?? []
  if (productId) {
    const rows = await db.select().from(products).where(eq(products.id, productId)).limit(1)
    if (!rows[0]) return c.json({ error: 'product_not_found' }, 404)
    product = rows[0]
    const imgRows = await db
      .select()
      .from(productImages)
      .where(eq(productImages.productId, productId))
      .orderBy(productImages.sort)
    images = await loadProductImages(c.env.BUCKET, imgRows.map((r) => r.url), 4)
  }

  const prompt = buildPrompt(format, product, note)
  try {
    const { text, sources } = await generateText(apiKey, prompt, { images, useSearch: true })
    return c.json({ content: text, sources })
  } catch (err) {
    if (err instanceof GeminiError) return c.json({ error: 'ai_error', detail: err.message }, 502)
    throw err
  }
})
```

(Kiểm tra import `productImages` đã có ở đầu file; `asc`/`orderBy` dùng cột trực tiếp — Drizzle mặc định asc.)

- [ ] **Step 4: Chạy toàn bộ test API, xác nhận pass**

Run: `cd ichigo-studio-api && yarn vitest run`
Expected: PASS toàn bộ (bộ marketing cũ + 4 test mới + gemini + prompts). Nếu test cũ `'generate -> calls Gemini and returns content'` fail vì response mock thiếu field, giữ nguyên (nó vẫn đọc `content`); không cần sửa.

- [ ] **Step 5: Commit**

```bash
cd ichigo-studio-api
git add src/schemas/marketing.ts src/routes/marketing.ts tests/marketing.test.ts
git commit -m "feat(api): /marketing/generate nhận ảnh product (R2) + ad-hoc, trả sources"
```

---

### Task 4: Admin `lib/marketing.ts` — chữ ký mới + `fileToBase64`

**Files:**
- Modify: `ichigo-studio-admin/src/lib/marketing.ts`

**Interfaces:**
- Consumes: `api` từ `@/lib/api`.
- Produces:
  ```ts
  export interface MarketingSource { uri: string; title: string }
  export interface GenerateImage { mimeType: string; data: string }
  export function fileToBase64(file: File): Promise<GenerateImage>
  export function generateContent(input: {
    format: MarketingFormat; note?: string; productId?: string; images?: GenerateImage[]
  }): Promise<{ content: string; sources: MarketingSource[] }>
  ```

- [ ] **Step 1: Sửa `src/lib/marketing.ts`** — thêm types + `fileToBase64`, đổi `generateContent` (giữ `MarketingItem`, `FORMAT_LABELS`, `saveContent`, `listContent`, `deleteContent`):

```ts
export interface MarketingSource {
  uri: string
  title: string
}

export interface GenerateImage {
  mimeType: string
  data: string // base64, không kèm data URI prefix
}

// Đọc File (đã nén WebP) -> base64 thuần, tách phần sau dấu phẩy của data URI.
export function fileToBase64(file: File): Promise<GenerateImage> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = String(reader.result)
      const data = result.slice(result.indexOf(',') + 1)
      resolve({ mimeType: file.type || 'image/webp', data })
    }
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

export function generateContent(input: {
  format: MarketingFormat
  note?: string
  productId?: string
  images?: GenerateImage[]
}) {
  return api<{ content: string; sources: MarketingSource[] }>('/marketing/generate', {
    method: 'POST',
    body: input,
  })
}
```

- [ ] **Step 2: Kiểm tra type-check** (không có unit test cho lib này theo quy ước)

Run: `cd ichigo-studio-admin && yarn vue-tsc --noEmit`
Expected: PASS ở `lib/marketing.ts` (có thể còn lỗi ở `MarketingPage.vue` vì chưa cập nhật — Task 5 xử lý; nếu muốn xanh hoàn toàn thì làm Task 5 trước khi type-check tổng).

- [ ] **Step 3: Commit**

```bash
cd ichigo-studio-admin
git add src/lib/marketing.ts
git commit -m "feat(admin): marketing lib nhận ảnh (fileToBase64) + trả sources"
```

---

### Task 5: Admin `MarketingPage.vue` — toggle nguồn, dropzone ≤4 ảnh, hiển thị nguồn

**Files:**
- Modify: `ichigo-studio-admin/src/pages/MarketingPage.vue`

**Interfaces:**
- Consumes: `generateContent`, `fileToBase64`, `MarketingSource`, `GenerateImage` (Task 4); `compressImage` từ `@/lib/image`.

- [ ] **Step 1: Sửa `<script setup>`** — thêm import + state + logic. Bổ sung vào khối import từ `@/lib/marketing`:

```ts
import {
  generateContent,
  saveContent,
  listContent,
  deleteContent,
  fileToBase64,
  FORMAT_LABELS,
  type MarketingFormat,
  type MarketingItem,
  type MarketingSource,
  type GenerateImage,
} from '@/lib/marketing'
import { compressImage } from '@/lib/image'
import { ImagePlus, X } from '@lucide/vue'
```

Thêm state (cạnh các `ref` hiện có) + đổi logic generate:

```ts
type SourceMode = 'product' | 'adhoc'
const sourceMode = ref<SourceMode>('product')
const adhocFiles = ref<{ file: File; preview: string }[]>([])
const sources = ref<MarketingSource[]>([])

const MAX_IMAGES = 4

async function onPickFiles(e: Event) {
  const input = e.target as HTMLInputElement
  const picked = Array.from(input.files ?? [])
  for (const f of picked) {
    if (adhocFiles.value.length >= MAX_IMAGES) break
    const compressed = await compressImage(f, { maxEdge: 1600, quality: 0.8 })
    adhocFiles.value.push({ file: compressed, preview: URL.createObjectURL(compressed) })
  }
  input.value = '' // cho phép chọn lại cùng file
}

function removeAdhoc(i: number) {
  URL.revokeObjectURL(adhocFiles.value[i].preview)
  adhocFiles.value.splice(i, 1)
}

// Reset kết quả khi đổi chế độ.
watch(sourceMode, () => {
  result.value = ''
  errorMsg.value = ''
  sources.value = []
})

const canGenerate = computed(() =>
  sourceMode.value === 'product' ? !!productId.value : adhocFiles.value.length > 0,
)
const canSave = computed(() => sourceMode.value === 'product' && !!productId.value && !!result.value)
```

Thay thân hàm `onGenerate` hiện có (dòng ~62 trong file) bằng:

```ts
async function onGenerate() {
  generating.value = true
  errorMsg.value = ''
  sources.value = []
  try {
    let images: GenerateImage[] | undefined
    if (sourceMode.value === 'adhoc') {
      images = await Promise.all(adhocFiles.value.map((a) => fileToBase64(a.file)))
    }
    const res = await generateContent({
      format: format.value,
      note: note.value || undefined,
      productId: sourceMode.value === 'product' ? productId.value : undefined,
      images,
    })
    result.value = res.content
    sources.value = res.sources ?? []
  } catch (e) {
    errorMsg.value = friendlyError(e)
  } finally {
    generating.value = false
  }
}
```

Lưu ý: khớp tên hàm/nút với file thực tế (nút "Sinh nội dung" gọi hàm generate hiện tại) — chỉ thay thân, giữ tên. Kiểm tra `compressImage` options đúng key (`maxSize`, `quality`) theo `src/lib/image.ts`; nếu tên khác thì chỉnh cho khớp.

- [ ] **Step 2: Sửa `<template>`** — thêm toggle chế độ + dropzone + hiển thị nguồn. Ngay trên phần chọn sản phẩm, thêm nút chuyển chế độ:

```vue
<div class="flex gap-2 mb-4">
  <Button :variant="sourceMode === 'product' ? 'default' : 'outline'" size="sm" @click="sourceMode = 'product'">
    Sản phẩm đã lưu
  </Button>
  <Button :variant="sourceMode === 'adhoc' ? 'default' : 'outline'" size="sm" @click="sourceMode = 'adhoc'">
    Ảnh ad-hoc
  </Button>
</div>
```

Bọc Select sản phẩm hiện có bằng `v-if="sourceMode === 'product'"`. Thêm khối ad-hoc `v-else`:

```vue
<div v-else class="space-y-2">
  <Label>Ảnh sản phẩm (tối đa 4)</Label>
  <div class="grid grid-cols-4 gap-2">
    <div v-for="(a, i) in adhocFiles" :key="i" class="relative aspect-square rounded border overflow-hidden">
      <img :src="a.preview" class="w-full h-full object-cover" alt="" />
      <button type="button" class="absolute top-1 right-1 rounded-full bg-black/60 p-0.5" @click="removeAdhoc(i)">
        <X class="w-4 h-4 text-white" />
      </button>
    </div>
    <label
      v-if="adhocFiles.length < MAX_IMAGES"
      class="aspect-square rounded border border-dashed flex items-center justify-center cursor-pointer text-muted-foreground hover:bg-muted"
    >
      <ImagePlus class="w-6 h-6" />
      <input type="file" accept="image/*" multiple class="hidden" @change="onPickFiles" />
    </label>
  </div>
</div>
```

Đổi nút generate (dòng ~163) từ `:disabled="!productId || generating"` thành `:disabled="!canGenerate || generating"`. Nút **Lưu** (dòng ~185) từ `:disabled="saving"` thành `:disabled="saving || !canSave"`. Thêm khối nguồn dưới textarea kết quả:

```vue
<div v-if="sources.length" class="mt-3 text-sm">
  <p class="font-medium mb-1">Nguồn tham khảo</p>
  <ul class="space-y-1">
    <li v-for="s in sources" :key="s.uri">
      <a :href="s.uri" target="_blank" rel="noopener" class="text-hopper underline break-all">{{ s.title }}</a>
    </li>
  </ul>
</div>
```

- [ ] **Step 3: Type-check + build**

Run: `cd ichigo-studio-admin && yarn vue-tsc --noEmit && yarn build`
Expected: PASS (không lỗi type, build xanh).

- [ ] **Step 4: Kiểm thử thủ công nhanh** (nếu chạy được local với key paid)

Chạy API (`yarn dev`, port 8787) + admin (`VITE_API_URL=http://localhost:8787 yarn dev`). Vào `/marketing`:
1. Chế độ "Sản phẩm đã lưu": chọn 1 sản phẩm có ảnh, format Facebook, Sinh nội dung -> có bài + (có thể) nguồn tham khảo; nút Lưu hoạt động.
2. Chế độ "Ảnh ad-hoc": kéo 1-2 ảnh, Sinh nội dung -> có bài; nút Lưu ẩn.
Expected: cả hai ra nội dung bám ảnh; ad-hoc không lưu lịch sử.

- [ ] **Step 5: Commit**

```bash
cd ichigo-studio-admin
git add src/pages/MarketingPage.vue
git commit -m "feat(admin): marketing sinh nội dung từ ảnh (product/ad-hoc) + nguồn tham khảo"
```

---

## Ghi chú vận hành (không phải task code)

- **Grounding cần tier trả phí**: đảm bảo `GEMINI_API_KEY` đang dùng ở tier `standard`/paid (free-tier bị khóa theo memory dự án). Nếu 429/403 khi test, kiểm tra tier trước khi nghi code.
- Không đổi secret/biến môi trường mới; không migration DB.
- Redeploy khi xong: `cd ichigo-studio-api && wrangler deploy`; admin `VITE_API_URL=<prodapi> yarn build && wrangler deploy`.

## Self-Review

- **Spec coverage**: Vision grounding (Task 1+2), Google Search grounding (Task 1+2+3), input product & ad-hoc (Task 3), Phương án A đọc R2 (Task 3), cap 4 (Task 3 schema + Task 5 UI), ad-hoc không lưu (Task 3 route không lưu + Task 5 ẩn nút Lưu), sources hiển thị (Task 1→3→5), prompt chống bịa (Task 2), test mở rộng (Task 1/2/3). Đủ.
- **Placeholder scan**: không có TODO/TBD; mọi step code đều có code thật.
- **Type consistency**: `generateText` trả `{text, sources}` dùng nhất quán ở route (`.text`); `generateContent` admin trả `{content, sources}`; `GenerateImage {mimeType,data}` khớp giữa admin lib và payload; route map `imgRows.map(r => r.url)` -> `loadProductImages`. `MarketingSource`/`GeminiSource` cùng shape `{uri,title}`.
