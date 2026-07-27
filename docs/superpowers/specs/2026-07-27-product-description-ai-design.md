# Thiết kế: AI viết mô tả sản phẩm (bodyMd) từ ảnh lúc thêm sản phẩm

Ngày: 2026-07-27

## Mục tiêu

Trong form thêm/sửa sản phẩm của admin (`ProductEditPage.vue`, route `/san-pham/moi`),
thêm nút **"AI viết mô tả"**: AI đọc ảnh sản phẩm (đã upload lên R2) + các field chủ
shop đã gõ (tên, series, chất liệu, giá) + ghi chú tùy chọn, rồi viết **mô tả sản phẩm
(`bodyMd`, markdown)** để hiển thị trên web store. Nội dung phải bám đúng ảnh + dữ liệu
có thật, **tránh bịa** facts nhân vật/series (dùng Google Search grounding để xác minh).

Đây là nội dung "của sản phẩm" (mô tả canonical hiển thị cho khách trên storefront),
KHÁC với bài đăng social ở trang Marketing.

## Bối cảnh & ràng buộc

- Tái dùng hạ tầng vừa build (feature `2026-07-27-marketing-image-grounding`): Gemini
  `gemini-2.5-flash` v1beta `generateContent`, secret `GEMINI_API_KEY`, `generateText`
  đã hỗ trợ ảnh `inline_data` + `google_search` grounding + trả `{ text, sources }`.
- Trong `ProductEditPage.vue`, ảnh được upload lên R2 NGAY khi chọn (`uploadImage(f)`,
  dòng ~87) và đẩy URL vào `form.images: string[]`. Vậy kể cả sản phẩm MỚI chưa lưu,
  ảnh đã có URL R2 → Worker đọc từ R2 (Phương án A, nhất quán feature trước).
- `bodyMd` là markdown, store render qua markdown-it (`breaks:true`). Mô tả nên là
  markdown gọn (đoạn mở + công dụng + danh sách Thông số + lưu ý hàng in 3D).
- Copy tiếng Việt, KHÔNG dùng gạch ngang dài (em dash `—`).
- Grounding cần key tier trả phí (free-tier đang khóa — memory dự án).

## Quyết định thiết kế (đã chốt)

| Điểm | Quyết định |
|---|---|
| Nội dung sinh | Chỉ `bodyMd` (KHÔNG tự điền title/series/material) |
| Chèn vào form | Điền thẳng vào ô `bodyMd`; confirm ghi đè nếu ô đang có chữ |
| Grounding | Bật Google Search grounding |
| Ngữ liệu | Ảnh R2 (≤4) + field đã gõ + ghi chú tùy chọn |
| Ô ghi chú (note) | Có (thêm ngữ cảnh: bản limited, tặng kèm...) |
| Lưu lịch sử | Không (one-shot fill field); không đổi schema DB |

## Kiến trúc

```
ProductEditPage: gõ fields + upload ảnh (đã lên R2) -> bấm "AI viết mô tả"
   |
   POST /marketing/describe { title?, series?, material?, price?, note?, imageUrls[≤4] }
   |
API route: loadProductImages(BUCKET, imageUrls, 4) -> base64   [reuse hàm đã có]
           buildDescriptionPrompt(fields, note, hasImages)
           generateText(key, prompt, { images, useSearch: true })   [reuse]
   |
   <- { content (markdown), sources }
   |
ProductEditPage: form.bodyMd = content (confirm nếu đang có chữ) + hiện "Nguồn tham khảo"
```

Không lưu DB, không đụng trang Marketing, store không đổi.

## Backend (ichigo-studio-api)

### `src/lib/marketing-prompts.ts`
- Export các hằng brand-voice hiện đang private để tái dùng: `PERSONA`, `ANTI_SLOP`,
  `HUMAN_STYLE`, `SEO`, `VISION`, `GROUNDING` (giữ nguyên nội dung).
- Thêm `buildDescriptionPrompt(fields, note?, hasImages)`:
  ```ts
  type DescriptionFields = { title?: string; series?: string; material?: string; price?: number | null }
  export function buildDescriptionPrompt(fields: DescriptionFields, note: string | undefined, hasImages: boolean): string
  ```
  - Dựng khối "Thông tin đã biết" CHỈ từ field có giá trị (bỏ field rỗng), ràng buộc
    "chỉ dùng dữ liệu có thật, không bịa thông số".
  - Chèn VISION CHỈ khi `hasImages` (tránh bảo model tả ảnh không tồn tại), GROUNDING
    luôn bật.
  - Chỉ dẫn riêng: viết MÔ TẢ SẢN PHẨM cho trang web (không phải bài social). Markdown:
    1 đoạn mở giới thiệu món đồ (bám ảnh), phần công dụng/lắp vào đồ chơi DX nào, khối
    **Thông số** mỗi dòng mở đầu 1 emoji, 1 lưu ý ngắn hàng in 3D FDM. Nếu không chắc
    nhân vật/series thì viết chung chung, KHÔNG bịa tên/năm/cốt truyện. Không em dash.

### `src/routes/marketing.ts`
- Thêm `POST /describe` (router đã `requireAuth`):
  - zod body: `{ title?, series?, material?, price? (int nullable), note? (max 500),
    imageUrls?: string[].max(4) }` (tất cả optional; không refine bắt buộc — mô tả từ
    field cũng hợp lệ).
  - Thiếu key -> 503 `ai_not_configured`.
  - `const images = await loadProductImages(c.env.BUCKET, imageUrls ?? [], 4)`.
  - `const prompt = buildDescriptionPrompt({title,series,material,price}, note, images.length > 0)`.
  - `const { text, sources } = await generateText(apiKey, prompt, { images, useSearch: true })`.
  - Trả `{ content: text, sources }`. `GeminiError` -> 502 `ai_error`.

## Admin (ichigo-studio-admin)

### `src/lib/products.ts`
- Thêm `generateDescription(input) => Promise<{ content: string; sources: {uri,title}[] }>`:
  ```ts
  export function generateDescription(input: {
    title?: string; series?: string; material?: string; price?: number | null
    note?: string; imageUrls?: string[]
  }) { return api<{ content: string; sources: { uri: string; title: string }[] }>('/marketing/describe', { method: 'POST', body: input }) }
  ```
  (Có thể tái dùng type `MarketingSource` từ `lib/marketing.ts` nếu import gọn.)

### `src/pages/ProductEditPage.vue`
- Cạnh ô Mô tả (`bodyMd`, ~dòng 241): thêm nút **"AI viết mô tả"** (icon Sparkles,
  trạng thái loading) + ô ghi chú nhỏ (input) tùy chọn.
- Handler `onGenerateDescription`:
  1. Gom `{ title, series, material, price, note, imageUrls: form.images.slice(0, 4) }`
     (chỉ gửi field có giá trị).
  2. Nếu `form.bodyMd` đang có chữ -> `confirm('Ghi đè mô tả hiện tại?')`, hủy thì dừng.
  3. Gọi `generateDescription`, set `form.bodyMd = res.content`, lưu `res.sources` vào
     một ref để hiển thị.
  4. Lỗi -> thông báo thân thiện (dùng lại pattern `friendlyError` tương tự Marketing).
- Hiển thị khối **"Nguồn tham khảo"** (list link) dưới ô mô tả sau khi sinh (nếu có).

## Ngoài phạm vi

- KHÔNG tự điền title/series/material từ ảnh (chốt chỉ bodyMd).
- KHÔNG lưu lịch sử; KHÔNG đổi schema DB; KHÔNG đụng `marketing_content` hay trang Marketing.
- KHÔNG sinh ảnh; store không đổi.

## Testing

- **API (vitest, mock fetch)**:
  1. `/describe` với `imageUrls` (seed R2 + fetch mock) -> request Gemini có `inline_data`
     + `tools:[{google_search:{}}]`; trả `{content, sources}`.
  2. `/describe` không ảnh (chỉ fields) -> KHÔNG có `inline_data` part; VISION vắng
     (kiểm gián tiếp qua prompt nếu cần) nhưng vẫn 200 + grounding on.
  3. Thiếu key -> 503; `GeminiError` -> 502.
  4. Auth gate (401 khi không token).
- **Admin**: vue-tsc `--noEmit` xanh + `yarn build` xanh.

## Rủi ro & lưu ý

- Chi phí grounding: mỗi lần bấm nút tốn token + phí grounding; tần suất thấp (chỉ khi
  tạo/sửa sản phẩm), chấp nhận được.
- `loadProductImages` đã bọc try/catch per-image (ảnh R2 lỗi thì bỏ qua, không fail).
- Ảnh mới upload xong mới bấm nút thì `form.images` đã có URL R2 hợp lệ; nếu bấm khi
  chưa có ảnh, mô tả vẫn sinh từ field (hasImages=false, VISION tắt).
