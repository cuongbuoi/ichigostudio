export default defineEventHandler((event) => {
  const site = useRuntimeConfig(event).public.siteUrl
  setHeader(event, 'content-type', 'text/plain; charset=utf-8')
  setHeader(event, 'cache-control', 'public, max-age=86400')
  // Chuẩn llms.txt: giúp các trợ lý AI hiểu nhanh shop là ai, bán gì, link quan trọng.
  return `# Ichigo Studio

> Ichigo Studio là shop Việt Nam chuyên IN 3D FDM (nhựa PLA+) các phụ kiện, đế trưng bày (display stand) và prop custom cho đồ chơi tokusatsu DX: Kamen Rider, Super Sentai và các dòng liên quan. Nhận in theo yêu cầu (made-to-order), phối màu trực tiếp bằng nhựa (không sơn), giao hàng toàn quốc. Tư vấn và đặt hàng qua Facebook Messenger.

## Thông tin chính
- Lĩnh vực: in 3D FDM phụ kiện đồ chơi tokusatsu (Kamen Rider / Super Sentai / DX).
- Chất liệu: nhựa PLA+, phối màu bằng nhựa (bền màu, không tróc như sơn).
- Hình thức: đặt theo yêu cầu, cọc 50% hoặc thanh toán đủ, ship toàn quốc.
- Đồ chơi DX trong ảnh chỉ để minh họa cách dùng, KHÔNG bán kèm.

## Trang quan trọng
- [Bộ sưu tập sản phẩm](${site}/san-pham)
- [Blog / hướng dẫn](${site}/blog)
- [Feedback khách hàng](${site}/feedback)
- [Liên hệ](${site}/lien-he)
- [Sitemap](${site}/sitemap.xml)
`
})
