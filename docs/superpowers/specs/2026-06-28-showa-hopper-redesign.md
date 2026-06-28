# Redesign UI: "Showa Hopper" — chất Kamen Rider Showa, không AI-slop

Reskin lớp giao diện cho site showcase figure tokusatsu in FDM. GIỮ NGUYÊN: kiến trúc,
routes, @nuxt/content, composables, utils, logic gallery/lightbox/filter, nguồn Messenger.
CHỈ THAY: design tokens, typography, texture, hero, cách style component, nội dung "resin" -> "FDM".

## Design Read & Dials
Hero-poster tokusatsu Showa, nền tối high-contrast. `DESIGN_VARIANCE 8 / MOTION 6 / DENSITY 4`.
**Page Theme Lock: DARK-ONLY** (khoá tối, bỏ toggle sáng/tối — nền sáng phá chất Showa).

## Bảng màu (1 accent duy nhất = hopper green)
Định nghĩa trong `tailwind.config.ts` (thay tokens cũ bone/ink):
- `night`   `#0e0f0c`  — nền chính (off-black, KHÔNG #000)
- `panel`   `#15160f`  — bề mặt nâng nhẹ (hơi ngả xanh-olive tối)
- `panel2`  `#1d1f15`  — card/hover
- `hopper`  `#5c8a24`  (DEFAULT), `hopper-bright` `#76b02f` — accent DUY NHẤT
- `silver`  `#c8ccc4`  — chữ phụ/đường nét kim loại
- `paper`   `#eef0e8`  — chữ chính off-white
Quy tắc: accent dùng dứt khoát (nút, hairline, số liệu nhấn). KHÔNG gradient cầu vồng,
KHÔNG glow tím. Glow xanh hopper rất nhẹ chỉ cho 1-2 điểm nhấn, honor reduced-motion.
Contrast WCAG AA: chữ phụ trên `night` tối thiểu `silver` (#c8ccc4 ~ 11:1) hoặc paper/70+.

## Typography (self-host, không Inter/serif)
Tải woff2 từ fonts.gstatic.com, lưu `assets/fonts/`, khai báo `@font-face` `font-display:swap`.
- **Display (poster heavy condensed):** `Anton` -> dùng cho H1/H2 lớn, ALL CAPS, `tracking-tight`.
- **UI/label/body-emphasis (condensed):** `Oswald` (300-600) -> nav, nhãn kỹ thuật, sub-head.
- **Body đọc dài:** `Oswald` 300/400 ở `leading-relaxed`, hoặc system sans cho đoạn dài.
- **Katakana accent:** để fallback sang font Nhật hệ thống (Hiragino/Yu Gothic) — dùng tiết chế
  (vd `仮面ライダー`, `変身`, `バッタ`) như nhãn nhỏ, KHÔNG rải khắp.
Nếu tải font lỗi: fallback stack `['Anton','Impact','sans-serif']` (display),
`['Oswald','"Arial Narrow"','system-ui','sans-serif']` (ui) — chỉ thêm @font-face cho file thật sự có.
Tailwind: `fontFamily.display`, `fontFamily.sans` (Oswald), bỏ tham chiếu Clash Display/Geist cũ.

## Texture & motif (đồ hoạ thật, không sticker/slop)
- **Grain + scanline overlay:** 1 phần tử `fixed inset-0 z-[60] pointer-events-none` (CHỈ fixed,
  không trên container cuộn). Scanline = `repeating-linear-gradient` ngang rất nhẹ (opacity ~0.04),
  grain = SVG feTurbulence nhẹ. Tắt/giảm khi `prefers-reduced-motion`/`reduced-transparency`.
- **Halftone:** chấm tròn (radial-gradient pattern) làm nền section phụ hoặc viền hero, opacity thấp.
- **Compound-eye motif:** SVG mắt kép Rider (lưới facet lục giác) — dùng làm watermark hero và
  marker section, màu hopper opacity thấp. Đây là SVG trang trí có chủ đích (cho phép vì là motif
  nhận diện, 1 hình hình học sạch), KHÔNG vẽ icon UI tay.
- **Speed-lines:** vài hairline chéo (45deg) màu hopper/silver mảnh ở mép hero/CTA.
- **FDM layer line:** texture vân lớp ngang (repeating-linear-gradient mảnh) dùng tinh tế trên 1
  dải/section nói về quy trình in — tôn chất FDM (điểm độc đáo).

## Cách style từng phần (giữ markup/logic, đổi class)
- **AppHeader:** thanh trên nền `night/80 backdrop-blur`, hairline hopper dưới đáy. Logo = tên shop
  Anton CAPS + nhãn katakana nhỏ `仮面ライダー` cạnh bên (silver, Oswald, tracking). Nav Oswald CAPS
  tracking, hover gạch chân hopper. Bỏ ColorModeToggle. Nav 1 dòng desktop, <=80px.
- **Hero (index):** poster bố cục bất đối xứng — H1 Anton cực lớn CAPS (<=2 dòng), 1 nhãn katakana
  + 1 dòng kỹ thuật nhỏ (Oswald, vd `FDM / PLA+ / SƠN TAY`), subtext <=20 từ. Ảnh figure lớn bên
  cạnh đặt trên khối panel có viền hopper + compound-eye watermark + speed-lines. CTA chính
  "XEM BỘ SƯU TẬP" nút hopper đặc, phụ = Messenger ghost viền silver. Top padding <= pt-24.
- **ProductCard:** card nền `panel`, viền 1px `paper/10`, hover viền hopper + nhấc nhẹ. Ảnh tỉ lệ
  4/5. Nhãn series (Oswald CAPS, hopper) + tên (Anton/Oswald 600). Tỉ lệ silver. Góc: 1 dấu hiệu
  kỹ thuật nhỏ (vd "FDM") — tiết chế, KHÔNG số "01/05" pagination.
- **SeriesFilter:** chip viền silver/20, active = nền hopper chữ night; Oswald CAPS. focus-visible.
- **Detail page:** layout 2 cột. Series = 1 eyebrow Oswald CAPS hopper (đúng 1 eyebrow/ trang).
  Bảng thông số `dl` style "mecha readout": nhãn silver Oswald CAPS, giá trị paper; phân cách bằng
  hairline `paper/10` (KHÔNG border-t+border-b mọi hàng — gom cụm). Nút "HỎI MUA <tên>" hopper.
  Section "CÙNG SERIES" Anton. Mô tả markdown: prose chữ paper/silver.
- **Lightbox:** giữ chức năng; nền `night/95`, nút điều khiển viền silver, focus ring hopper.
  **THÊM focus trap + focus restoration** (yêu cầu a11y còn thiếu): khi mở lưu activeElement,
  focus nút Đóng; Tab vòng trong các nút dialog; khi đóng trả focus về phần tử trigger. client-only.
- **ProductGallery:** ảnh chính trong khung panel viền paper/10; thumbnail active viền hopper.
- **About (gioi-thieu):** editorial tối; section "QUY TRÌNH" 3 bước dùng dải **FDM layer-line**
  làm nền + số bước Anton hopper. Đổi mô tả quy trình sang in **FDM/filament + sơn tay**.
- **Contact (lien-he):** 2 cột, không form; nhãn dl silver CAPS; nút Messenger hopper; link Facebook
  hopper + focus-visible.
- **AppFooter:** nền `night`, hairline hopper trên; tên shop Anton + katakana; chữ phụ `silver`/paper/70
  (đạt AA); © năm.
- **FloatingContact / MessengerButton:** nút hopper đặc (chữ night để tương phản AA), hover
  `hopper-bright`, focus ring. Vẫn lấy link từ `app.config.ts` qua `buildMessengerHref`.

## Nội dung
- Đổi `material` trong cả 5 `content/products/*.md` từ "Resin in 3D" sang dạng FDM, vd
  "In FDM (PLA+), xử lý bề mặt và sơn thủ công". Mô tả nhắc chất in lớp nếu hợp.
- `app.config.ts` tagline có thể chỉnh nhẹ cho chất toku (giữ tiếng Việt có dấu).

## Ràng buộc giữ nguyên (anti-slop + chất lượng)
- ZERO em-dash/en-dash; tiếng Việt ĐỦ DẤU mọi nơi (visible/alt/aria/SEO). Katakana là chủ đích.
- 1 accent (hopper); KHÔNG glow tím, KHÔNG gradient cầu vồng, KHÔNG fake dashboard, KHÔNG scroll cue,
  KHÔNG version label, KHÔNG decorative dots vô nghĩa, KHÔNG locale/time strip.
- Eyebrow (CAPS tracking) <= 1 / 3 section mỗi trang. Katakana nhãn cũng tính là nhãn — tiết chế.
- Motion có lý do (reveal vào viewport, hover), honor `prefers-reduced-motion`; KHÔNG marquee thừa
  (tối đa 1 nếu thật cần). Grain/scanline chỉ trên overlay fixed.
- Ảnh là nhân vật chính, mọi NuxtImg có alt tiếng Việt; hero ảnh preload.
- Responsive 1/2/3 cột; nav mobile mở/đóng.
- `npm test` (8) xanh; `nuxt generate` ra đủ 4 trang + 5 route SP.

## Definition of Done (redesign)
- [ ] Dark-only nhất quán, không section lệch theme; toggle sáng/tối đã bỏ.
- [ ] Anton + Oswald hoạt động (self-host) hoặc fallback condensed hợp lý; không Inter/serif.
- [ ] Grain/scanline + compound-eye motif + speed-lines + hopper accent hiện rõ "chất toku".
- [ ] FDM phản ánh trong nội dung 5 SP + section quy trình.
- [ ] Lightbox có focus trap + restoration.
- [ ] Pre-flight: zero em-dash, đủ dấu tiếng Việt, contrast AA, 1 accent.
- [ ] build + test pass; screenshot xác nhận không slop.
