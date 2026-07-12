# Ichigo Studio — Phase 2: Orders & Customers Design

Date: 2026-07-12
Status: Approved (design)

## Bối cảnh

Phase 0/1 đã xong: API (Cloudflare Workers + Hono + D1 + Drizzle) với products
(giá `price` integer VND nullable), users (1 admin), auth JWT; admin (Vue 3 +
Vite + shadcn-vue) có dashboard sidebar + CMS sản phẩm. Shop bán đồ in 3D
tokusatsu qua Messenger.

Phase 2 thêm **Đơn hàng & Khách hàng** như một **CRM nội bộ nhập tay**: chủ shop
chat Messenger xong tự tạo đơn trong admin. KHÔNG có checkout công khai.

## Quyết định đã chốt

- Luồng đơn: **admin tự nhập** (không checkout công khai).
- Trạng thái đơn: **5 bước + hủy** — `pending` (Chờ xác nhận) → `in_progress`
  (Đang làm) → `ready` (Xong, chờ giao) → `delivered` (Đã giao) → `completed`
  (Hoàn tất); cộng `cancelled` (Đã hủy).
- Tiền theo dõi: **tiền cọc**, **trạng thái thanh toán**, **giảm giá**. KHÔNG có
  phí ship.
- Khách hàng: **bảng riêng**, đơn tham chiếu; xem lịch sử đơn theo khách.
- Repo: mở rộng `ichigo-studio-api` + `ichigo-studio-admin` hiện có. Local-first
  (không provision cloud).

## Mô hình dữ liệu (D1 — Drizzle)

**customers**
- `id` text PK (uuid)
- `name` text not null
- `phone` text
- `social` text (Facebook/Zalo)
- `address` text
- `note` text
- `created_at` integer (epoch ms)

**orders**
- `id` text PK (uuid)
- `code` text not null unique — mã hiển thị `DH-0001`
- `customer_id` text FK → customers.id, on delete set null
- `customer_name` text — snapshot tại thời điểm đặt
- `customer_phone` text — snapshot
- `status` text not null default `pending`
  (`pending|in_progress|ready|delivered|completed|cancelled`)
- `payment_status` text not null default `unpaid` (`unpaid|deposit|paid`)
- `discount` integer not null default 0 (VND)
- `deposit` integer not null default 0 (VND)
- `note` text
- `created_at` integer, `updated_at` integer (epoch ms)

**order_items**
- `id` text PK (uuid)
- `order_id` text FK → orders.id, on delete cascade
- `product_id` text FK → products.id, on delete set null (nullable)
- `title` text not null — snapshot tên SP
- `unit_price` integer not null — snapshot giá VND (admin nhập tay nếu SP giá null)
- `qty` integer not null (≥ 1)

**Snapshot** là điểm cốt lõi: `order_items.title/unit_price` và
`orders.customer_name/phone` chụp tại thời điểm đặt để đơn cũ không sai khi
sản phẩm/khách bị sửa/xóa.

## Tính tiền (suy ra, không lưu thừa)

- `subtotal = Σ(unit_price × qty)`
- `total = max(0, subtotal − discount)`
- `remaining = payment_status === 'paid' ? 0 : max(0, total − deposit)`

Tính ở tầng API khi trả chi tiết/list (và lặp lại ở admin để hiển thị realtime
trong form). Không lưu subtotal/total vào DB.

## Sinh mã đơn `code`

Khi tạo: `DH-` + số thứ tự 4 chữ số dựa trên `COUNT(*)` đơn hiện có + 1
(`DH-0001`, `DH-0002`...). Đủ cho một admin, lượng đơn thấp; unique constraint
bảo vệ. (Không cần chống đua vì single-admin.)

## API surface (Phase 2 — đều yêu cầu auth JWT)

Mount trong `src/index.ts` cùng `/auth`, `/products`, `/public`, `/uploads`.

| Method | Path | Việc |
|---|---|---|
| GET | `/customers` | list; query `?q=` tìm theo name/phone |
| GET | `/customers/:id` | chi tiết + `orders` (lịch sử đơn của khách) |
| POST | `/customers` | tạo |
| PATCH | `/customers/:id` | sửa |
| DELETE | `/customers/:id` | xóa (đơn liên quan set `customer_id=null`, giữ snapshot) |
| GET | `/orders` | list; query `?status=&payment_status=`; mỗi đơn kèm `subtotal/total/remaining` tính sẵn |
| GET | `/orders/:id` | chi tiết: order + `items` + `customer` + tính tiền |
| POST | `/orders` | tạo: sinh `code`, snapshot title/unit_price/khách; items ≥ 1 |
| PATCH | `/orders/:id` | sửa thông tin/items/discount/deposit/payment_status (thay-all items như product images) |
| PATCH | `/orders/:id/status` | đổi riêng `status` (thao tác nhanh) |
| DELETE | `/orders/:id` | xóa (cascade items) |

- Validation: zod + `@hono/zod-validator`. `discount/deposit/unit_price` integer ≥ 0; `qty` integer ≥ 1; `status`/`payment_status` enum.
- PATCH items: thay-toàn-bộ (xóa cũ, chèn mới) như chiến lược `replaceImages` của products, tránh bug `.partial()` trên field có default (bài học Phase 1).

## Admin UI (Vue 3 + shadcn-vue)

- **Sidebar**: gỡ "Đơn hàng"/"Marketing"... khỏi mục "Sắp có" cho phù hợp — cụ thể
  bật **Đơn hàng** và thêm **Khách hàng** vào nhóm "Quản lý"; giữ Tồn kho +
  Marketing ở "Sắp có".
- **Routes**: `/khach-hang`, `/khach-hang/moi`, `/khach-hang/:id`;
  `/don-hang`, `/don-hang/moi`, `/don-hang/:id`. Đều dưới `DashboardLayout` (auth).
- **Khách hàng**:
  - List: bảng (tên/SĐT/social) + ô tìm kiếm; nút tạo.
  - Editor (tạo/sửa): form name/phone/social/address/note.
  - Chi tiết: thông tin khách + bảng lịch sử đơn (code/tổng/trạng thái/ngày).
- **Đơn hàng**:
  - List: bảng code / khách / tổng tiền (format) / trạng thái (Badge màu theo
    trạng thái) / thanh toán / ngày; filter theo trạng thái; nút tạo.
  - Editor (tạo/sửa):
    - Chọn khách: combobox chọn khách hiện có + nút "＋ Khách mới" mở dialog tạo
      nhanh (POST /customers) rồi tự chọn.
    - Dòng sản phẩm: chọn SP (tự điền `title` + `unit_price` snapshot từ
      `price`; nếu null để admin nhập), sửa `qty` & `unit_price`; thêm/xóa dòng.
    - discount, deposit, payment_status (Select), ghi chú.
    - Panel tóm tắt tính tiền realtime: subtotal / giảm / tổng / cọc / còn lại.
  - Chi tiết: xem đơn đầy đủ + đổi nhanh `status` (Select 5 bước) và
    `payment_status`.
- **Tổng quan**: thêm 2 thẻ — *Đơn chờ xử lý* (đếm status ∉ {completed,cancelled})
  và *Doanh thu* (Σ total các đơn `completed`).
- Dùng `formatPrice` sẵn có; state qua Pinia/vue-query như Phase 1; copy tiếng
  Việt có dấu, không em-dash.

## Chia sẻ type
Như Phase 1: type nhỏ ở admin (`orders.ts`, `customers.ts`) tương ứng shape API;
zod ở API là nguồn chân lý. Không workspace.

## Ngoài phạm vi Phase 2
- Trừ tồn kho (Phase 3) — đơn KHÔNG thay đổi số lượng kho.
- Checkout công khai trên storefront; thanh toán online; in hóa đơn/PDF.
- Migrate store sang SSR.

## Testing
- API: vitest — customers CRUD; orders tạo (sinh code, snapshot, tính tiền),
  cập nhật items thay-all, đổi status, filter list; xóa cascade; DELETE khách
  set null. Kiểm tra tính tiền (subtotal/total/remaining) và qty ≥ 1 / tiền ≥ 0.
- Admin: vitest — helper tính tiền client, lib orders/customers (endpoint/query),
  schema zod form.
