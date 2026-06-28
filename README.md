# Henshin Studio - Website showcase figure 3D tokusatsu

Nuxt 3 (SSG) + @nuxt/content + Tailwind. Site chỉ trưng bày sản phẩm, liên hệ qua Messenger.

## Phát triển

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # unit test
npm run generate   # build tĩnh -> .output/public
```

## Thêm / sửa sản phẩm

Tạo file mới trong `content/products/<slug>.md` (tên file = slug). Copy frontmatter
từ file có sẵn, đổi nội dung. Ảnh để trong `public/products/<slug>/` rồi trỏ đường
dẫn trong `images` + `cover` (tạm dùng link picsum). Đặt `featured: true` để hiện ở trang chủ.

## Đổi link Messenger / thông tin shop

Sửa `app.config.ts` (mục `shop`): `messengerUrl`, `name`, `tagline`, `facebookUrl`, `area`, `responseTime`.
