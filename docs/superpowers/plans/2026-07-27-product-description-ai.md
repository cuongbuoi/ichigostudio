# AI viết mô tả sản phẩm (bodyMd) từ ảnh — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Thêm nút "AI viết mô tả" trong form thêm/sửa sản phẩm, sinh `bodyMd` (markdown) từ ảnh R2 + field đã gõ + ghi chú, có Google Search grounding và không bịa.

**Architecture:** Tái dùng hạ tầng feature `marketing-image-grounding`. API thêm `buildDescriptionPrompt` (dùng lại các hằng brand-voice + VISION/GROUNDING trong `marketing-prompts.ts`) và endpoint `POST /marketing/describe` (dùng lại `loadProductImages` + `generateText({images, useSearch:true})`). Admin thêm `generateDescription` và nút trên `ProductEditPage.vue` điền thẳng vào `form.bodyMd`.

**Tech Stack:** Cloudflare Workers + Hono + Drizzle(D1) + R2, Gemini `gemini-2.5-flash`; Vue 3 `<script setup>` + Vite + vitest (`cloudflare:test`).

## Global Constraints

- Gemini `gemini-2.5-flash` v1beta `generateContent`, secret `GEMINI_API_KEY`.
- Copy tiếng Việt, KHÔNG dùng gạch ngang dài (em dash `—`).
- Grounding luôn bật (`useSearch: true`); cần key tier trả phí.
- Cap tối đa 4 ảnh (`imageUrls.max(4)`; `loadProductImages(..., 4)`).
- Chỉ sinh `bodyMd`; KHÔNG tự điền title/series/material. KHÔNG lưu lịch sử, KHÔNG đổi schema DB, KHÔNG đụng trang Marketing/`marketing_content`.
- VISION block chỉ chèn khi `hasImages` (tránh bảo model tả ảnh không tồn tại → bịa).
- Ảnh lấy từ `form.images` (URL R2 tuyệt đối `{origin}/media/products/...`); Worker đọc R2 (Phương án A) qua `loadProductImages` đã có sẵn.
- Điền thẳng vào `form.bodyMd`; confirm ghi đè nếu ô đang có chữ.

---

### Task 1: `buildDescriptionPrompt` trong `marketing-prompts.ts`

**Files:**
- Modify: `ichigo-studio-api/src/lib/marketing-prompts.ts`
- Test: `ichigo-studio-api/tests/marketing-prompts.test.ts` (bổ sung)

**Interfaces:**
- Consumes: các hằng module-level `PERSONA`, `ANTI_SLOP`, `HUMAN_STYLE`, `SEO`, `VISION`, `GROUNDING`, hàm `priceLine` (đã có trong cùng file — KHÔNG cần export, dùng trực tiếp).
- Produces:
  ```ts
  export type DescriptionFields = { title?: string; series?: string; material?: string; price?: number | null }
  export function buildDescriptionPrompt(fields: DescriptionFields, note: string | undefined, hasImages: boolean): string
  ```

- [ ] **Step 1: Viết test thất bại** — thêm vào cuối `tests/marketing-prompts.test.ts` (giữ nguyên phần test `buildPrompt` đang có, thêm import):

```ts
import { buildDescriptionPrompt } from '../src/lib/marketing-prompts'

describe('buildDescriptionPrompt', () => {
  const fields = { title: 'Set dây Zeztz', series: 'Kamen Rider Gavv', material: 'TPU + PLA', price: 360000 }

  it('có field + ảnh: chèn field, VISION, GROUNDING, chỉ dẫn mô tả web, không em dash', () => {
    const p = buildDescriptionPrompt(fields, 'bản limited', true)
    expect(p).toContain('Set dây Zeztz')
    expect(p).toContain('bản limited')
    expect(p).toContain('THẤY RÕ trong ảnh')       // VISION
    expect(p).toContain('kết quả tìm kiếm')          // GROUNDING
    expect(p).toContain('MÔ TẢ SẢN PHẨM')            // chỉ dẫn riêng cho bodyMd
    expect(p).not.toContain('—')
  })

  it('không ảnh: VISION vắng, GROUNDING vẫn có', () => {
    const p = buildDescriptionPrompt(fields, undefined, false)
    expect(p).not.toContain('THẤY RÕ trong ảnh')
    expect(p).toContain('kết quả tìm kiếm')
  })

  it('không field nào: dùng câu fallback', () => {
    const p = buildDescriptionPrompt({}, undefined, true)
    expect(p).toContain('chưa có field nào')
    expect(p).not.toContain('- Tên:')
  })
})
```

- [ ] **Step 2: Chạy test, xác nhận fail**

Run: `cd ichigo-studio-api && yarn vitest run tests/marketing-prompts.test.ts`
Expected: FAIL (`buildDescriptionPrompt` chưa tồn tại → import error / test fail).

- [ ] **Step 3: Viết implementation** — thêm vào `src/lib/marketing-prompts.ts` (đặt SAU `buildPrompt`, dùng lại các hằng đã có trong file):

```ts
export type DescriptionFields = { title?: string; series?: string; material?: string; price?: number | null }

// Chỉ liệt kê field CÓ giá trị (không bịa field rỗng).
function knownFieldsBlock(f: DescriptionFields): string {
  const lines: string[] = []
  if (f.title?.trim()) lines.push(`- Tên: ${f.title.trim()}`)
  if (f.series?.trim()) lines.push(`- Series/nhân vật: ${f.series.trim()}`)
  if (f.material?.trim()) lines.push(`- Chất liệu: ${f.material.trim()}`)
  if (f.price != null) lines.push(`- Giá: ${priceLine(f.price)}`)
  return lines.length ? lines.join('\n') : '(chưa có field nào, chỉ dựa vào ảnh và ghi chú)'
}

const DESCRIPTION_INSTRUCTION = `Viết MÔ TẢ SẢN PHẨM để hiển thị ở trang chi tiết trên web store (KHÔNG phải bài đăng social: không hashtag, không hối thúc mua). Trả về Markdown gọn, dễ đọc:
1. Một đoạn mở ngắn giới thiệu món đồ này là gì, bám vào ảnh và dữ liệu có thật.
2. Một đoạn về công dụng: đi kèm/lắp vào đồ chơi DX nào, dùng ra sao.
3. Khối "Thông số" dạng danh sách, MỖI dòng mở đầu 1 emoji phù hợp (🧵 chất liệu, 🎯 hợp với đồ chơi nào, 📐 kích thước nếu biết, 🖨️ đặc thù in 3D FDM).
4. Một dòng lưu ý ngắn mở đầu bằng ⚠️ về hàng in 3D theo yêu cầu (có thể có vân lớp in mảnh, sai số nhỏ).
Giọng shop, trung thực, có hồn nhưng rõ ràng. Chỉ trả về nội dung Markdown, không thêm lời dẫn, không giải thích.`

export function buildDescriptionPrompt(fields: DescriptionFields, note: string | undefined, hasImages: boolean): string {
  const noteBlock = note?.trim() ? `\nGhi chú thêm từ chủ shop (ưu tiên bám theo): ${note.trim()}` : ''
  const visionBlock = hasImages ? `\n\n${VISION}` : ''

  return `${PERSONA}

${ANTI_SLOP}

${HUMAN_STYLE}

${SEO}${visionBlock}

${GROUNDING}

Thông tin đã biết (chỉ dùng dữ liệu có thật dưới đây, không bịa thêm thông số):
${knownFieldsBlock(fields)}
${noteBlock}

Nhiệm vụ: ${DESCRIPTION_INSTRUCTION}`
}
```

Lưu ý: KHÔNG được gõ ký tự `—` nào trong đoạn thêm mới.

- [ ] **Step 4: Chạy test, xác nhận pass**

Run: `cd ichigo-studio-api && yarn vitest run tests/marketing-prompts.test.ts`
Expected: PASS (các test cũ + 3 test mới).

- [ ] **Step 5: Commit**

```bash
cd ichigo-studio-api
git add src/lib/marketing-prompts.ts tests/marketing-prompts.test.ts
git commit -m "feat(api): buildDescriptionPrompt sinh mô tả sản phẩm (bodyMd) từ ảnh + grounding"
```

---

### Task 2: `POST /marketing/describe` (schema + route)

**Files:**
- Modify: `ichigo-studio-api/src/schemas/marketing.ts`
- Modify: `ichigo-studio-api/src/routes/marketing.ts`
- Test: `ichigo-studio-api/tests/marketing.test.ts` (bổ sung)

**Interfaces:**
- Consumes: `loadProductImages(bucket, urls, max)` và `generateText`/`GeminiError` (đã có trong route/lib); `buildDescriptionPrompt` (Task 1).
- Produces: `POST /marketing/describe` body `{ title?, series?, material?, price?(int|null), note?(max500), imageUrls?: string[].max(4) }` → `{ content, sources }`.

- [ ] **Step 1: Viết test thất bại** — thêm vào `describe('marketing', ...)` trong `tests/marketing.test.ts`:

```ts
it('describe: đọc ảnh R2 -> inline_data + google_search, trả content+sources', async () => {
  const key = 'products/desc-1.webp'
  await env.BUCKET.put(key, new Uint8Array([1, 2, 3]), { httpMetadata: { contentType: 'image/webp' } })
  const fetchMock = vi.fn(async () =>
    new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: '## Mô tả' }] }, groundingMetadata: { groundingChunks: [{ web: { uri: 'https://kr.fandom.com', title: 'Gavv' } }] } }] }), { status: 200, headers: { 'content-type': 'application/json' } }),
  )
  vi.stubGlobal('fetch', fetchMock)
  const res = await app.request('/marketing/describe', authed(t, { method: 'POST', body: JSON.stringify({ title: 'Set dây Zeztz', series: 'Kamen Rider Gavv', material: 'TPU', imageUrls: [`http://x/media/${key}`] }) }), { ...env, GEMINI_API_KEY: 'k' })
  expect(res.status).toBe(200)
  const json = await res.json<{ content: string; sources: { uri: string }[] }>()
  expect(json.content).toBe('## Mô tả')
  expect(json.sources).toEqual([{ uri: 'https://kr.fandom.com', title: 'Gavv' }])
  const body = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string)
  expect(body.contents[0].parts.some((p: { inline_data?: unknown }) => p.inline_data)).toBe(true)
  expect(body.tools).toEqual([{ google_search: {} }])
})

it('describe: không ảnh (chỉ field) -> không inline_data, vẫn 200 + grounding', async () => {
  const fetchMock = vi.fn(async () =>
    new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: 'MÔ TẢ' }] } }] }), { status: 200, headers: { 'content-type': 'application/json' } }),
  )
  vi.stubGlobal('fetch', fetchMock)
  const res = await app.request('/marketing/describe', authed(t, { method: 'POST', body: JSON.stringify({ title: 'Đế trưng bày', material: 'PLA' }) }), { ...env, GEMINI_API_KEY: 'k' })
  expect(res.status).toBe(200)
  const body = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string)
  expect(body.contents[0].parts.some((p: { inline_data?: unknown }) => p.inline_data)).toBe(false)
  expect(body.tools).toEqual([{ google_search: {} }])
})

it('describe: 503 khi thiếu GEMINI_API_KEY', async () => {
  const res = await app.request('/marketing/describe', authed(t, { method: 'POST', body: JSON.stringify({ title: 'x' }) }), { ...env, GEMINI_API_KEY: undefined })
  expect(res.status).toBe(503)
})

it('describe: 400 khi quá 4 ảnh', async () => {
  const urls = Array.from({ length: 5 }, (_, i) => `http://x/media/products/p${i}.webp`)
  const res = await app.request('/marketing/describe', authed(t, { method: 'POST', body: JSON.stringify({ imageUrls: urls }) }), { ...env, GEMINI_API_KEY: 'k' })
  expect(res.status).toBe(400)
})
```

- [ ] **Step 2: Chạy test, xác nhận fail**

Run: `cd ichigo-studio-api && yarn vitest run tests/marketing.test.ts`
Expected: FAIL (route `/describe` chưa tồn tại → 404).

- [ ] **Step 3a: Thêm schema** — vào `src/schemas/marketing.ts` (thêm export, không sửa cái cũ):

```ts
export const describeInputSchema = z.object({
  title: z.string().optional(),
  series: z.string().optional(),
  material: z.string().optional(),
  price: z.number().int().nullable().optional(),
  note: z.string().max(500).optional(),
  imageUrls: z.array(z.string()).max(4).optional(),
})
export type DescribeInput = z.infer<typeof describeInputSchema>
```

- [ ] **Step 3b: Thêm route** — trong `src/routes/marketing.ts`:

Cập nhật import:
```ts
import { generateInputSchema, saveInputSchema, describeInputSchema } from '../schemas/marketing'
import { buildPrompt, buildDescriptionPrompt } from '../lib/marketing-prompts'
```

Thêm handler (đặt sau handler `POST /generate`):
```ts
marketingRoutes.post('/describe', zValidator('json', describeInputSchema), async (c) => {
  const apiKey = c.env.GEMINI_API_KEY
  if (!apiKey) return c.json({ error: 'ai_not_configured' }, 503)

  const { title, series, material, price, note, imageUrls } = c.req.valid('json')
  const images = await loadProductImages(c.env.BUCKET, imageUrls ?? [], 4)
  const prompt = buildDescriptionPrompt({ title, series, material, price }, note, images.length > 0)
  try {
    const { text, sources } = await generateText(apiKey, prompt, { images, useSearch: true })
    return c.json({ content: text, sources })
  } catch (err) {
    if (err instanceof GeminiError) return c.json({ error: 'ai_error', detail: err.message }, 502)
    throw err
  }
})
```

- [ ] **Step 4: Chạy toàn bộ test API, xác nhận pass**

Run: `cd ichigo-studio-api && yarn vitest run`
Expected: PASS toàn bộ (86 cũ + 4 test describe mới).

- [ ] **Step 5: Commit**

```bash
cd ichigo-studio-api
git add src/schemas/marketing.ts src/routes/marketing.ts tests/marketing.test.ts
git commit -m "feat(api): POST /marketing/describe sinh mô tả sản phẩm từ ảnh R2 + grounding"
```

---

### Task 3: Admin — `generateDescription` + nút trên `ProductEditPage.vue`

**Files:**
- Modify: `ichigo-studio-admin/src/lib/products.ts`
- Modify: `ichigo-studio-admin/src/pages/ProductEditPage.vue`

**Interfaces:**
- Consumes: `api` (`@/lib/api`); endpoint `/marketing/describe` (Task 2).
- Produces:
  ```ts
  export function generateDescription(input: {
    title?: string; series?: string; material?: string; price?: number | null
    note?: string; imageUrls?: string[]
  }): Promise<{ content: string; sources: { uri: string; title: string }[] }>
  ```

- [ ] **Step 1: Thêm lib fn** — cuối `src/lib/products.ts`:

```ts
// Gọi AI sinh mô tả sản phẩm (bodyMd) từ ảnh + field. Không lưu, chỉ trả nội dung.
export function generateDescription(input: {
  title?: string
  series?: string
  material?: string
  price?: number | null
  note?: string
  imageUrls?: string[]
}) {
  return api<{ content: string; sources: { uri: string; title: string }[] }>('/marketing/describe', {
    method: 'POST',
    body: input,
  })
}
```

- [ ] **Step 2: Sửa `ProductEditPage.vue` script** — thêm import + state + handler.

Thêm `generateDescription` vào dòng import `@/lib/products`:
```ts
import { fetchProduct, createProduct, updateProduct, uploadImage, formatPrice, generateDescription } from '@/lib/products'
```
(Các icon `Wand2`, `Loader2` đã được import sẵn ở đầu file — dùng lại.)

Thêm state (cạnh các ref hiện có, ví dụ sau `const uploading = ref(false)`):
```ts
const descNote = ref('')
const describing = ref(false)
const descError = ref('')
const descSources = ref<{ uri: string; title: string }[]>([])

async function onGenerateDescription() {
  descError.value = ''
  descSources.value = []
  if (form.bodyMd.trim() && !window.confirm('Ghi đè mô tả hiện tại bằng nội dung AI?')) return
  describing.value = true
  try {
    const res = await generateDescription({
      title: form.title || undefined,
      series: form.series || undefined,
      material: form.material || undefined,
      price: form.price,
      note: descNote.value || undefined,
      imageUrls: form.images.slice(0, 4),
    })
    form.bodyMd = res.content
    descSources.value = res.sources ?? []
  } catch (e) {
    const code = (e as { data?: { error?: string } })?.data?.error
    descError.value =
      code === 'ai_not_configured'
        ? 'Chưa cấu hình GEMINI_API_KEY trên server.'
        : code === 'ai_error'
          ? 'AI đang lỗi hoặc hết quota, thử lại sau.'
          : 'Có lỗi khi sinh mô tả, thử lại nhé.'
  } finally {
    describing.value = false
  }
}
```

- [ ] **Step 3: Sửa `ProductEditPage.vue` template** — trong Card "Mô tả": thêm ô ghi chú + nút vào `CardHeader`, và khối nguồn dưới textarea. Thay khối Card Mô tả (dòng ~233-247) bằng:

```vue
      <!-- Mô tả -->
      <Card>
        <CardHeader>
          <CardTitle>Mô tả</CardTitle>
          <CardDescription>Nội dung Markdown hiển thị ở trang chi tiết sản phẩm.</CardDescription>
        </CardHeader>
        <CardContent class="space-y-3">
          <div class="flex flex-col gap-2 sm:flex-row sm:items-end">
            <div class="flex-1">
              <Label for="descNote" class="text-xs text-muted-foreground">Ghi chú cho AI (tùy chọn)</Label>
              <Input id="descNote" v-model="descNote" placeholder="Ví dụ: bản limited, tặng kèm chân đế..." />
            </div>
            <Button type="button" variant="outline" :disabled="describing" @click="onGenerateDescription">
              <Loader2 v-if="describing" class="size-4 animate-spin" />
              <Wand2 v-else class="size-4" />
              {{ describing ? 'Đang viết...' : 'AI viết mô tả' }}
            </Button>
          </div>
          <p v-if="descError" class="text-sm text-destructive">{{ descError }}</p>
          <textarea
            v-model="form.bodyMd"
            rows="8"
            placeholder="Mô tả chi tiết, thông số, lưu ý..."
            class="flex min-h-40 w-full rounded-md border border-input bg-transparent px-3 py-2 font-mono text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
          <div v-if="descSources.length" class="text-sm">
            <p class="font-medium mb-1">Nguồn tham khảo</p>
            <ul class="space-y-1">
              <li v-for="s in descSources" :key="s.uri">
                <a :href="s.uri" target="_blank" rel="noopener" class="text-primary underline break-all">{{ s.title }}</a>
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>
```

(`Input`, `Label`, `Button`, `Card*` đã được import sẵn trong file — kiểm tra lại; nếu `Input` chưa import thì thêm `import { Input } from '@/components/ui/input'`, nhưng file đã dùng `Input` nên có sẵn.)

- [ ] **Step 4: Type-check + build**

Run: `cd ichigo-studio-admin && yarn vue-tsc --noEmit && yarn build`
Expected: PASS (không lỗi type, build xanh).

- [ ] **Step 5: Kiểm thử thủ công nhanh** (tùy chọn, nếu có key paid + local API)

Chạy API + admin. Vào `/san-pham/moi`: gõ tên/series/chất liệu, upload 1-2 ảnh, (tùy chọn) gõ ghi chú, bấm "AI viết mô tả" -> ô Mô tả được điền markdown bám ảnh; nếu ô đang có chữ thì hiện confirm; hiện "Nguồn tham khảo" nếu có. Không có ảnh vẫn sinh được từ field.

- [ ] **Step 6: Commit**

```bash
cd ichigo-studio-admin
git add src/lib/products.ts src/pages/ProductEditPage.vue
git commit -m "feat(admin): nút AI viết mô tả sản phẩm từ ảnh trong form thêm/sửa"
```

---

## Ghi chú vận hành (không phải task code)

- Grounding cần `GEMINI_API_KEY` tier trả phí (free-tier bị khóa). 429/403 khi test → kiểm tra tier trước khi nghi code.
- Không secret/migration mới. Redeploy: api `wrangler deploy`; admin `VITE_API_URL=<prodapi> yarn build && wrangler deploy`.

## Self-Review

- **Spec coverage**: bodyMd từ ảnh+field (Task 1+2+3); grounding on (Task 2 `useSearch:true`); VISION gate theo hasImages (Task 1); ảnh R2 qua loadProductImages Phương án A (Task 2); cap 4 (Task 2 schema + slice); điền thẳng + confirm ghi đè (Task 3); note field (Task 1 prompt + Task 3 UI); sources hiển thị (Task 1→2→3); không đổi DB/không lưu (Task 2 không insert); không tự điền title/series (chỉ bodyMd). Đủ.
- **Placeholder scan**: không có TODO/TBD; mọi step có code thật.
- **Type consistency**: `buildDescriptionPrompt(fields, note, hasImages)` khớp giữa Task 1 và Task 2; `generateDescription` trả `{content, sources:{uri,title}[]}` khớp Task 2 response và Task 3 consume; `describeInputSchema` field khớp payload admin gửi (`price?: number|null`, `imageUrls?: string[]`).
