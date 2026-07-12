# Ichigo Studio — Phase 3: Inventory & Production Design

Date: 2026-07-12
Status: Approved (design)

## Bối cảnh

Phase 0-2 xong: API (Workers + Hono + D1 + Drizzle) với products (giá `price`
integer VND), customers (name/phone/facebook/tiktok/address/note), orders +
order_items (đơn nhập tay, 5+1 trạng thái, snapshot). Admin (Vue 3 + shadcn-vue)
có dashboard, CMS sản phẩm, đơn hàng, khách hàng. Đơn hàng hiện KHÔNG đụng kho.

Phase 3 thêm **Tồn kho sản phẩm (in sẵn) + Lệnh sản xuất/in + tự trừ kho theo
đơn**. Xưởng in 3D theo đơn.

## Quyết định đã chốt

- Phạm vi: tồn kho sản phẩm + lệnh in (print jobs) + tự trừ kho theo đơn.
  KHÔNG quản tồn nguyên liệu filament.
- Trừ kho tự động khi đơn vào **`completed`** (Hoàn tất); hoàn lại nếu đơn rời
  `completed` sau khi đã trừ (vd bị hủy). **Xóa** đơn đã-completed KHÔNG cộng lại
  kho (hàng coi như đã bán).
- Tồn kho là **số nguyên `stock`** trên products (không sổ nhật ký). Cho phép
  **âm** (âm = thiếu, cần in).
- Mở rộng `ichigo-studio-api` + `ichigo-studio-admin`. Local-first.

## Mô hình dữ liệu (bổ sung — migration ADDITIVE, không reset)

**products** — thêm cột:
- `stock` integer not null default 0 — tồn hiện có, cho phép âm.

**orders** — thêm cột:
- `stock_deducted` integer (bool) not null default 0 — đã trừ kho cho đơn này chưa (chống trừ trùng + cho phép hoàn).

**print_jobs** (bảng mới):
- `id` text PK (uuid)
- `product_id` text FK → products.id, on delete set null (nullable)
- `title` text not null — snapshot tên SP lúc tạo lệnh
- `qty` integer not null (≥ 1)
- `status` text not null default `pending` (`pending|printing|done|cancelled`)
- `stocked` integer (bool) not null default 0 — đã cộng qty vào stock chưa
- `order_id` text FK → orders.id, on delete set null (nullable) — in cho đơn nào (tùy chọn)
- `note` text
- `created_at` integer, `updated_at` integer (epoch ms)

Tất cả là thêm cột/bảng → drizzle sinh migration tăng dần (non-interactive),
áp thẳng vào D1 local bằng `yarn db:migrate:local` (không cần reset). Test tự áp
qua `applyD1Migrations`.

## Luồng tồn kho (idempotent bằng cờ)

**Lệnh in** (`print_jobs.stocked`):
- PATCH status → `done` khi `stocked=false`: `product.stock += qty`, `stocked=true`.
- PATCH status rời `done` (sang pending/printing/cancelled) khi `stocked=true`:
  `product.stock −= qty`, `stocked=false`.
- DELETE lệnh khi `stocked=true`: `product.stock −= qty`.
- Chỉ tác động khi `product_id` không null.

**Đơn hàng** (`orders.stock_deducted`), trong CẢ `PATCH /orders/:id` và
`PATCH /orders/:id/status`:
- status mới = `completed` & `stock_deducted=false`: mỗi order_item có
  `product_id` → `product.stock −= qty`; `stock_deducted=true`.
- status cũ = `completed` (đã trừ) & status mới ≠ `completed`: hoàn
  `product.stock += qty` mỗi dòng; `stock_deducted=false`.
- DELETE đơn: KHÔNG đụng kho (kể cả đơn đã trừ).

In-theo-đơn nhất quán: lệnh in done (+kho) → đơn completed (−kho) = net 0.

Không có phép tính suy ra phức tạp; `stock` là số nguyên lưu sẵn, sửa trực tiếp
bởi các sự kiện trên + chỉnh tay ở product editor.

## API surface (Phase 3 — đều auth JWT)

**Sản phẩm** (sửa `src/schemas/product.ts`, không thêm route mới):
- `stock`: zod input `z.number().int().default(0)`, patch optional. Cho phép âm
  (không `.nonnegative()`). GET list/detail trả `stock`.
- Product create/patch nhận `stock`; DB lưu.

**Lệnh in** — router mới `src/routes/print-jobs.ts`, mount `/print-jobs`:
| Method | Path | Việc |
|---|---|---|
| GET | `/print-jobs` | list (`?status=`), sort mới nhất; kèm `title` |
| GET | `/print-jobs/:id` | chi tiết |
| POST | `/print-jobs` | tạo: verify SP tồn tại (400 nếu không), snapshot `title`, status default pending, stocked=false |
| PATCH | `/print-jobs/:id` | sửa qty/note/order_id/status; áp logic cộng/trừ kho theo `stocked` khi status đổi qua/khỏi `done` |
| PATCH | `/print-jobs/:id/status` | đổi nhanh status (cùng logic kho) |
| DELETE | `/print-jobs/:id` | xóa; nếu `stocked` → `stock −= qty` |

- Zod: `printJobInputSchema` (productId required, qty ≥1, status enum, orderId optional nullable, note optional); `printJobPatchSchema` (all optional, no defaults — bài học Phase 1); `printJobStatusSchema` ({status}). `PRINT_STATUSES`.
- Helper `applyStockForJobTransition(db, job, newStatus)` gói logic cộng/trừ để dùng chung PATCH + status route.

**Đơn hàng** (sửa `src/routes/orders.ts`):
- Thêm `stock_deducted` xử lý trong cả hai handler đổi trạng thái. Helper
  `applyStockForOrderStatus(db, order, newStatus)` gói việc trừ/hoàn kho + cờ.
- `loadOrderDetail`/create không đổi hành vi tiền; chỉ status transitions đụng kho.

## Admin UI (Vue 3 + shadcn-vue)

- **Sidebar**: gỡ "Tồn kho" khỏi nhóm "Sắp có"; thêm **"Sản xuất"** (icon Boxes)
  vào nhóm "Quản lý". Giữ "Marketing" ở "Sắp có". Mở rộng active-detection +
  title cho route mới.
- **Routes** dưới DashboardLayout: `/san-xuat`, `/san-xuat/moi`, `/san-xuat/:id`.
- **Sản phẩm**:
  - Editor: thêm ô **Tồn kho** (`stock`, number, chỉnh tay; cho phép âm) trong
    Card "Hiển thị" hoặc "Thông tin cơ bản".
  - List: thêm cột **Tồn** — đỏ nếu `≤ 0`, vàng nếu `≤ LOW_STOCK` (hằng số nhỏ,
    vd 3), thường nếu hơn.
- **Sản xuất** (print jobs):
  - List: filter theo trạng thái; bảng SP(title) / SL / trạng thái (Badge) /
    đơn liên kết / ngày; click → chi tiết; nút Tạo; xóa.
  - Editor (tạo/sửa): chọn SP (Select → tự điền title), SL, trạng thái (Select),
    gắn đơn (Select đơn, tùy chọn), ghi chú; lưu → create/update.
  - Chi tiết: xem + đổi nhanh trạng thái (Select 4 trạng thái) — kho tự cập nhật
    ở server.
  - Nhãn trạng thái: Chờ in / Đang in / Đã in xong / Đã hủy.
- **Tổng quan**: thêm thẻ **"SP sắp hết"** = đếm SP có `stock ≤ LOW_STOCK`
  (dùng products list đã có).
- Lib: `src/lib/print-jobs.ts` (types + fns + labels/variants + PRINT_STATUSES),
  `src/lib/product-schema.ts` + `src/lib/products.ts` thêm `stock`. Copy có dấu,
  không em-dash; brand light tokens; vue-query/Pinia như trước.

## Chia sẻ type
Như các phase trước: type nhỏ ở admin tương ứng shape API; zod ở API là chuẩn.

## Ngoài phạm vi Phase 3
Tồn nguyên liệu (filament PLA/TPU); sổ nhật ký kho (stock movements); dự báo/tự
động lên lệnh in; checkout công khai; migrate store SSR (Phase riêng).

## Testing
- API: vitest — product create/patch lưu `stock` (kể cả âm); print jobs CRUD;
  print job → done cộng kho, rời done/xóa trừ lại (idempotent, không trùng);
  order → completed trừ kho mỗi dòng + cờ, rời completed hoàn kho, xóa completed
  KHÔNG cộng lại; job/đơn không có product_id không làm crash.
- Admin: vitest — lib print-jobs (endpoint/query), product-schema có stock,
  helper phân loại cảnh báo tồn (nếu tách hàm).
