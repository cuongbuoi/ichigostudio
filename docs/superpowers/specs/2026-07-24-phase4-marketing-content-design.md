# Thiết kế: Phase 4 — Trợ lý soạn content Marketing (AI)

Ngày: 2026-07-24

## Mục tiêu

Trong admin, chủ shop chọn một sản phẩm và để AI (Gemini) sinh nội dung bán
hàng theo nhiều định dạng (Facebook, TikTok/Reels, mô tả sàn TMĐT, shot-list
chụp ảnh), copy đi đăng thủ công lên kênh social. Lưu lịch sử bài đã sinh.

## Bối cảnh & ràng buộc

- Shop bán chủ yếu qua Facebook/TikTok/Messenger; content là khâu tốn thời gian.
- Đã có agent `ichigo-content-writer` (kiến thức tokusatsu/Kamen Rider) làm tham
  chiếu giọng văn, nhưng feature này chạy qua Gemini API runtime trong admin.
- Nhà cung cấp AI: **Gemini** (`gemini-2.5-flash`, endpoint v1beta
  `generateContent`, header `x-goog-api-key`). Đã test key thật: HTTP 200, sinh
  tiếng Việt tốt, tier `standard` (free-tier khóa, standard chạy). Tắt thinking
  (`generationConfig.thinkingConfig.thinkingBudget: 0`) cho rẻ + nhanh.
- Quy tắc copy: tiếng Việt, KHÔNG dùng gạch ngang dài (em dash).
- API key nạp qua secret (`GEMINI_API_KEY`), KHÔNG vào repo. `.dev.vars` cho
  local (`wrangler dev --remote` đọc secret từ `.dev.vars`), `wrangler secret
  put` cho prod.

## Kiến trúc

```
Admin (Vue) --productId+format--> API /marketing/generate --prompt--> Gemini
                                          |
Admin  --Lưu-->  API POST /marketing  -->  D1 marketing_content (lịch sử)
Admin  --xem/xóa-->  API GET/DELETE /marketing
```

Gọi AI ở server (API worker) để giấu key. Store không đổi (content đăng tay).

## Backend (ichigo-studio-api)

- **Secret**: `GEMINI_API_KEY`.
- **Bảng `marketing_content`**: `id` (pk), `productId` (ref products, set null on
  delete), `format` (enum: facebook | tiktok | marketplace | shotlist),
  `content` (text), `createdAt` (int).
- **Route `/marketing`** (đều `requireAuth`):
  - `POST /generate` — body `{ productId, format, note? }`. Nạp product
    (title/series/material/price/bodyMd), dựng prompt tiếng Việt theo format,
    gọi Gemini, trả `{ content }`. KHÔNG tự lưu.
  - `POST /` — body `{ productId, format, content }` lưu 1 bài, trả `{ id }`.
  - `GET /?productId=` — liệt kê lịch sử (mới nhất trước), lọc theo product.
  - `DELETE /:id` — xóa 1 bài.
- **`src/lib/gemini.ts`**: `generateText(apiKey, prompt)` gọi REST, tách text từ
  `candidates[0].content.parts[].text`. Lỗi: thiếu key -> 503 `ai_not_configured`;
  Gemini lỗi -> 502 `ai_error`.
- **`src/lib/marketing-prompts.ts`**: `buildPrompt(format, product, note)` — 4
  prompt riêng, kèm brand voice tokusatsu, ràng buộc không em dash.
- **Zod** `src/schemas/marketing.ts`: generate input, save input.

## Admin (ichigo-studio-admin)

- Kích hoạt nav **Marketing** (đang "Sắp có") -> route `/marketing` name
  `marketing`.
- Trang `MarketingPage.vue`:
  - Chọn sản phẩm (Select nạp từ `/products`), chọn format (4 nút/tabs), ô ghi
    chú tùy chọn, nút **Sinh nội dung** (loading).
  - Kết quả hiện trong textarea, nút **Copy** + **Lưu**.
  - **Lịch sử** theo sản phẩm: danh sách bài đã lưu (format, thời gian, nội
    dung rút gọn), nút copy/xóa.
- **`src/lib/marketing.ts`**: `generateContent`, `saveContent`, `listContent`,
  `deleteContent`.

## Ngoài phạm vi

- Không đăng tự động lên Facebook/TikTok (chỉ sinh + copy tay).
- Không sinh ảnh; shot-list chỉ là gợi ý cảnh chụp bằng chữ.
- Store không hiển thị content này.

## Testing

- API: vitest — marketing route (auth gate, save/list/delete, validation);
  `generate` mock Gemini fetch (`vi.stubGlobal('fetch', ...)`) để test dựng
  prompt + xử lý lỗi thiếu key, không gọi mạng thật.
- Admin: build (vue-tsc) xanh; logic thuần trong `lib/marketing` nếu cần.
