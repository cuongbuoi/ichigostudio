# Ichigo Studio — Bộ nhận dạng thương hiệu

Bản trình bày đầy đủ (logo, màu, typography, hoạ tiết, giọng điệu, ứng dụng):
mở **[ichigo-studio-brand.html](./ichigo-studio-brand.html)** bằng trình duyệt
(file self-contained, đã nhúng sẵn logo + font, không cần mạng).

Bản công bố trên claude.ai (chia sẻ được):
https://claude.ai/code/artifact/7d881fb0-93d4-4013-8d2e-2c1c4ea1d5df

Đây là tra cứu nhanh cho dev. Tokens đã được áp trong `tailwind.config.ts`.

## Logo
- Logo gồm phù hiệu mũ Kamen Rider Ichigo + chữ "Ichigo Studio". Dùng nguyên khối,
  không tách rời, không vẽ lại, không đổi màu.
- File dùng trên web: `public/logo.png`.
- Trên nền tối: đặt logo trong khối nền sáng (paper) bo góc (xem `components/AppHeader.vue`,
  `components/AppFooter.vue`).
- Khoảng trống tối thiểu quanh logo ≈ chiều cao chữ "STUDIO". Kích thước tối thiểu: ngang 96px.

## Bảng màu

### Màu thương hiệu (từ logo)
| Tên | Hex | Vai trò |
|---|---|---|
| Ichigo Green | `#1B5E3A` | Xanh chiến binh (mũ + chữ "Ichigo"). Màu chủ đạo. |
| Rider Red | `#D62828` | Đỏ mắt kép + chữ "STUDIO". Nhấn, rất tiết chế. |
| Night | `#0E0F0C` | Nền tối chính của website và ấn phẩm. |
| Paper | `#EEF0E8` | Nền sáng, chữ trên nền tối, khối đặt logo. |

### Accent số / UI (đang dùng trên web)
| Tên | Hex | Vai trò |
|---|---|---|
| Hopper Green | `#2E945C` | Accent chính trên web: nút, gạch chân, số liệu. |
| Hopper Bright | `#43B877` | Hover, điểm nhấn nhỏ. |
| FDM Orange | `#CC6A2B` | Năng lượng Zeztz, tag sản phẩm, chi tiết in. Dùng ít. |
| Silver | `#C8CCC4` | Chữ phụ, đường nét kim loại, nhãn. |

> Accent web (`#2E945C`) đã đồng bộ về **đúng tông xanh forest của logo** (hue ~147°),
> chỉ sáng hơn để đạt tương phản WCAG AA với chữ tối trên nền. Logo green gốc `#1B5E3A`
> (token `ichigo`) dùng cho mảng lớn / nền sáng. Tokens trong `tailwind.config.ts`.

## Typography
- **Anton** — display, in hoa, condensed nặng (tiêu đề kiểu poster). Self-host: `assets/fonts/anton-*.woff2`.
- **Oswald** — text & label, weight 300–600 (nội dung, nhãn kỹ thuật). Self-host: `assets/fonts/oswald-*.woff2`.
- KHÔNG dùng Inter hay font có chân (serif). Phần chữ trong logo là wordmark riêng, không thay bằng font khác.

## Hoạ tiết
- Mắt kép lục giác (watermark khung ảnh, dấu hiệu).
- Phù hiệu ZZZ (logo Zeztz cam viền bạc, ở sản phẩm đế trưng bày).
- Speed-line chéo + halftone/hạt phim (chất Showa, đặt trên lớp phủ cố định).

## Giọng điệu & ngôn ngữ
- Tiếng Việt đủ dấu, rõ ràng, không nói quá; rành nghề nhưng thân thiện.
- Katakana điểm xuyết (一号, 変身) cho chất toku, dùng ít.
- KHÔNG dùng dấu gạch ngang dài (—); dùng dấu phẩy hoặc chấm.
- Thuật ngữ chuẩn: đồ chơi DX, phụ kiện in 3D, đế trưng bày, in FDM, phối màu nhựa; tên dòng (Super Sentai, Kamen Rider, Beyblade) và vật phẩm (Capsem, Dualmare Capsem) viết đúng.
- Sản phẩm là phụ kiện in 3D cho đồ chơi DX; đồ chơi trong ảnh là hàng chính hãng, dùng minh hoạ, không kèm theo.
