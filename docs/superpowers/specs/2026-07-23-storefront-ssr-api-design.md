# Ichigo Studio — Storefront SSR from API Design

Date: 2026-07-23
Status: Approved (design)

## Bối cảnh

Storefront (`ichigo-studio-store`, Nuxt 3) hiện là SSG, đọc sản phẩm từ Markdown
qua `@nuxt/content` (`queryCollection('products')`, `<ContentRenderer>`). Phase
0-3 đã dựng API (`ichigo-studio-api`, CF Workers + D1) + admin quản sản phẩm; API
expose `/public/products` và `/public/products/:slug` (không auth, chỉ
`published`). Giờ store cần hiển thị sản phẩm quản trong admin thay vì Markdown
tĩnh.

## Quyết định đã chốt

- **SSR runtime**: store fetch `/public/products` mỗi request (cập nhật tức thì
  khi sửa trong admin, không cần build lại).
- **Bỏ `@nuxt/content`** cho sản phẩm; render mô tả (`bodyMd`) bằng
  **`markdown-it`**.
- **Ảnh theo từng sản phẩm** (thay cờ toàn cục `shop.hasPhotos`): có ảnh → hiện
  ảnh thật; không → `FigurePlaceholder`.
- **`price` (number VND | null)** thay `priceRef` (string); null = "Liên hệ".
- Local-first: store dev fetch API local (`http://localhost:8787`). Deploy CF
  Pages SSR để sau.

## API hình dạng dữ liệu (đã có)

`GET /public/products` → `{ items: Product[] }`, mỗi item:
`{ id, slug, title, series, material, price (int|null), cover (string|null),
featured (bool), order (int), status, bodyMd (string|null), images:
{ url, sort }[] (đã sort) }` — chỉ trả `status='published'`, sort theo `order`.
`GET /public/products/:slug` → một product (kèm `images`) hoặc 404 nếu là draft/
không tồn tại.

## Cấu hình Nuxt

- `nuxt.config.ts`:
  - Giữ `ssr: true` (mặc định).
  - **Bỏ** `nitro.prerender.routes` phần route sản phẩm (`/san-pham/<slug>`) và
    logic `readdirSync` đọc `content/products/` (không còn nguồn Markdown). Có
    thể giữ prerender cho các trang tĩnh thuần (`/gioi-thieu`, `/lien-he`) nếu
    muốn, nhưng đơn giản nhất: bỏ prerender, để SSR toàn bộ.
  - Thêm `runtimeConfig.public.apiBase` mặc định `http://localhost:8787`, override
    bằng env `NUXT_PUBLIC_API_BASE`.
  - Gỡ module `@nuxt/content` khỏi `modules` (và `content.config.ts` thôi tác
    dụng — xóa hoặc để lại vô hại; ưu tiên xóa cho sạch).
  - `image.domains`: thêm host phục vụ ảnh R2/`/media` nếu dùng `@nuxt/image` với
    ảnh remote (khi deploy). Local dev ảnh từ `localhost:8787/media/...`.
- Deploy (ngoài phạm vi làm ngay, ghi chú): Nitro `cloudflare-pages` preset để
  SSR trên CF Pages Functions; set `NUXT_PUBLIC_API_BASE` = URL API production.

## Tầng dữ liệu

- **`types/product.ts`**: `ProductMeta` cập nhật:
  `{ id, slug, title, series, material, price: number | null, cover: string,
  images: string[], featured: boolean, order: number }`. Thêm type chi tiết
  `Product = ProductMeta & { bodyMd?: string | null }`. Bỏ
  `scale/height/capacity/priceRef/description`.
- **`utils/products.ts`**: giữ nguyên các hàm thuần (`sortByOrder`,
  `getFeatured`, `getSeriesList`, `getRelated`, `filterBySeries`) — vẫn dựa vào
  `order/series/featured/slug`. Thêm hàm thuần `mapApiProduct(apiItem)` → `Product`
  (map `images:[{url}]`→`string[]`, `cover` = apiItem.cover ?? images[0] ?? '')
  và giữ nó unit-test được. Thêm `formatPrice(price: number|null): string`
  (`price==null` → "Liên hệ", ngược lại `price.toLocaleString('vi-VN') + ' ₫'`).
- **`composables/useProducts.ts`**: thay `queryCollection` bằng
  `useFetch(`${apiBase}/public/products`)` (qua `useRuntimeConfig().public.apiBase`),
  map mỗi item bằng `mapApiProduct`, rồi `sortByOrder`. Giữ API trả về của
  composable: `{ all, featured, seriesList, getBySlug, related }`.
- **`pages/san-pham/[slug].vue`**: thay query @nuxt/content bằng
  `useFetch(`${apiBase}/public/products/${slug}`)` → `mapApiProduct` + `bodyMd`.
  Nếu fetch lỗi/404 → `createError({ statusCode: 404 })`. Render `bodyMd` bằng
  `markdown-it`: `const html = computed(() => md.render(product.bodyMd ?? ''))`,
  hiển thị `<div class="prose ..." v-html="html" />` (thay `<ContentRenderer>`).
  Nội dung do chủ shop tự nhập (tin cậy); markdown-it mặc định (không bật
  `html:true`) để an toàn cơ bản.

## Ảnh / placeholder

- Bỏ phụ thuộc `shop.hasPhotos` cho quyết định hiển thị ảnh. Trong `ProductCard`,
  `ProductGallery` (và `Lightbox` qua prop): hiện ảnh thật khi
  `product.images?.length > 0`, ngược lại `FigurePlaceholder`. `cover`/`images`
  là URL tuyệt đối từ API (`/media/...`).
- `shop.hasPhotos` trong `app.config.ts` có thể giữ lại cho mục đích khác nhưng
  không còn điều khiển product images; ưu tiên gỡ các nhánh `v-if="shop.hasPhotos"`
  ở các component sản phẩm, thay bằng kiểm tra `images.length`.

## Giá hiển thị

- Mọi nơi hiện `priceRef` (vd `pages/san-pham/[slug].vue` dòng giá) đổi sang
  `formatPrice(product.price)`.

## Xử lý lỗi / rỗng

- `useProducts`: nếu fetch lỗi (API down), `all` = `[]` và hiển thị trạng thái
  rỗng thân thiện ("Chưa có sản phẩm" / thông báo tạm) thay vì crash. `useFetch`
  trả `error`; component hiển thị fallback.
- Trang chi tiết: 404 khi không tìm thấy slug.

## Ngoài phạm vi

- Deploy store SSR lên Cloudflare (chỉ ghi chú preset + env).
- Xóa toàn bộ `content/products/*.md` (không còn dùng) — có thể dọn ở bước cuối
  hoặc để lại; không ảnh hưởng runtime.
- Cache/ISR ở edge (có thể thêm sau).
- Cart/checkout (vẫn Messenger).

## Testing

- Unit (vitest, đã có hạ tầng ở store): `mapApiProduct` (map images/cover/price),
  `formatPrice`; giữ test hiện có cho `utils/products` (sortByOrder/getFeatured/
  getSeriesList/getRelated) — cập nhật fixtures sang shape mới (price thay
  priceRef).
- Component (nếu khả thi): `ProductCard` hiện ảnh khi có `images`, placeholder khi
  không.
- Kiểm thử thủ công: chạy API local (đã seed + có sản phẩm published) + store
  `yarn dev`, xem trang chủ/`/san-pham`/chi tiết hiển thị sản phẩm từ API, giá
  đúng, mô tả markdown render, ảnh/placeholder đúng.
