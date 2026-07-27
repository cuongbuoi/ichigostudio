# Thiết kế: Content marketing từ HÌNH ẢNH + Google Search grounding (mở rộng Phase 4)

Ngày: 2026-07-27

## Mục tiêu

Nâng cấp trợ lý soạn content Phase 4 để AI **nhìn ảnh sản phẩm thật** khi viết bài,
thay vì chỉ đọc field text. Mục tiêu chính: nội dung **bám đúng sản phẩm trong ảnh,
tránh bịa** (mô tả sai bộ phận, gán nhầm nhân vật/series). Bổ sung **Google Search
grounding** để xác minh facts nhân vật/series/thiết bị trước khi viết.

Hai nguồn "sự thật" và cách chống bịa tương ứng:

1. **Những gì AI THẤY trong ảnh** (bộ phận, màu, chi tiết in) → đưa ảnh vào làm
   ngữ liệu vision, chỉ mô tả cái nhìn thấy rõ.
2. **Kiến thức nhân vật/series** (dễ bịa nhất) → bật Google Search grounding; nếu
   tra không ra hoặc không chắc thì viết chung chung, KHÔNG bịa tên.

## Bối cảnh & ràng buộc

- Kế thừa toàn bộ hạ tầng Phase 4: Gemini `gemini-2.5-flash`, endpoint v1beta
  `generateContent`, header `x-goog-api-key`, secret `GEMINI_API_KEY`, 4 format
  (facebook | tiktok | marketplace | shotlist), brand voice tokusatsu, KHÔNG em dash.
- `gemini-2.5-flash` hỗ trợ **đa phương thức (ảnh inline_data)** và **Google Search
  grounding** (`tools: [{ google_search: {} }]`) trong cùng lời gọi generateContent.
- **Chi phí**: grounding tốn phí hơn text thuần và **chỉ chạy trên tier trả phí**.
  Free-tier của key hiện bị khóa (limit 0) — theo memory dự án; tier `standard`/paid
  chạy được. Cần đảm bảo key đang dùng ở tier trả phí.
- API key nạp qua secret, KHÔNG vào repo; `.dev.vars` cho local (`wrangler dev
  --remote`), `wrangler secret put` cho prod.
- R2 binding `BUCKET` đã có sẵn; ảnh sản phẩm lưu ở R2, `product_images.url` là URL
  tuyệt đối dạng `{origin}/media/products/{uuid}-{name}`. R2 key = phần path sau
  `/media/`.
- Ảnh upload từ admin đã được nén client-side (`compressImage` → WebP, max 1600px,
  q0.8, ~100-300KB/ảnh) — dùng lại cho ảnh ad-hoc.

## Quyết định thiết kế (đã chốt với chủ shop)

| Điểm | Quyết định |
|---|---|
| Vai trò của ảnh | Làm **ngữ liệu** cho bài (vision grounding), không dùng để tự điền form |
| Chống bịa facts | **Bật Google Search grounding** |
| Input | Ảnh + ô free-form; hỗ trợ **cả** sản phẩm đã lưu **và** ảnh ad-hoc |
| Nạp ảnh product | **Phương án A**: Worker tự đọc ảnh từ R2 (client chỉ gửi `productId`) |
| Cap ảnh | **Tối đa 4 ảnh/lần** (cả product lẫn ad-hoc) |
| Lưu lịch sử | Ad-hoc **không lưu** (chỉ copy); bài gắn `productId` vẫn lưu như cũ |

## Kiến trúc

```
[Sản phẩm đã lưu]  Admin --{productId, format, note}--> API /marketing/generate
                                                             |
                                        Worker đọc ≤4 ảnh từ R2 (BUCKET.get) -> base64
                                                             |
[Ảnh ad-hoc] Admin --compressImage-> {images[], format, note}--> /marketing/generate
                                                             |
      Gemini generateContent: parts=[prompt text + inline_data ảnh], tools=[google_search]
                                                             |
                                        <- { content, sources? }  (sources từ groundingMetadata)
                                                             |
                     Admin: hiển thị bài + nguồn tham khảo -> Copy / Lưu (chỉ khi có productId)
```

Vẫn gọi AI ở server (giấu key). Store không đổi (đăng tay). Không tự lưu khi generate.

## Backend (ichigo-studio-api)

### `src/schemas/marketing.ts`
`generateInputSchema` mới (giữ `marketingFormats`, `saveInputSchema` nguyên):
```ts
const imageSchema = z.object({
  mimeType: z.string().regex(/^image\//),
  data: z.string().min(1),        // base64 (không kèm data URI prefix)
})
generateInputSchema = z.object({
  format: z.enum(marketingFormats),
  note: z.string().max(500).optional(),
  productId: z.string().min(1).optional(),
  images: z.array(imageSchema).max(4).optional(),
}).refine(v => v.productId || (v.images?.length), {
  message: 'need_product_or_images',
})
```

### `src/lib/gemini.ts`
Nâng `generateText` nhận thêm options (giữ chữ ký cũ tương thích qua tham số optional):
```ts
interface GenerateOptions {
  images?: { mimeType: string; data: string }[]
  useSearch?: boolean
}
generateText(apiKey, prompt, opts?): Promise<{ text: string; sources: Source[] }>
```
- Ghép `parts`: `[{ text: prompt }, ...images.map(i => ({ inline_data: { mime_type, data } }))]`.
- `opts.useSearch` → thêm `tools: [{ google_search: {} }]` vào body.
- Đọc text từ `candidates[0].content.parts[].text` như cũ.
- Trích `sources` từ `candidates[0].groundingMetadata.groundingChunks[].web` (`{uri, title}`),
  loại trùng, tối đa ~5. Rỗng nếu không có grounding.
- Lỗi giữ nguyên: `GeminiError` (`gemini_http_*`, `gemini_empty_response`).
- **Lưu ý**: callers hiện tại (nếu có) nhận `string` — đổi thành object; cập nhật
  route để đọc `.text`.

### `src/lib/marketing-prompts.ts`
- `buildPrompt(format, product | null, note)` — cho `product` optional. Khi có
  product: giữ nguyên `productBlock`. Khi ad-hoc: bỏ block field text, chỉ dựa ảnh + note.
- Thêm khối chỉ dẫn mới (chèn cạnh ANTI_SLOP / SEO, giữ nguyên PERSONA / 4 FORMAT):
  - **VISION**: "Có kèm ảnh sản phẩm thật. Chỉ mô tả những gì THẤY RÕ trong ảnh
    (bộ phận, màu sắc, chi tiết in, cách lắp). KHÔNG suy đoán chi tiết không nhìn thấy.
    Nếu ảnh và ghi chú mâu thuẫn, ưu tiên hỏi lại chủ shop bằng cách viết chung chung
    thay vì đoán bừa."
  - **GROUNDING**: "Dùng kết quả tìm kiếm để xác minh TÊN nhân vật, series, tên
    thiết bị/driver trước khi viết. Nếu tìm không ra hoặc không chắc chắn, viết chung
    chung (ví dụ 'nhân vật Kamen Rider' thay vì gán sai tên). TUYỆT ĐỐI không bịa tên,
    năm ra mắt, hay cốt truyện."
- Vẫn ràng buộc: chỉ dùng dữ liệu có thật (ảnh + note + field nếu có), không bịa thông số.

### `src/routes/marketing.ts` — `POST /generate`
- `productId` có → load product (title/series/material/price/bodyMd) + query
  `product_images` order by `sort`, lấy ≤4 URL đầu → suy R2 key (strip `/media/`)
  → `BUCKET.get(key)` → `arrayBuffer` → base64 + `mimeType` từ `httpMetadata.contentType`.
  Ảnh R2 thiếu/null thì bỏ qua (không fail cả request).
- `images` (ad-hoc) có → dùng trực tiếp (đã cap 4 ở schema).
- `buildPrompt(format, productOrNull, note)`; gọi
  `generateText(apiKey, prompt, { images, useSearch: true })`.
- Trả `{ content, sources }`. Thiếu key → 503 `ai_not_configured`; `GeminiError` → 502 `ai_error`.
- `POST /`, `GET /`, `DELETE /:id` giữ nguyên (chỉ lưu khi có productId — không đổi).

## Admin (ichigo-studio-admin)

### `MarketingPage.vue`
- Thêm **toggle nguồn ngữ liệu**: "Sản phẩm đã lưu" | "Ảnh ad-hoc".
  - Chế độ sản phẩm: giữ Select sản phẩm hiện có; gửi `{productId, format, note}`.
  - Chế độ ad-hoc: dropzone kéo-thả ảnh (tối đa 4), preview thumbnail, xóa từng ảnh;
    dùng lại `compressImage` → đọc base64 (bỏ prefix `data:...;base64,`) → gửi `{images, format, note}`.
- Ô ghi chú free-form (note) dùng chung cho cả 2 chế độ.
- Sau khi có kết quả: hiển thị textarea + nút **Copy** (như cũ) và block **Nguồn
  tham khảo** (list link từ `sources` nếu có).
- Nút **Lưu** chỉ hiện/bật ở chế độ sản phẩm (ad-hoc không lưu).

### `src/lib/marketing.ts`
- `generateContent` đổi tham số: nhận `{ format, note?, productId?, images? }`, trả
  `{ content, sources }`.
- Thêm helper `fileToBase64(file)` (hoặc dùng kết quả canvas từ compress) tách phần
  base64. `saveContent`/`listContent`/`deleteContent` giữ nguyên.

## Ngoài phạm vi

- KHÔNG dùng ảnh để tự nhận diện & điền form sản phẩm (đã chốt chỉ dùng làm ngữ liệu).
- KHÔNG lưu lịch sử cho bài ad-hoc; KHÔNG thay đổi schema `marketing_content`.
- KHÔNG đăng tự động lên Facebook/TikTok; vẫn copy tay.
- KHÔNG sinh ảnh; shot-list vẫn là gợi ý cảnh chụp bằng chữ.
- Store không hiển thị content này.

## Testing

- **API (vitest, mock fetch)** — mở rộng bộ 7 test hiện có:
  1. `generate` với `productId` → mock `BUCKET.get` trả bytes; assert request tới
     Gemini có `inline_data` parts + `tools: [google_search]`.
  2. `generate` ad-hoc với `images[]` → assert forward đúng parts, không đụng R2.
  3. Thiếu cả `productId` lẫn `images` → 400 (zod refine).
  4. Quá 4 ảnh → 400.
  5. Parse `sources` từ `groundingMetadata.groundingChunks[].web` trong response mock.
  6. Thiếu key → 503; `GeminiError` → 502 (giữ nguyên).
- **Admin**: build (vue-tsc) xanh; logic thuần (`fileToBase64`, dựng payload) trong
  `lib/marketing` test nếu tách được.

## Rủi ro & lưu ý

- **Chi phí grounding**: mỗi generate giờ tốn hơn (grounding + token ảnh). Chấp nhận
  vì đây là tool nội bộ, tần suất thấp. Có thể thêm cờ tắt grounding sau nếu cần.
- **Giới hạn payload Worker**: 4 ảnh nén (~300KB) base64 (+33%) vẫn an toàn dưới
  giới hạn request; cap 4 là chốt chặn.
- **Chính sách hiển thị nguồn của Google Search grounding**: hiển thị `sources` là
  cách tôn trọng yêu cầu attribution; đủ cho nhu cầu nội bộ.
- **Tương thích**: đổi kiểu trả của `generateText` (string → object) là breaking
  nội bộ — chỉ có route marketing gọi, cập nhật cùng lúc.
