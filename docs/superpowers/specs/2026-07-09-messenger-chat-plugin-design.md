# Thiết kế: Nút chat Messenger fanpage (Facebook Chat Plugin)

Ngày: 2026-07-09

## Mục tiêu

Thay nút liên hệ Messenger hiện tại (một link `m.me` dạng nút tròn nổi) bằng
**Facebook Chat Plugin** chính thức, nhúng ngay trên site để khách nhắn tin trong
bong bóng chat mà không rời trang.

## Bối cảnh & ràng buộc

- Site Nuxt 3 SSG, dark-mode-only. Hiện `layouts/default.vue` render
  `<FloatingContact />` (link `m.me/ichigostudio.vn`).
- Chat Plugin cần **Page ID dạng số**: `1208082255719784`.
- Cần **whitelist domain** trong Meta Business Suite → Chat Plugin (domain thật,
  `*.pages.dev` nếu cần, và `http://localhost:3000` để test). Không whitelist thì
  Facebook không render widget.
- FB SDK là script bên thứ ba, chỉ chạy client, đặt cookie theo dõi.

## Quyết định thiết kế (đã chốt với người dùng)

1. Dùng Chat Plugin nhúng thật của Facebook.
2. **Thay** nút `FloatingContact` cũ (không hiển thị cả hai cùng lúc).
3. Nạp SDK **khi trang rảnh** (`requestIdleCallback`, fallback `setTimeout`) —
   giữ đầy đủ tính năng (lời chào tự động), giảm ảnh hưởng tốc độ.
4. **Fallback duyên dáng**: nếu chưa có Page ID hoặc SDK không nạp được trong
   thời gian chờ → hiển thị lại nút link `FloatingContact` cũ.

## Kiến trúc

### 1. `app.config.ts` (shop config tập trung)

Thêm field:

```ts
messengerPageId: '1208082255719784', // Page ID dạng số cho Facebook Chat Plugin
```

Truy cập qua `useShop()` như các field shop khác.

### 2. `utils/messenger.ts` — helper thuần (unit-tested)

- `hasMessengerChat(pageId: string): boolean` → `true` khi pageId không rỗng.
  Quyết định dùng Chat Plugin hay fallback link.
- `buildChatSdkUrl(locale = 'vi_VN'): string` → URL script SDK
  `https://connect.facebook.net/<locale>/sdk/xfbml.customerchat.js`.

Giữ nguyên `buildMessengerHref` hiện có.

### 3. `components/MessengerChat.client.vue` (mới, chỉ client-side)

Hậu tố `.client` → Nuxt không SSR component này (FB SDK cần trình duyệt).

Hành vi:

- Đọc `useShop()`. `hasChat = hasMessengerChat(shop.messengerPageId)`.
- State `ready` (FB đã nạp) và `failed` (quá thời gian chờ). Hiển thị fallback
  `<FloatingContact />` khi `!hasChat || failed`.
- Template khi `hasChat`: render `<div id="fb-root">` +
  `<div class="fb-customerchat" attribution="biz_inbox" :page_id>` với các thuộc
  tính cấu hình.
- `onMounted`: nếu `hasChat`, đặt `window.fbAsyncInit` (gọi `FB.init` +
  `FB.XFBML.parse`), rồi nạp script SDK **một lần** bên trong `requestIdleCallback`
  (fallback `setTimeout(…, 1)`). Đặt timeout ~5s: nếu `window.FB` chưa sẵn sàng →
  `failed = true` để hiện fallback link.

Thuộc tính cấu hình Chat Plugin:

- `page_id`: `shop.messengerPageId`
- `attribution="biz_inbox"`
- `theme_color="#2e945c"` (màu `hopper` brand, lấy từ `tailwind.config.ts`)
- `logged_in_greeting` / `logged_out_greeting`: tiếng Việt đầy đủ dấu, ví dụ
  "Chào bạn! Cần tư vấn phụ kiện / đế trưng bày in 3D cho đồ chơi DX? Nhắn Ichigo
  Studio nhé."
- `greeting_dialog_display="fade"`

### 4. `layouts/default.vue`

Thay `<FloatingContact />` bằng `<MessengerChat />`.

## Luồng

```
Trang tải
  └─ MessengerChat (client-only) mount
       ├─ hasChat == false  → render <FloatingContact/> (link m.me)  [hiện chưa dùng, vì đã có Page ID]
       └─ hasChat == true
            ├─ render #fb-root + .fb-customerchat
            ├─ requestIdleCallback → nạp SDK vi_VN 1 lần → FB.init + XFBML.parse
            │     └─ FB render bong bóng chat chính thức
            └─ sau ~5s chưa có window.FB → failed=true → fallback <FloatingContact/>
```

## Xử lý lỗi / suy biến

- Chưa cấu hình Page ID → link `m.me` cũ (site luôn có nút liên hệ).
- SDK bị chặn / mạng lỗi → sau timeout hiện link `m.me`.
- Domain chưa whitelist → FB không render bubble; timeout đưa về fallback link.

## Kiểm thử

`tests/messenger.test.ts` (vitest):

- `hasMessengerChat('')` === false; `hasMessengerChat('1208082255719784')` === true.
- `buildChatSdkUrl()` chứa `vi_VN` và `xfbml.customerchat.js`.
- `buildMessengerHref` giữ nguyên hành vi cũ.

Không unit-test component (phụ thuộc SDK bên ngoài); kiểm thử thủ công qua
`yarn dev` sau khi whitelist `localhost:3000`.

## Ngoài phạm vi

- Không thêm cơ chế đồng ý cookie/GDPR ở bước này.
- Không tùy biến lời chào qua config (hardcode trong component); có thể thêm field
  sau nếu cần.
