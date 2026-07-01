# Ichigo Studio - Website showcase figure 3D tokusatsu

Nuxt 3 (SSG) + @nuxt/content + Tailwind. Site chỉ trưng bày sản phẩm, liên hệ qua Messenger.

## Phát triển

```bash
yarn               # cài dependencies
yarn dev           # http://localhost:3000
yarn test          # unit test
yarn generate      # build tĩnh -> .output/public
```

## Thêm / sửa sản phẩm

Tạo file mới trong `content/products/<slug>.md` (tên file = slug). Copy frontmatter
từ file có sẵn, đổi nội dung. Ảnh để trong `public/products/<slug>/` rồi trỏ đường
dẫn trong `images` + `cover` (tạm dùng link picsum). Đặt `featured: true` để hiện ở trang chủ.

## Đổi link Messenger / thông tin shop

Sửa `app.config.ts` (mục `shop`): `messengerUrl`, `name`, `tagline`, `facebookUrl`, `area`, `responseTime`.

## Dùng ảnh thật (khi có ảnh sản phẩm)

1. Tạo thư mục `public/products/<slug>/` và đặt ảnh vào đó.
2. Cập nhật frontmatter trong `content/products/<slug>.md`: điền đường dẫn vào `cover` và `images` (ví dụ: `/products/kamen-rider-w/cover.jpg`).
3. Mở `app.config.ts`, đổi `hasPhotos: false` thành `hasPhotos: true`.

Khi `hasPhotos: false` (mặc định), trang hiển thị khung ảnh placeholder on-brand (`FigurePlaceholder`) thay vì ảnh thật.
