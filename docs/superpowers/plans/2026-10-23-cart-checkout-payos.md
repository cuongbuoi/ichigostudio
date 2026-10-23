# Giỏ hàng + thanh toán chuyển khoản (VietQR + SePay) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Khách tự đặt hàng trên ichigostudio.vn: bỏ giỏ → điền thông tin → quét VietQR chuyển khoản 100% tiền hàng vào TPBank của shop → SePay báo tiền về → đơn tự vào admin (`source='web'`, đã thanh toán) + Web Push cho shop; khách xem lại đơn qua localStorage hoặc tra cứu mã đơn + SĐT.

> **Đổi 2026-10-23:** payOS không hỗ trợ TPBank → thay bằng **VietQR (img.vietqr.io) + SePay webhook** theo dõi tài khoản TPBank. Mọi chỗ "payOS" cũ trong spec hiểu là "SePay".

**Architecture:** API (Hono/D1) có bảng `payments` dùng chung cho mọi khoản thu chuyển khoản (giỏ hàng bây giờ, đặt in STL sau). Mỗi checkout có **mã thanh toán** `ICG` + 8 chữ số in trong nội dung chuyển khoản. SePay gọi webhook khi có tiền vào; khớp mã + đủ tiền mới tạo `orders` với `orders.id = payments.id` để idempotent theo khóa chính. Store (Nuxt SSR) giữ giỏ ở localStorage, server luôn tính lại giá. Admin thêm nhãn nguồn Web, cờ đơn test, card cấu hình bán hàng web.

**Tech Stack:** Cloudflare Workers + Hono 4 + Drizzle (D1) + zod 4 + vitest-pool-workers (API) · Vue 3 + shadcn-vue + vue-query (admin) · Nuxt 3 SSR + Tailwind 3 + vitest (store) · SePay webhook (xác thực `Authorization: Apikey <key>`) · ảnh QR `img.vietqr.io` (giống `admin/src/lib/vietqr.ts`).

**Spec:** `ichigo-studio-store/docs/superpowers/specs/2026-10-23-cart-checkout-payos-design.md`

Đường dẫn trong plan tương đối theo repo ghi ở đầu mỗi task: `api/` = `ichigo-studio-api`, `admin/` = `ichigo-studio-admin`, `store/` = `ichigo-studio-store` (cùng nằm trong `/Users/assmin/Documents/Projects/ichigo-studio/`).

## Global Constraints

- Thanh toán **100% tiền hàng**; **phí ship không thu online**, khách trả khi nhận. Mọi màn giỏ/checkout/cảm ơn phải ghi: `Phí ship bạn trả khi nhận hàng.`
- Không có tùy chọn SP. SP `price = null` (hoặc ≤ 0) không bỏ giỏ được; nút Messenger "Hỏi mua" giữ nguyên ở mọi nơi.
- Server luôn tự tính tiền từ DB, bỏ qua mọi giá client gửi.
- Không đánh dấu đã trả nếu webhook SePay sai API key.
- Chuyển khoản **không chứa mã `ICG…`** (khách Messenger chuyển tiền bình thường) bị webhook **bỏ qua im lặng**: không tạo bản ghi, không push.
- Copy storefront: tiếng Việt có dấu đầy đủ, **không em-dash (—)**, không nhắc "cọc".
- Store: dùng `yarn`; token màu Tailwind (`night`, `panel`, `hopper`...), font `font-display`/`font-sans`; không hex thô.
- API: DB prod duy nhất (`yarn dev` chạm prod). Migration **viết tay** + thêm entry `drizzle/meta/_journal.json`; áp `yarn db:migrate` **trước** khi deploy code. Trước khi đánh số migration, `ls drizzle/` vì luồng song song có thể đã chiếm số.
- Mã thanh toán: `ICG` + **8 chữ số** (khớp mẫu SePay: tiền tố `ICG`, hậu tố số 6–8 ký tự). QR = `https://img.vietqr.io/image/${BANK_BIN}-${BANK_ACCOUNT}-compact2.png?amount=<amount>&addInfo=<code>&accountName=<urlencoded BANK_ACCOUNT_NAME>`. Hạn hiển thị QR **15 phút** (chỉ là UI; tiền về sau hạn vẫn tạo đơn).
- Secret mới (optional trong `Bindings`): `SEPAY_WEBHOOK_KEY`. Var mới trong `wrangler.jsonc`: `BANK_BIN="970423"`, `BANK_ACCOUNT="28262686686"`, `BANK_ACCOUNT_NAME="TRUONG QUOC CUONG"`, `BANK_NAME="TPBank"`, `STORE_URL="https://ichigostudio.vn"`. Binding rate limit optional: `PUBLIC_LIMITER`. "Đã cấu hình thanh toán" = có `SEPAY_WEBHOOK_KEY` và đủ 3 biến `BANK_BIN/BANK_ACCOUNT/BANK_ACCOUNT_NAME`.
- Cả ba repo đang có nhiều thay đổi chưa commit từ trước. Commit bằng `git add <đường dẫn cụ thể>`, không `git add -A`/`.`. File đã bẩn từ trước mà task phải sửa thì commit cả file (chấp nhận gộp, ghi chú trong commit message).
- Không deploy và không áp migration prod khi chưa hỏi chủ shop (Task 13).

## Review Focus

1. **SePay gửi lại cùng giao dịch (retry tới 7 lần)** → đúng **một** đơn, một push. Test ở Task 4 (`markPaid` gọi 2 lần) và Task 6 (cùng `id` SePay 2 lần).
2. **Trả tiền sau khi QR hết hạn** → vẫn tạo đơn. Test ở Task 4 và Task 6.
3. **SP đổi giá / bị ẩn giữa lúc bỏ giỏ và đặt** → dùng giá DB; SP không còn bán thì trả 409 + danh sách id, store báo khách. Test ở Task 3 và Task 5.
4. **SĐT nhiều dạng** (`+84 912 345 678`, `0912.345.678`, `84912345678`) → cùng một khách, tra cứu vẫn khớp. Test ở Task 2 và Task 7.
5. **Nội dung chuyển khoản bị ngân hàng chèn thêm chữ / viết thường** (`"ck icg12345678 nguyen van a"`, `code` của SePay null) → vẫn nhận ra mã (regex không phân biệt hoa thường trên `content`); chuyển khoản thường không có mã → bỏ qua. Test ở Task 2 và Task 6.

---

## Phần A — API (`ichigo-studio-api`)

### Task 1: Migration + schema (payments, orders.is_test, orders.shipping_address, source 'web', settings checkout)

**Files:**
- Create: `api/drizzle/0025_payments_checkout.sql` (đổi số nếu đã bị chiếm)
- Modify: `api/drizzle/meta/_journal.json`, `api/src/db/schema.ts`, `api/src/schemas/order.ts`, `api/src/schemas/settings.ts`, `api/src/index.ts` (Bindings), `api/wrangler.jsonc`
- Test: `api/tests/payments-schema.test.ts`

**Interfaces:**
- Produces: bảng drizzle `payments`; cột `orders.isTest: boolean`, `orders.shippingAddress: string | null`; `ORDER_SOURCES` có `'web'`; `checkoutSettingsSchema`, `CHECKOUT_SETTINGS_DEFAULT`, type `CheckoutSettings = { enabled: boolean; testKey: string }`; `Bindings` thêm `SEPAY_WEBHOOK_KEY?`, `BANK_BIN?`, `BANK_ACCOUNT?`, `BANK_ACCOUNT_NAME?`, `BANK_NAME?`, `STORE_URL?`, `PUBLIC_LIMITER?: RateLimit`.

`payments` (snake_case trong SQL):

| cột | kiểu |
|---|---|
| `id` | text PK (uuid; cũng là `orders.id` khi đã tạo đơn) |
| `kind` | text enum `cart` \| `print_quote` \| `unknown` |
| `ref_id` | text null (id `quote_jobs` sau này) |
| `payment_code` | text not null, UNIQUE (`ICG` + 8 chữ số, viết hoa) |
| `amount` | integer not null |
| `status` | text enum `pending` \| `paid` \| `expired` \| `cancelled` \| `needs_review`, default `pending` |
| `is_test` | integer boolean default false |
| `payload` | text json `CartPayload` (null cho `unknown`) |
| `provider_tx_id` | text null, UNIQUE (id giao dịch SePay, chống xử lý trùng) |
| `reference` | text null (`referenceCode` ngân hàng) |
| `raw_webhook` | text json null |
| `expires_at`, `paid_at` | integer null (epoch ms) |
| `order_id` | text FK orders set null |
| `created_at`, `updated_at` | integer not null |

`CartPayload = { items: { productId: string; title: string; unitPrice: number; qty: number }[]; customer: { name: string; phone: string; address: string; note: string | null } }`

`checkoutSettingsSchema = z.object({ enabled: z.boolean(), testKey: z.union([z.literal(''), z.string().min(16).max(64)]) })`, default `{ enabled: false, testKey: '' }`.

`wrangler.jsonc`: thêm vào `vars` `"STORE_URL": "https://ichigostudio.vn"`, `"BANK_BIN": "970423"`, `"BANK_ACCOUNT": "28262686686"`, `"BANK_ACCOUNT_NAME": "TRUONG QUOC CUONG"`, `"BANK_NAME": "TPBank"`, và
```jsonc
"ratelimits": [{ "name": "PUBLIC_LIMITER", "namespace_id": "1001", "simple": { "limit": 20, "period": 60 } }]
```

- [ ] **Step 1: Viết test hỏng** `tests/payments-schema.test.ts`: insert 1 `payments` (kind `cart`, paymentCode `'ICG00000001'`, amount 2000) → đọc lại có `status === 'pending'`, `isTest === false`; insert payment thứ 2 cùng `paymentCode` → `rejects.toThrow()`; hai payment cùng `providerTxId: '92704'` → `rejects.toThrow()`; insert order có `isTest: true, shippingAddress: '12 Lê Lợi'` → đọc lại đúng; `orderInputSchema.safeParse({...hợp lệ, source: 'web'}).success === true`.
- [ ] **Step 2:** `yarn vitest run tests/payments-schema.test.ts` → FAIL (thiếu bảng/cột).
- [ ] **Step 3:** Viết SQL (`CREATE TABLE payments ...`, `CREATE UNIQUE INDEX payments_payment_code_unique ON payments (payment_code)`, `CREATE UNIQUE INDEX payments_provider_tx_id_unique ON payments (provider_tx_id)`, `ALTER TABLE orders ADD is_test integer DEFAULT false NOT NULL`, `ALTER TABLE orders ADD shipping_address text`) + entry journal + schema.ts + `ORDER_SOURCES` + settings schema + Bindings + wrangler.jsonc.
- [ ] **Step 4:** `yarn vitest run` → toàn bộ PASS (test cũ không vỡ).
- [ ] **Step 5: Commit** `feat(api): bảng payments + orders.is_test/shipping_address + nguồn web`.

### Task 2: `lib/sepay.ts` + `lib/phone.ts`

**Files:**
- Create: `api/src/lib/sepay.ts`, `api/src/lib/phone.ts`
- Test: `api/tests/sepay.test.ts`, `api/tests/phone.test.ts`

**Interfaces:**
- Produces:
  - `PAYMENT_CODE_PREFIX = 'ICG'`; `newPaymentCode(): string` = `'ICG'` + 8 chữ số ngẫu nhiên (`crypto.getRandomValues`, có thể bắt đầu bằng 0)
  - `extractPaymentCode(code: string | null | undefined, content: string | null | undefined): string | null`: ưu tiên `code` nếu khớp `/^ICG\d{8}$/i`; không thì tìm `/ICG\d{8}(?!\d)/i` trong `content`; trả về **viết hoa**; không có → `null`
  - `verifySepayAuth(header: string | undefined, key: string): boolean`: header phải đúng dạng `Apikey <key>` (so sánh timing-safe, tiền tố `Apikey` không phân biệt hoa thường)
  - `sepayWebhookSchema` (zod): `{ id: number; gateway?: string; transactionDate?: string; accountNumber?: string; code: string | null (nullish); content: string (default ''); transferType: 'in' | 'out' (string); transferAmount: number; referenceCode?: string | null; description?: string | null }`, `.passthrough()`
  - `type BankConfig = { bin: string; account: string; accountName: string; bankName: string }`; `bankConfig(env: Bindings): BankConfig | null` (null nếu thiếu `BANK_BIN`/`BANK_ACCOUNT`/`BANK_ACCOUNT_NAME`; `bankName` mặc định `'TPBank'`)
  - `paymentConfigured(env: Bindings): boolean` = có `SEPAY_WEBHOOK_KEY` && `bankConfig(env) !== null`
  - `vietQrUrl(bank: BankConfig, amount: number, code: string): string` = `https://img.vietqr.io/image/${bin}-${account}-compact2.png?amount=${amount}&addInfo=${code}&accountName=${encodeURIComponent(accountName)}`
  - `normalizePhone(raw: string): string` (bỏ mọi ký tự không phải số; `84` + 9 số → `0` + 9 số); `isValidVnPhone(raw: string): boolean` (`/^0[35789]\d{8}$/` sau normalize)

- [ ] **Step 1: Viết test hỏng** `sepay.test.ts`:
  - `newPaymentCode()` khớp `/^ICG\d{8}$/`; 50 lần gọi cho ít nhất 45 giá trị khác nhau.
  - `extractPaymentCode('ICG12345678', '')` → `'ICG12345678'`; `extractPaymentCode(null, 'ck icg12345678 nguyen van a')` → `'ICG12345678'`; `extractPaymentCode(null, 'NGUYEN VAN A chuyen tien')` → `null`; `extractPaymentCode(null, 'ICG1234567')` (7 số) → `null`; `extractPaymentCode(null, 'ICG123456789')` (9 số) → `null`.
  - `verifySepayAuth('Apikey secret-1', 'secret-1')` → true; `'apikey secret-1'` → true; `'Apikey wrong'` → false; `undefined` → false; `'Bearer secret-1'` → false.
  - `vietQrUrl({ bin: '970423', account: '28262686686', accountName: 'TRUONG QUOC CUONG', bankName: 'TPBank' }, 2000, 'ICG00000001')` → `'https://img.vietqr.io/image/970423-28262686686-compact2.png?amount=2000&addInfo=ICG00000001&accountName=TRUONG%20QUOC%20CUONG'`.
  - `paymentConfigured` false khi thiếu `SEPAY_WEBHOOK_KEY`, true khi đủ.
  - `phone.test.ts`: `normalizePhone('+84 912 345 678') === '0912345678'`, `normalizePhone('0912.345.678') === '0912345678'`, `normalizePhone('84912345678') === '0912345678'`; `isValidVnPhone('0912345678') === true`, `isValidVnPhone('0212345678') === false`, `isValidVnPhone('091234') === false`.
- [ ] **Step 2:** `yarn vitest run tests/sepay.test.ts tests/phone.test.ts` → FAIL.
- [ ] **Step 3:** Implement (timing-safe compare như `lib/meta.ts`).
- [ ] **Step 4:** Chạy lại → PASS.
- [ ] **Step 5: Commit** `feat(api): tiện ích SePay/VietQR (mã thanh toán, xác thực webhook) + chuẩn hoá SĐT`.

### Task 3: `lib/checkout.ts` — tính giỏ + tìm/tạo khách

**Files:**
- Create: `api/src/lib/checkout.ts`
- Test: `api/tests/checkout-lib.test.ts`

**Interfaces:**
- Consumes: `normalizePhone` (Task 2), `payments`/`products`/`customers` (Task 1).
- Produces:
  - `priceCart(db: Db, items: { productId: string; qty: number }[], opts: { allowDraft: boolean }): Promise<{ ok: true; lines: CartPayload['items']; amount: number } | { ok: false; unavailable: string[] }>`: gộp trùng `productId` (cộng qty, cắt ở 10); SP hợp lệ = tồn tại, `price > 0`, `status === 'published'` hoặc (`allowDraft` và `status === 'draft'`); `title`/`unitPrice` lấy từ DB.
  - `findOrCreateCustomer(db: Db, c: { name: string; phone: string; address: string }): Promise<string>`: so `normalizePhone` với mọi `customers.phone` khác null; khớp thì trả id, **không ghi đè**; không khớp thì insert (phone đã normalize).
  - `formatVnd(n: number): string` → `'450.000đ'` (dấu chấm ngăn nghìn; dùng trong nội dung push ở Task 4, 6)

- [ ] **Step 1: Viết test hỏng:**
  - `priceCart` dùng giá DB: SP A giá 150000, gửi qty 2 → `amount === 300000`, `lines[0].unitPrice === 150000`.
  - Gửi A hai dòng qty 6 + 6 → một dòng qty 10.
  - SP B `price: null`, SP C `status: 'draft'` → `{ ok: false, unavailable: ['B','C'] }` (thứ tự không quan trọng, dùng `toEqual(expect.arrayContaining)`).
  - C với `allowDraft: true` (giá 2000) → ok, amount 2000.
  - `formatVnd(450000) === '450.000đ'`.
  - `findOrCreateCustomer`: đã có khách `phone: '0912 345 678'`, gọi với `'+84912345678'` → trả đúng id cũ, `name` cũ không đổi; số mới → tạo khách mới với `phone === '0987654321'`.
- [ ] **Step 2:** Chạy → FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Chạy → PASS.
- [ ] **Step 5: Commit** `feat(api): tính tiền giỏ từ DB + khớp khách theo SĐT`.

### Task 4: `ensureOrderForPayment` + push đơn mới

**Files:**
- Modify: `api/src/lib/checkout.ts`, `api/src/lib/push.ts`, `api/src/routes/orders.ts` (`nextOrderCode` giữ nguyên; `loadOrderDetail` thêm `payment`)
- Test: `api/tests/checkout-lib.test.ts` (thêm), `api/tests/orders.test.ts` (thêm 1 case)

**Interfaces:**
- Consumes: `findOrCreateCustomer` (Task 3), `nextOrderCode` (`routes/orders.ts`).
- Produces:
  - `export type PushPayload = { title: string; body: string; tag: string; url: string }`; `notifyAdmins(env: Bindings, payload: PushPayload): Promise<number>` trong `lib/push.ts` (gửi mọi subscription, tái dùng `sendOne`, trả 0 nếu thiếu VAPID).
  - `markPaid(env: Bindings, paymentId: string, info: { reference?: string | null; raw?: unknown }): Promise<{ orderId: string; code: string; created: boolean }>` trong `lib/checkout.ts` (webhook Task 6 tự set `providerTxId` trước khi gọi):
    1. set `payments.status='paid'`, `paidAt` (nếu chưa set), `reference`, `rawWebhook` (chưa set `orderId` vì FK tới `orders` sẽ hỏng khi đơn chưa tồn tại);
    2. nếu đã có `orders.id = paymentId` → trả `{ created: false }`;
    3. `db.batch([insert order, insert order_items, update payments.orderId = paymentId])` để cả ba cùng thành công. Order: `id = paymentId`, `code = nextOrderCode`, `source: 'web'`, `status: 'pending'`, `paymentStatus: 'paid'`, `discount: 0`, `deposit: 0`, `note: payload.customer.note`, `shippingAddress`, `isTest`, `customerName/customerPhone` từ payload, `customerId` từ `findOrCreateCustomer`; items từ `payload.items`. Nếu lỗi UNIQUE: `orders.id` đã tồn tại → `{ created: false }`; trùng `code` → thử lại tối đa 3 lần;
    4. chỉ khi `created`: `notifyAdmins` với `{ title: 'Đơn web mới' + (isTest ? ' (TEST)' : ''), body: \`${code} · ${formatVnd(amount)} · ${name}\`, tag: \`order-${orderId}\`, url: \`/don-hang/${orderId}\` }` (bọc try/catch, lỗi push không làm hỏng đơn).
  - `loadOrderDetail` trả thêm `payment: { paymentCode: string; reference: string | null; paidAt: number | null; amount: number } | null`.

- [ ] **Step 1: Viết test hỏng:**
  - Seed payment `pending`, payload 1 món 150000×2 → `markPaid` → `created === true`, `code` khớp `/^DH-\d{4}$/`, order có `source 'web'`, `paymentStatus 'paid'`, `shippingAddress` đúng, 1 order_item; payment `status 'paid'`, `orderId === paymentId`.
  - **Gọi `markPaid` lần 2** → `created === false`, cùng `code`, `select count(*) from orders` vẫn 1.
  - Payment đã `expired` (expiresAt quá khứ) → `markPaid` vẫn tạo đơn.
  - Payment `isTest: true` → order `isTest === true`.
  - `orders.test.ts`: GET `/orders/:id` của đơn web có `payment.paymentCode`; đơn admin thường có `payment === null`.
- [ ] **Step 2:** Chạy → FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** `yarn vitest run` → PASS toàn bộ.
- [ ] **Step 5: Commit** `feat(api): tạo đơn idempotent khi payment đã trả + push đơn web`.

### Task 5: Route public checkout + settings checkout

**Files:**
- Create: `api/src/routes/checkout.ts`, `api/src/schemas/checkout.ts`, `api/src/lib/rate-limit.ts`
- Modify: `api/src/index.ts` (mount `app.route('/public/checkout', checkoutRoutes)` **trước** `app.route('/public', ...)`), `api/src/routes/settings.ts` (GET/PUT `/settings/checkout`, key `checkout`, theo mẫu `print-pricing`)
- Test: `api/tests/checkout.test.ts`, `api/tests/settings.test.ts` (thêm)

**Interfaces:**
- Consumes: Task 1–4 (`paymentConfigured`, `bankConfig`, `vietQrUrl`, `newPaymentCode`, `isValidVnPhone`, `normalizePhone`, `priceCart`).
- Produces (HTTP):
  - `GET /public/checkout/config?key=` → `{ enabled: boolean; testMode: boolean }`. `enabled = settings.enabled && paymentConfigured(env)`; `testMode = testKey !== '' && key === testKey && paymentConfigured(env)`.
  - `GET /public/checkout/test-products?key=` → 403 nếu không testMode; ngược lại `{ items: { id, slug, title, price, cover }[] }` gồm SP `draft` có `price > 0`.
  - `POST /public/checkout` body `checkoutInputSchema` = `{ items: {productId: string; qty: int 1..10}[] (1..20), name: string 1..100 (trim), phone: string (refine isValidVnPhone), address: string 5..300, note?: string ≤500, testKey?: string }` →
    - 429 `{error:'rate_limited'}` nếu limiter từ chối;
    - 503 `{error:'payment_not_configured'}` nếu `!paymentConfigured`; 403 `{error:'checkout_disabled'}` nếu không enabled và không testMode;
    - 409 `{error:'product_unavailable', productIds}` từ `priceCart` (`allowDraft = testMode`);
    - insert payment `pending`, `paymentCode = newPaymentCode()` (trùng UNIQUE thì sinh lại, tối đa 3 lần), `expiresAt = now + 15 phút`, `isTest = testMode`, payload với `phone` đã normalize → 201 `{ id, amount, paymentCode, qrUrl, bank: { bankName, account, accountName }, expiresAt }`.
  - `GET /public/checkout/:id` → `{ id, status, amount, paymentCode, qrUrl, bank, expiresAt, orderCode: string | null, isTest }`; 404 nếu không có. Chỉ đọc DB (không gọi dịch vụ ngoài). Nếu `pending` mà `now > expiresAt` → set `expired` rồi trả. Không trả thông tin khách.
  - `lib/rate-limit.ts`: `allow(env: Bindings, key: string): Promise<boolean>` (không có `PUBLIC_LIMITER` → true); key = `${scope}:${cf-connecting-ip ?? 'unknown'}`.
  - `GET/PUT /settings/checkout` (GET mở cho admin đã đăng nhập; PUT gate `settings`).

- [ ] **Step 1: Viết test hỏng** (env override `{ ...env, SEPAY_WEBHOOK_KEY: 'sk', BANK_BIN: '970423', BANK_ACCOUNT: '28262686686', BANK_ACCOUNT_NAME: 'TRUONG QUOC CUONG' }`):
  - config: settings mặc định → `{enabled:false,testMode:false}`; bật enabled + đủ cấu hình → `enabled:true`; thiếu `SEPAY_WEBHOOK_KEY` → `enabled:false`.
  - POST hợp lệ → 201, `amount` = giá DB (gửi kèm field lạ `unitPrice: 1` bị bỏ qua), `paymentCode` khớp `/^ICG\d{8}$/`, `qrUrl` chứa `amount=<amount>&addInfo=<paymentCode>`, payment `pending` trong DB.
  - SP giá null trong giỏ → 409 kèm `productIds`.
  - Thiếu `SEPAY_WEBHOOK_KEY` → 503; enabled=false, không testKey → 403.
  - testKey đúng + SP draft giá 2000 → 201, payment `isTest === true`; testKey sai → 403.
  - SĐT `'12345'` → 400.
  - Limiter giả `{ limit: async () => ({ success: false }) }` → 429.
  - GET `/:id` khi payment đã `paid` + có order → `status 'paid'`, `orderCode` khớp `/^DH-/`.
  - GET `/:id` pending quá hạn → `status 'expired'`; JSON không có key `payload`/`phone`/`name`.
  - settings: PUT `{ enabled: true, testKey: 'short' }` → 400; PUT hợp lệ rồi GET trả lại đúng.
- [ ] **Step 2:** Chạy → FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** `yarn vitest run` → PASS.
- [ ] **Step 5: Commit** `feat(api): public checkout chuyển khoản VietQR + cấu hình bán hàng web`.

### Task 6: Webhook SePay

**Files:**
- Create: `api/src/routes/sepay.ts`
- Modify: `api/src/index.ts` (`app.route('/sepay', sepayRoutes)`)
- Test: `api/tests/sepay-webhook.test.ts`

**Interfaces:**
- Consumes: `verifySepayAuth`, `sepayWebhookSchema`, `extractPaymentCode` (Task 2), `markPaid`, `notifyAdmins`, `formatVnd` (Task 3–4).
- Produces: `POST /sepay/webhook` (URL khai báo trên SePay: `https://ichigo-studio-api.cuongyo19997.workers.dev/sepay/webhook`, kiểu xác thực **API Key**). Trả:
  - 503 `{ success: false }` nếu thiếu `SEPAY_WEBHOOK_KEY`; 401 nếu `verifySepayAuth` sai; 400 nếu body không qua schema;
  - còn lại luôn **200 `{ success: true }`** (SePay coi khác 200/201 + `success: true` là lỗi và retry).
  
  Xử lý theo thứ tự:
  1. `transferType !== 'in'` → bỏ qua.
  2. `code = extractPaymentCode(body.code, body.content)`; `null` → bỏ qua (chuyển khoản thường của khách Messenger).
  3. Đã có payment với `providerTxId = String(body.id)` → bỏ qua (SePay gửi lại).
  4. Tìm payment theo `paymentCode = code`:
     - có, `kind='cart'`, `transferAmount === payment.amount`, status không phải `paid`/`needs_review` → set `providerTxId` rồi `markPaid(env, id, { reference: body.referenceCode, raw: body })`;
     - có, đã `paid` → bỏ qua (giao dịch thứ hai cùng mã: ghi log);
     - có nhưng lệch số tiền → set `status='needs_review'`, `providerTxId`, `rawWebhook`; push `{ title: 'Có khoản thanh toán cần kiểm tra', body: \`${code} · nhận ${formatVnd(transferAmount)} / cần ${formatVnd(amount)}\`, tag: \`payment-${id}\`, url: '/don-hang' }`; **không** tạo đơn;
     - không có → insert payment `kind='unknown'`, `status='needs_review'`, `paymentCode = code + '-' + body.id` (tránh đụng UNIQUE), `amount = transferAmount`, `providerTxId`, `rawWebhook`; push tương tự với body `\`${code} · ${formatVnd(transferAmount)} · không khớp đơn nào\``.

- [ ] **Step 1: Viết test hỏng** (header `authorization: 'Apikey sk'`, payload theo mẫu SePay `{ id: 92704, gateway: 'TPBank', transactionDate: '2026-10-23 10:00:00', accountNumber: '28262686686', code: null, content: 'ICG00000001 chuyen tien', transferType: 'in', transferAmount: 2000, accumulated: 0, referenceCode: 'FT26296000001', description: '' }`):
  - khớp payment `ICG00000001` amount 2000 → 200 `{success:true}`, có order; gửi lại y hệt → 200, vẫn 1 order.
  - header sai → 401, không order; thiếu key env → 503.
  - `content: 'NGUYEN VAN A chuyen tien'` → 200, bảng payments không thêm dòng, không order.
  - `transferType: 'out'` → 200, không gì thay đổi.
  - `content: 'ck icg00000001 nguyen van a'` (viết thường) → có order.
  - amount 1000 → 200, payment `needs_review`, 0 order.
  - mã `ICG99999999` không tồn tại → 200, có payment `kind 'unknown'`, `status 'needs_review'`.
  - payment `expired` nhận webhook hợp lệ → có order.
- [ ] **Step 2:** Chạy → FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Chạy → PASS.
- [ ] **Step 5: Commit** `feat(api): webhook SePay xác nhận chuyển khoản`.

### Task 7: Tra cứu đơn + loại đơn test khỏi thống kê

**Files:**
- Create: `api/src/routes/order-lookup.ts`, mount `app.route('/public/orders', orderLookupRoutes)` trong `api/src/index.ts`
- Modify: `api/src/routes/stats.ts` (4 query `from(orders)` ở các dòng ~29, 39, 50, 78 thêm `eq(orders.isTest, false)`)
- Test: `api/tests/order-lookup.test.ts`, `api/tests/stats.test.ts` (thêm)

**Interfaces:**
- Produces: `POST /public/orders/lookup` body `{ code: string; phone: string }` → 200 `{ code, createdAt, status, paymentStatus, total, items: { title, qty, unitPrice }[], carrier, trackingCode }` | 404 `{error:'not_found'}` (cả khi sai SĐT) | 429 (`allow(env, 'lookup:'+ip)`). Mã so khớp không phân biệt hoa thường, trim. SĐT so bằng `normalizePhone(order.customerPhone) === normalizePhone(input)`. **Không** trả địa chỉ, tên, SĐT. `total` tính bằng `computeTotals`.

- [ ] **Step 1: Viết test hỏng:**
  - đơn `DH-0007`, `customerPhone '0912345678'` → lookup `{ code: 'dh-0007', phone: '+84 912 345 678' }` → 200, không có key `shippingAddress`/`customerName`/`customerPhone` trong JSON.
  - sai SĐT → 404; mã không tồn tại → 404.
  - limiter từ chối → 429.
  - `stats.test.ts`: một đơn `completed` `isTest: true` + một đơn thật → `/stats/revenue` chỉ cộng đơn thật; `/stats/top-customers` và `/stats/products` cũng không có đơn test.
- [ ] **Step 2:** Chạy → FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** `yarn vitest run` → PASS toàn bộ.
- [ ] **Step 5: Commit** `feat(api): tra cứu đơn bằng mã + SĐT, loại đơn test khỏi thống kê`.

---

## Phần B — Admin (`ichigo-studio-admin`)

### Task 8: Nhãn Web, cờ TEST, thông tin thanh toán, card cấu hình

**Files:**
- Modify: `admin/src/lib/orders.ts` (`OrderSource` + `'web'`, `ORDER_SOURCE_LABELS.web = 'Web'`, type `Order` + `isTest: boolean`, `shippingAddress: string | null`, `payment: {...} | null`), `admin/src/lib/order-schema.ts` (enum source + `'web'`), `admin/src/pages/OrderListPage.vue`, `admin/src/pages/OrderDetailPage.vue`, `admin/src/lib/settings.ts`, `admin/src/pages/SettingsPage.vue`
- Test: `admin/src/lib/orders.test.ts` (thêm)

**Interfaces:**
- Consumes: API Task 4, 5.
- Produces: `fetchCheckoutSettings(): Promise<CheckoutSettings>`, `saveCheckoutSettings(s: CheckoutSettings): Promise<CheckoutSettings>`, `generateTestKey(): string` (24 ký tự từ `crypto.getRandomValues`, bảng chữ `a-z0-9`).

UI:
- OrderList: badge `TEST` (variant destructive/outline) cạnh mã đơn khi `isTest`; nguồn Web hiển thị qua label sẵn có.
- OrderDetail: dòng "Địa chỉ giao" (`shippingAddress`) trong khối khách hàng; khối "Thanh toán chuyển khoản" khi có `payment`: mã thanh toán (`paymentCode`), mã giao dịch ngân hàng (`reference`), thời điểm trả, số tiền; badge `Đơn test` nếu `isTest`.
- Settings: card "Bán hàng trên web": Switch "Bật giỏ hàng cho khách"; ô test key (readonly) + nút "Tạo key mới" + dòng link `https://ichigostudio.vn/dat-thu?key=<testKey>` với nút Copy; ghi chú "Đơn đặt qua link thử được đánh dấu TEST và không tính vào thống kê."

- [ ] **Step 1: Viết test hỏng** trong `orders.test.ts`: `ORDER_SOURCE_LABELS.web === 'Web'`; `generateTestKey()` dài 24 và khớp `/^[a-z0-9]{24}$/`, hai lần gọi khác nhau.
- [ ] **Step 2:** `yarn vitest run src/lib/orders.test.ts` → FAIL.
- [ ] **Step 3:** Implement lib + 3 trang.
- [ ] **Step 4:** `yarn vitest run` → PASS; `yarn build` → in ra dòng `built in` (vue-tsc sạch, xem cảnh báo vue-tsc ở memory: build fail thì deploy đẩy dist cũ).
- [ ] **Step 5: Commit** `feat(admin): đơn web, cờ test, thanh toán chuyển khoản, cấu hình bán hàng web`.

---

## Phần C — Store (`ichigo-studio-store`)

### Task 9: Logic giỏ thuần + SĐT + nhãn trạng thái

**Files:**
- Create: `store/utils/cart.ts`, `store/utils/phone.ts`, `store/utils/order-status.ts`
- Test: `store/tests/cart.test.ts`, `store/tests/phone.test.ts`

**Interfaces:**
- Produces:
  - `type CartEntry = { productId: string; qty: number }`; `MAX_QTY = 10`; `MAX_LINES = 20`
  - `addToCart(cart: CartEntry[], productId: string, qty?: number): CartEntry[]` (cộng dồn, cắt ở `MAX_QTY`; không thêm dòng mới khi đã đủ `MAX_LINES`)
  - `setQty(cart, productId, qty): CartEntry[]` (qty ≤ 0 → xoá; cắt ở `MAX_QTY`); `removeFromCart(cart, productId): CartEntry[]`
  - `type CartProduct = { id: string; slug: string; title: string; price: number | null; cover: string }`
  - `resolveCart(cart: CartEntry[], products: CartProduct[]): { lines: (CartProduct & { qty: number; lineTotal: number })[]; unavailable: CartEntry[]; subtotal: number }` (SP không có trong `products` hoặc `price` null/≤0 → `unavailable`)
  - `parseCart(raw: string | null): CartEntry[]` (JSON hỏng hoặc sai shape → `[]`)
  - `normalizePhone`, `isValidVnPhone`: cùng quy tắc với API Task 2
  - `CUSTOMER_STATUS_LABELS: Record<string, string>` = `pending: 'Đã nhận đơn'`, `in_progress: 'Đang in'`, `ready: 'In xong, chờ gửi'`, `delivered: 'Đã gửi hàng'`, `completed: 'Hoàn tất'`, `cancelled: 'Đã hủy'`

- [ ] **Step 1: Viết test hỏng:** `addToCart([], 'a')` → `[{productId:'a',qty:1}]`; thêm `'a'` qty 15 → qty 10; `setQty(cart,'a',0)` → `[]`; `resolveCart` với `a` giá 150000×2 và `b` giá null → `subtotal 300000`, `unavailable [{productId:'b',...}]`; `parseCart('{oops')` → `[]`, `parseCart('[{"productId":1}]')` → `[]`; 3 case phone như API Task 2.
- [ ] **Step 2:** `yarn vitest run tests/cart.test.ts tests/phone.test.ts` → FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Chạy → PASS.
- [ ] **Step 5: Commit** `feat(store): logic giỏ hàng thuần + chuẩn hoá SĐT`.

### Task 10: Composable giỏ, cấu hình checkout, đơn đã lưu + nút "Thêm vào giỏ" + icon giỏ

**Files:**
- Create: `store/composables/useCart.ts`, `store/composables/useCheckoutConfig.ts`, `store/composables/useSavedOrders.ts`, `store/components/AddToCartButton.vue`, `store/components/CartLink.vue`
- Modify: `store/components/AppHeader.vue` (CartLink desktop + mobile), `store/pages/san-pham/[slug].vue` (AddToCartButton cạnh MessengerButton ở khối chính và thanh dính đáy mobile)

**Interfaces:**
- Consumes: `utils/cart.ts` (Task 9); API `GET /public/checkout/config`, `GET /public/checkout/test-products`.
- Produces:
  - `useCart(): { entries: Ref<CartEntry[]>; count: ComputedRef<number>; add(id, qty?); setQty(id, qty); remove(id); clear() }` (dùng `useState('cart')`; nạp từ localStorage key `ichigo.cart.v1` trong `onMounted`/client-only; lưu bằng `watch` deep; mọi truy cập storage bọc try/catch)
  - `useCheckoutConfig(): { enabled: Ref<boolean>; testMode: Ref<boolean>; testKey: Ref<string>; cartVisible: ComputedRef<boolean> }` (testKey đọc từ sessionStorage `ichigo.testKey`; fetch client-side, lỗi → coi như tắt; `cartVisible = enabled || testMode`)
  - `useSavedOrders(): { orders: Ref<{ code: string; phone: string; savedAt: number }[]>; save(o); remove(code) }` (localStorage `ichigo.orders.v1`, tối đa 20, mới nhất trước, trùng code thì bỏ qua)
  - `useCartProducts(): Promise<CartProduct[]>` trong `useCart.ts`: SP published từ `useProducts()` + (nếu testMode) SP test.
  - `<AddToCartButton :product="{ id, title, price }" source="product" />`: không render khi `!cartVisible` hoặc `price` null; bấm → `add`, đổi nhãn thành `Đã thêm vào giỏ` 2 giây kèm link `/gio-hang`; GA4 `add_to_cart` `{ currency: 'VND', value: price, items: [{ item_id: id, item_name: title, price, quantity: 1 }] }`.
  - `<CartLink />`: icon giỏ + badge `count` tới `/gio-hang`, ẩn khi `!cartVisible`.

Lưu ý: `mapApiProduct` cần giữ `id` từ API (kiểm tra `utils/products.ts`, thêm nếu thiếu).

- [ ] **Step 1:** Implement (logic thuần đã có test ở Task 9; task này kiểm bằng chạy thật).
- [ ] **Step 2:** Bật dev: API `yarn dev` (8787, **chạm DB prod**: chỉ dùng test key, không bật `checkout.enabled`) và store `yarn dev`.
- [ ] **Step 3:** Kiểm tay: vào `/dat-thu?key=<testKey>` chưa có (Task 12), nên tạm kiểm bằng cách set sessionStorage `ichigo.testKey` trong devtools → trang SP có giá hiện "Thêm vào giỏ", icon giỏ có số; SP "Liên hệ" chỉ có nút Messenger; reload vẫn giữ giỏ; không có testKey và `enabled=false` → không thấy nút giỏ.
- [ ] **Step 4:** `yarn test` PASS, `yarn build` thành công.
- [ ] **Step 5: Commit** `feat(store): giỏ hàng localStorage + nút thêm vào giỏ + icon giỏ`.

### Task 11: Trang giỏ, checkout, chờ thanh toán

**Files:**
- Create: `store/pages/gio-hang.vue`, `store/pages/thanh-toan/index.vue`, `store/pages/thanh-toan/[id].vue`, `store/components/BankTransferInfo.vue`

**Interfaces:**
- Consumes: Task 9, 10; API `POST /public/checkout`, `GET /public/checkout/:id`.
- Produces: localStorage `ichigo.pendingCheckout.v1` = `{ id: string; phone: string }` (để trang chờ biết SĐT khi lưu đơn).

Hành vi:
- `/gio-hang`: danh sách dòng (ảnh, tên link SP, đơn giá, stepper qty 1–10, xoá), dòng "không còn bán" cho `unavailable` + nút xoá, tạm tính, dòng `Phí ship bạn trả khi nhận hàng.`, nút `Đặt hàng` → `/thanh-toan` (disabled nếu giỏ rỗng hoặc còn dòng unavailable). Giỏ rỗng: lời nhắn + link `/san-pham`.
- `/thanh-toan`: form Họ tên, Số điện thoại (`inputmode="tel"`, validate `isValidVnPhone`), Địa chỉ nhận hàng (textarea), Ghi chú (tùy chọn); tóm tắt đơn; dòng ship; nút `Thanh toán bằng QR`. Gửi `{ items: entries, name, phone, address, note, testKey? }`. GA4 `begin_checkout` khi vào trang. Lỗi: 409 → đánh dấu SP không còn bán, quay về giỏ; 429 → "Bạn thao tác hơi nhanh, thử lại sau ít phút."; 503/khác → "Chưa tạo được mã thanh toán. Bạn thử lại hoặc nhắn Messenger cho shop." + MessengerButton. Thành công → lưu pendingCheckout → `navigateTo('/thanh-toan/' + id)`. Label gắn `for`/`id`, lỗi có `aria-live="polite"`.
- `/thanh-toan/[id]`: poll `GET /public/checkout/:id` mỗi 3 giây (dừng khi rời trang hoặc status khác `pending`).
  - `pending`: `<BankTransferInfo>`: ảnh `<img :src="qrUrl" alt="Mã QR chuyển khoản" width="280">`; bảng Ngân hàng (`bank.bankName`), Số tài khoản, Chủ tài khoản, Số tiền, **Nội dung chuyển khoản = `paymentCode`** (chữ to, nổi bật), mỗi dòng số TK / số tiền / nội dung có nút Sao chép (`navigator.clipboard`, đổi nhãn "Đã chép"); đếm ngược tới `expiresAt`; hướng dẫn "Mở app ngân hàng, quét mã. Nếu chuyển tay, ghi đúng nội dung `ICG...`, không thêm bớt."; dòng "Trang tự cập nhật khi shop nhận được tiền."
  - `paid`: trang cảm ơn: mã đơn lớn, `Shop sẽ gọi cho bạn để xác nhận đơn.`, dòng ship, link `/don-hang`. Lần đầu thấy `paid`: `useSavedOrders().save({ code, phone })`, `useCart().clear()`, xoá pendingCheckout, GA4 `purchase` `{ transaction_id: orderCode, currency: 'VND', value: amount }` (chỉ bắn nếu code chưa có trong saved orders).
  - `expired` / `cancelled`: "Mã QR đã hết hạn." + nút `Tạo mã mới` (về `/thanh-toan`, giỏ vẫn còn). Kèm dòng "Nếu bạn đã chuyển khoản đúng nội dung `<paymentCode>`, đơn vẫn được ghi nhận. Cần hỗ trợ, nhắn Messenger cho shop kèm mã này." + MessengerButton.
- Cả 3 trang: `useSeoMeta({ robots: 'noindex, nofollow' })`.

- [ ] **Step 1:** Implement 3 trang + BankTransferInfo.
- [ ] **Step 2:** `yarn build` thành công.
- [ ] **Step 3:** Kiểm theo Ruling 3 (API `wrangler dev --local`, `.dev.vars` local có `SEPAY_WEBHOOK_KEY=local`, SP draft 2.000đ seed local): tạo checkout bằng curl → mở `/thanh-toan/<id>` SSR thấy QR + mã `ICG`; giả webhook bằng `curl -X POST localhost:8787/sepay/webhook -H 'authorization: Apikey local' -d '{...content:"ICG..."}'` → trang chuyển sang cảm ơn khi poll.
- [ ] **Step 4:** `yarn test` PASS.
- [ ] **Step 5: Commit** `feat(store): trang giỏ, checkout và chờ thanh toán QR chuyển khoản`.

### Task 12: Đơn của bạn + tra cứu + trang đặt thử

**Files:**
- Create: `store/pages/don-hang.vue`, `store/pages/dat-thu.vue`
- Modify: `store/components/AppFooter.vue` (link "Tra cứu đơn" tới `/don-hang`), `store/CLAUDE.md` (bỏ "no cart, no checkout"; mô tả luồng giỏ/checkout, localStorage keys, trang mới)

**Interfaces:**
- Consumes: `useSavedOrders`, `CUSTOMER_STATUS_LABELS`, `formatPrice`; API `POST /public/orders/lookup`, `GET /public/checkout/test-products`.

Hành vi:
- `/don-hang`: (1) "Đơn của bạn" từ `useSavedOrders`, mỗi đơn gọi lookup và hiện mã, ngày, trạng thái (nhãn khách), món × qty, tổng, hãng + mã vận đơn nếu có; đơn 404 thì hiện "Không tải được" + nút bỏ khỏi danh sách. (2) Form "Tra cứu đơn" (mã đơn + SĐT) → hiện kết quả cùng kiểu; 404 → "Không tìm thấy đơn khớp mã và số điện thoại."; 429 → thông báo thử lại sau. Kết quả tra cứu thành công được `save` vào danh sách.
- `/dat-thu?key=...`: lưu key vào sessionStorage `ichigo.testKey`, gọi test-products; 403 → "Link thử không hợp lệ."; ngược lại banner "Chế độ đặt thử: đơn được đánh dấu TEST" + danh sách SP test với AddToCartButton + link `/gio-hang`.
- Cả hai trang `noindex, nofollow`; **không** thêm vào `server/routes/sitemap.xml.ts`.

- [ ] **Step 1:** Implement.
- [ ] **Step 2:** `yarn build` thành công; `curl -s localhost:3000/sitemap.xml | grep -c -E 'gio-hang|thanh-toan|don-hang|dat-thu'` → `0`.
- [ ] **Step 3:** Kiểm tay: tra cứu một đơn thật bằng SĐT dạng `+84 ...` → khớp; sai SĐT → thông báo không tìm thấy; `/dat-thu` với key sai → báo không hợp lệ.
- [ ] **Step 4:** `yarn test` PASS.
- [ ] **Step 5: Commit** `feat(store): tra cứu đơn, đơn của bạn, trang đặt thử`.

---

## Phần D — Đưa lên production

### Task 13: Runbook deploy + test thật + bật bán (cần chủ shop)

**Files:** không có code mới; cập nhật memory `cart-checkout-payos.md` khi xong.

- [ ] **Step 1: Hỏi chủ shop** đã tạo tài khoản SePay, liên kết TPBank `28262686686` chưa, và có đồng ý deploy không. Chưa có thì dừng ở đây.
- [ ] **Step 2: Cấu hình SePay (chủ shop, my.sepay.vn):** Cấu hình công ty → Cấu trúc mã thanh toán: tiền tố `ICG`, hậu tố **số nguyên** dài 6–8, Đang hoạt động. Tạo webhook: sự kiện **Có tiền vào**, URL `https://ichigo-studio-api.cuongyo19997.workers.dev/sepay/webhook`, xác thực **API Key** với một key dài ngẫu nhiên (mình sinh, chủ shop dán). Có thể dùng Test mode của SePay để giả giao dịch trước.
- [ ] **Step 3: API:** `ls drizzle/` xác nhận số migration → `yarn db:migrate` (áp vào prod **trước**) → `wrangler secret put SEPAY_WEBHOOK_KEY` (cùng key ở bước 2) → `wrangler deploy`. Kiểm: `curl -s .../public/checkout/config` → `{"enabled":false,"testMode":false}`.
- [ ] **Step 4: Admin:** `npm run build` (thấy `built in`) → `npx wrangler deploy`.
- [ ] **Step 5: Store:** `yarn build` → `npx wrangler deploy`.
- [ ] **Step 6: Test thật:** admin → Cài đặt → "Tạo key mới" → lưu; tạo SP **nháp** "TEST thanh toán" giá 2.000đ; mở link `/dat-thu?key=...` trên điện thoại → đặt → quét QR trả 2.000đ (app TPBank/ngân hàng khác). Kỳ vọng: trang chuyển "cảm ơn" trong khoảng 1 phút (tùy SePay đồng bộ); push "Đơn web mới (TEST)"; đơn có badge TEST, nguồn Web, khối Thanh toán chuyển khoản; `/thong-ke` doanh thu không đổi; `/don-hang` trên store thấy đơn; tra cứu từ máy khác bằng mã + SĐT thấy đơn.
- [ ] **Step 7: Test chuyển khoản thường:** chuyển 1.000đ vào TPBank với nội dung không có `ICG` → không có push, không có bản ghi.
- [ ] **Step 8: Test hết hạn:** tạo đơn thử nhưng không trả, đợi 15 phút → trang báo hết hạn, không có đơn mới trong admin.
- [ ] **Step 9:** Chủ shop tự hủy/xóa đơn test và hoàn 2.000đ nếu muốn, rồi bật Switch "Bật giỏ hàng cho khách". Kiểm trang SP thật có nút "Thêm vào giỏ".
- [ ] **Step 10:** Cập nhật memory (`cart-checkout-payos.md`) với version deploy + trạng thái.
