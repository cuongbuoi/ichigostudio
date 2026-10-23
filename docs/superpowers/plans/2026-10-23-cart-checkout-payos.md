# Giỏ hàng + thanh toán payOS — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Khách tự đặt hàng trên ichigostudio.vn: bỏ giỏ → điền thông tin → quét QR payOS trả 100% tiền hàng → đơn tự vào admin (`source='web'`, đã thanh toán) + Web Push cho shop; khách xem lại đơn qua localStorage hoặc tra cứu mã đơn + SĐT.

**Architecture:** API (Hono/D1) có bảng `payments` dùng chung cho mọi khoản thu payOS (giỏ hàng bây giờ, đặt in STL sau). Checkout chưa trả nằm ở `payments`; chỉ khi payOS xác nhận (webhook hoặc poll đối chiếu) mới tạo `orders` với `orders.id = payments.id` để idempotent theo khóa chính. Store (Nuxt SSR) giữ giỏ ở localStorage, server luôn tính lại giá. Admin thêm nhãn nguồn Web, cờ đơn test, card cấu hình bán hàng web.

**Tech Stack:** Cloudflare Workers + Hono 4 + Drizzle (D1) + zod 4 + vitest-pool-workers (API) · Vue 3 + shadcn-vue + vue-query (admin) · Nuxt 3 SSR + Tailwind 3 + vitest (store) · payOS REST v2 (WebCrypto HMAC-SHA256, không dùng SDK) · `qrcode@1.5.4` (store, dynamic import).

**Spec:** `ichigo-studio-store/docs/superpowers/specs/2026-10-23-cart-checkout-payos-design.md`

Đường dẫn trong plan tương đối theo repo ghi ở đầu mỗi task: `api/` = `ichigo-studio-api`, `admin/` = `ichigo-studio-admin`, `store/` = `ichigo-studio-store` (cùng nằm trong `/Users/assmin/Documents/Projects/ichigo-studio/`).

## Global Constraints

- Thanh toán **100% tiền hàng**; **phí ship không thu online**, khách trả khi nhận. Mọi màn giỏ/checkout/cảm ơn phải ghi: `Phí ship bạn trả khi nhận hàng.`
- Không có tùy chọn SP. SP `price = null` (hoặc ≤ 0) không bỏ giỏ được; nút Messenger "Hỏi mua" giữ nguyên ở mọi nơi.
- Server luôn tự tính tiền từ DB, bỏ qua mọi giá client gửi.
- Không đánh dấu đã trả nếu chữ ký webhook payOS sai.
- Copy storefront: tiếng Việt có dấu đầy đủ, **không em-dash (—)**, không nhắc "cọc".
- Store: dùng `yarn`; token màu Tailwind (`night`, `panel`, `hopper`...), font `font-display`/`font-sans`; không hex thô.
- API: DB prod duy nhất (`yarn dev` chạm prod). Migration **viết tay** + thêm entry `drizzle/meta/_journal.json`; áp `yarn db:migrate` **trước** khi deploy code. Trước khi đánh số migration, `ls drizzle/` vì luồng song song có thể đã chiếm số.
- payOS: base `https://api-merchant.payos.vn`, header `x-client-id` / `x-api-key`; `description` ≤ 9 ký tự → dùng hằng `ICHIGO`; `expiredAt` = Unix **giây**; hạn link **15 phút**.
- Secrets mới (optional trong `Bindings`): `PAYOS_CLIENT_ID`, `PAYOS_API_KEY`, `PAYOS_CHECKSUM_KEY`. Var mới: `STORE_URL` (mặc định `https://ichigostudio.vn`). Binding rate limit optional: `PUBLIC_LIMITER`.
- Cả ba repo đang có nhiều thay đổi chưa commit từ trước. Commit bằng `git add <đường dẫn cụ thể>`, không `git add -A`/`.`. File đã bẩn từ trước mà task phải sửa thì commit cả file (chấp nhận gộp, ghi chú trong commit message).
- Không deploy và không áp migration prod khi chưa hỏi chủ shop (Task 13).

## Review Focus

1. **Webhook gửi trùng, hoặc webhook và poll chạy cùng lúc** → đúng **một** đơn, một push. Test ở Task 4 (`ensureOrderForPayment` gọi 2 lần).
2. **Trả tiền sau khi QR hết hạn** → vẫn tạo đơn. Test ở Task 4 và Task 6.
3. **SP đổi giá / bị ẩn giữa lúc bỏ giỏ và đặt** → dùng giá DB; SP không còn bán thì trả 409 + danh sách id, store báo khách. Test ở Task 3 và Task 5.
4. **SĐT nhiều dạng** (`+84 912 345 678`, `0912.345.678`, `84912345678`) → cùng một khách, tra cứu vẫn khớp. Test ở Task 2 và Task 7.
5. **payOS lỗi hoặc thiếu key** → không để lại payment `pending` mồ côi; trả 502/503; store hiện lỗi thân thiện, không vỡ trang. Test ở Task 5.

---

## Phần A — API (`ichigo-studio-api`)

### Task 1: Migration + schema (payments, orders.is_test, orders.shipping_address, source 'web', settings checkout)

**Files:**
- Create: `api/drizzle/0025_payments_checkout.sql` (đổi số nếu đã bị chiếm)
- Modify: `api/drizzle/meta/_journal.json`, `api/src/db/schema.ts`, `api/src/schemas/order.ts`, `api/src/schemas/settings.ts`, `api/src/index.ts` (Bindings), `api/wrangler.jsonc`
- Test: `api/tests/payments-schema.test.ts`

**Interfaces:**
- Produces: bảng drizzle `payments`; cột `orders.isTest: boolean`, `orders.shippingAddress: string | null`; `ORDER_SOURCES` có `'web'`; `checkoutSettingsSchema`, `CHECKOUT_SETTINGS_DEFAULT`, type `CheckoutSettings = { enabled: boolean; testKey: string }`; `Bindings` thêm `PAYOS_CLIENT_ID?`, `PAYOS_API_KEY?`, `PAYOS_CHECKSUM_KEY?`, `STORE_URL?`, `PUBLIC_LIMITER?: RateLimit`.

`payments` (snake_case trong SQL):

| cột | kiểu |
|---|---|
| `id` | text PK (uuid; cũng là `orders.id` khi đã tạo đơn) |
| `kind` | text enum `cart` \| `print_quote` \| `unknown` |
| `ref_id` | text null (id `quote_jobs` sau này) |
| `payos_order_code` | integer not null, UNIQUE |
| `amount` | integer not null |
| `status` | text enum `pending` \| `paid` \| `expired` \| `cancelled` \| `needs_review`, default `pending` |
| `is_test` | integer boolean default false |
| `payload` | text json `CartPayload` (null cho `unknown`) |
| `checkout_url`, `qr_code`, `payment_link_id`, `reference` | text null |
| `raw_webhook` | text json null |
| `expires_at`, `paid_at`, `last_checked_at` | integer null (epoch ms) |
| `order_id` | text FK orders set null |
| `created_at`, `updated_at` | integer not null |

`CartPayload = { items: { productId: string; title: string; unitPrice: number; qty: number }[]; customer: { name: string; phone: string; address: string; note: string | null } }`

`checkoutSettingsSchema = z.object({ enabled: z.boolean(), testKey: z.union([z.literal(''), z.string().min(16).max(64)]) })`, default `{ enabled: false, testKey: '' }`.

`wrangler.jsonc`: thêm `"STORE_URL": "https://ichigostudio.vn"` vào `vars`, và
```jsonc
"ratelimits": [{ "name": "PUBLIC_LIMITER", "namespace_id": "1001", "simple": { "limit": 20, "period": 60 } }]
```

- [ ] **Step 1: Viết test hỏng** `tests/payments-schema.test.ts`: insert 1 `payments` (kind `cart`, payosOrderCode 1, amount 2000) → đọc lại có `status === 'pending'`, `isTest === false`; insert payment thứ 2 cùng `payosOrderCode` → `rejects.toThrow()`; insert order có `isTest: true, shippingAddress: '12 Lê Lợi'` → đọc lại đúng; `orderInputSchema.safeParse({...hợp lệ, source: 'web'}).success === true`.
- [ ] **Step 2:** `yarn vitest run tests/payments-schema.test.ts` → FAIL (thiếu bảng/cột).
- [ ] **Step 3:** Viết SQL (`CREATE TABLE payments ...`, `CREATE UNIQUE INDEX payments_payos_order_code_unique ON payments (payos_order_code)`, `ALTER TABLE orders ADD is_test integer DEFAULT false NOT NULL`, `ALTER TABLE orders ADD shipping_address text`) + entry journal + schema.ts + `ORDER_SOURCES` + settings schema + Bindings + wrangler.jsonc.
- [ ] **Step 4:** `yarn vitest run` → toàn bộ PASS (test cũ không vỡ).
- [ ] **Step 5: Commit** `feat(api): bảng payments + orders.is_test/shipping_address + nguồn web`.

### Task 2: `lib/payos.ts` + `lib/phone.ts`

**Files:**
- Create: `api/src/lib/payos.ts`, `api/src/lib/phone.ts`
- Test: `api/tests/payos.test.ts`, `api/tests/phone.test.ts`

**Interfaces:**
- Produces:
  - `hmacHex(key: string, data: string): Promise<string>`
  - `signPaymentRequest(key: string, p: { amount: number; cancelUrl: string; description: string; orderCode: number; returnUrl: string }): Promise<string>` (chuỗi `amount=..&cancelUrl=..&description=..&orderCode=..&returnUrl=..`)
  - `webhookDataString(data: Record<string, unknown>): string` (key sort a→z; `null`/`undefined`/`"null"`/`"undefined"` → `''`; mảng → JSON với key object bên trong đã sort; còn lại `String(v)`; không URL-encode)
  - `verifyWebhook(key: string, body: { data: Record<string, unknown>; signature: string }): Promise<boolean>`
  - `type PayosCreds = { clientId: string; apiKey: string; checksumKey: string }`; `payosCreds(env: Bindings): PayosCreds | null` (null nếu thiếu bất kỳ key nào)
  - `createPaymentLink(creds, p: { orderCode: number; amount: number; description: string; returnUrl: string; cancelUrl: string; expiredAt: number }): Promise<{ checkoutUrl: string; qrCode: string; paymentLinkId: string }>`, ném `PayosError` khi HTTP lỗi hoặc `code !== '00'`
  - `getPaymentInfo(creds, orderCode: number): Promise<{ status: string; amount: number; amountPaid: number }>`
  - `PAYOS_DESCRIPTION = 'ICHIGO'`, `PAYOS_BASE = 'https://api-merchant.payos.vn'`
  - `normalizePhone(raw: string): string` (bỏ mọi ký tự không phải số; `84` + 9 số → `0` + 9 số); `isValidVnPhone(raw: string): boolean` (`/^0[35789]\d{8}$/` sau normalize)

- [ ] **Step 1: Viết test hỏng** (vector đã tính sẵn bằng Python HMAC, key `test-checksum`):

```ts
it('ký payment request đúng chuẩn payOS', async () => {
  expect(await signPaymentRequest('test-checksum', {
    amount: 2000, cancelUrl: 'https://ichigostudio.vn/thanh-toan/p1', description: 'ICHIGO',
    orderCode: 17610000000001, returnUrl: 'https://ichigostudio.vn/thanh-toan/p1',
  })).toBe('970211cf112f5ddebc687abeab3d814c0cfcd853abe48cb9956eec4cc6af5ad1')
})
const data = { orderCode: 17610000000001, amount: 2000, description: 'ICHIGO', accountNumber: '12345678',
  reference: 'TF230204212323', transactionDateTime: '2026-10-23 10:00:00', currency: 'VND',
  paymentLinkId: 'abc123', code: '00', desc: 'success', counterAccountBankId: '', counterAccountBankName: '',
  counterAccountName: null, counterAccountNumber: null, virtualAccountName: '', virtualAccountNumber: '' }
it('verifyWebhook chấp nhận chữ ký đúng', async () => {
  expect(await verifyWebhook('test-checksum', { data, signature: '1c1bab9a37f77ebe5dbf991247b58fbd88ead5a3e02d5d0cba1783ce5c6a859d' })).toBe(true)
})
it('verifyWebhook từ chối khi sửa amount', async () => {
  expect(await verifyWebhook('test-checksum', { data: { ...data, amount: 1 }, signature: '1c1bab9a37f77ebe5dbf991247b58fbd88ead5a3e02d5d0cba1783ce5c6a859d' })).toBe(false)
})
it('createPaymentLink gửi header + signature, trả checkoutUrl/qrCode', /* stubGlobal fetch, assert URL `${PAYOS_BASE}/v2/payment-requests`, headers x-client-id/x-api-key, body.signature, body.expiredAt */)
it('createPaymentLink ném PayosError khi code !== "00"', /* fetch trả { code: '20', desc: 'x' } */)
```
`phone.test.ts`: `normalizePhone('+84 912 345 678') === '0912345678'`, `normalizePhone('0912.345.678') === '0912345678'`, `normalizePhone('84912345678') === '0912345678'`; `isValidVnPhone('0912345678') === true`, `isValidVnPhone('0212345678') === false`, `isValidVnPhone('091234') === false`.
- [ ] **Step 2:** `yarn vitest run tests/payos.test.ts tests/phone.test.ts` → FAIL.
- [ ] **Step 3:** Implement (WebCrypto `importKey('raw', ..., {name:'HMAC', hash:'SHA-256'})`, so sánh chuỗi hex timing-safe như `lib/meta.ts`).
- [ ] **Step 4:** Chạy lại → PASS.
- [ ] **Step 5: Commit** `feat(api): payOS client (ký/verify WebCrypto) + chuẩn hoá SĐT`.

### Task 3: `lib/checkout.ts` — tính giỏ + tìm/tạo khách

**Files:**
- Create: `api/src/lib/checkout.ts`
- Test: `api/tests/checkout-lib.test.ts`

**Interfaces:**
- Consumes: `normalizePhone` (Task 2), `payments`/`products`/`customers` (Task 1).
- Produces:
  - `priceCart(db: Db, items: { productId: string; qty: number }[], opts: { allowDraft: boolean }): Promise<{ ok: true; lines: CartPayload['items']; amount: number } | { ok: false; unavailable: string[] }>`: gộp trùng `productId` (cộng qty, cắt ở 10); SP hợp lệ = tồn tại, `price > 0`, `status === 'published'` hoặc (`allowDraft` và `status === 'draft'`); `title`/`unitPrice` lấy từ DB.
  - `findOrCreateCustomer(db: Db, c: { name: string; phone: string; address: string }): Promise<string>`: so `normalizePhone` với mọi `customers.phone` khác null; khớp thì trả id, **không ghi đè**; không khớp thì insert (phone đã normalize).
  - `newPayosOrderCode(): number` = `Date.now() * 10 + Math.floor(Math.random() * 10)`
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
  - `markPaid(env: Bindings, paymentId: string, info: { reference?: string | null; raw?: unknown }): Promise<{ orderId: string; code: string; created: boolean }>` trong `lib/checkout.ts`:
    1. set `payments.status='paid'`, `paidAt` (nếu chưa set), `reference`, `rawWebhook` (chưa set `orderId` vì FK tới `orders` sẽ hỏng khi đơn chưa tồn tại);
    2. nếu đã có `orders.id = paymentId` → trả `{ created: false }`;
    3. `db.batch([insert order, insert order_items, update payments.orderId = paymentId])` để cả ba cùng thành công. Order: `id = paymentId`, `code = nextOrderCode`, `source: 'web'`, `status: 'pending'`, `paymentStatus: 'paid'`, `discount: 0`, `deposit: 0`, `note: payload.customer.note`, `shippingAddress`, `isTest`, `customerName/customerPhone` từ payload, `customerId` từ `findOrCreateCustomer`; items từ `payload.items`. Nếu lỗi UNIQUE: `orders.id` đã tồn tại → `{ created: false }`; trùng `code` → thử lại tối đa 3 lần;
    4. chỉ khi `created`: `notifyAdmins` với `{ title: 'Đơn web mới' + (isTest ? ' (TEST)' : ''), body: \`${code} · ${formatVnd(amount)} · ${name}\`, tag: \`order-${orderId}\`, url: \`/don-hang/${orderId}\` }` (bọc try/catch, lỗi push không làm hỏng đơn).
  - `loadOrderDetail` trả thêm `payment: { payosOrderCode: number; reference: string | null; paidAt: number | null; amount: number } | null`.

- [ ] **Step 1: Viết test hỏng:**
  - Seed payment `pending`, payload 1 món 150000×2 → `markPaid` → `created === true`, `code` khớp `/^DH-\d{4}$/`, order có `source 'web'`, `paymentStatus 'paid'`, `shippingAddress` đúng, 1 order_item; payment `status 'paid'`, `orderId === paymentId`.
  - **Gọi `markPaid` lần 2** → `created === false`, cùng `code`, `select count(*) from orders` vẫn 1.
  - Payment đã `expired` (expiresAt quá khứ) → `markPaid` vẫn tạo đơn.
  - Payment `isTest: true` → order `isTest === true`.
  - `orders.test.ts`: GET `/orders/:id` của đơn web có `payment.payosOrderCode`; đơn admin thường có `payment === null`.
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
- Consumes: Task 1–4.
- Produces (HTTP):
  - `GET /public/checkout/config?key=` → `{ enabled: boolean; testMode: boolean }`. `enabled = settings.enabled && payosCreds(env) !== null`; `testMode = testKey !== '' && key === testKey && payosCreds !== null`.
  - `GET /public/checkout/test-products?key=` → 403 nếu không testMode; ngược lại `{ items: { id, slug, title, price, cover }[] }` gồm SP `draft` có `price > 0`.
  - `POST /public/checkout` body `checkoutInputSchema` = `{ items: {productId: string; qty: int 1..10}[] (1..20), name: string 1..100 (trim), phone: string (refine isValidVnPhone), address: string 5..300, note?: string ≤500, testKey?: string }` →
    - 429 `{error:'rate_limited'}` nếu limiter từ chối;
    - 503 `{error:'payment_not_configured'}` nếu thiếu key; 403 `{error:'checkout_disabled'}` nếu không enabled và không testMode;
    - 409 `{error:'product_unavailable', productIds}` từ `priceCart` (`allowDraft = testMode`);
    - insert payment `pending` (`expiresAt = now + 15 phút`, `isTest = testMode`, payload với `phone` đã normalize) → `createPaymentLink` (`returnUrl = cancelUrl = \`${STORE_URL}/thanh-toan/${id}\``, `expiredAt` = giây) → update `checkoutUrl/qrCode/paymentLinkId` → 201 `{ id, amount, qrCode, checkoutUrl, expiresAt }`;
    - payOS lỗi → **xoá** payment vừa tạo, 502 `{error:'payment_provider_error'}`.
  - `GET /public/checkout/:id` → `{ id, status, amount, qrCode, checkoutUrl, expiresAt, orderCode: string | null, isTest }`; 404 nếu không có. Nếu `pending` và `lastCheckedAt` trống hoặc cũ hơn 10 giây: gọi `getPaymentInfo`; `status === 'PAID'` hoặc `amountPaid >= amount` → `markPaid`; cập nhật `lastCheckedAt`; lỗi payOS bị nuốt (log). Nếu vẫn `pending` mà `now > expiresAt` → set `expired`. Không trả thông tin khách.
  - `lib/rate-limit.ts`: `allow(env: Bindings, key: string): Promise<boolean>` (không có `PUBLIC_LIMITER` → true); key = `${scope}:${cf-connecting-ip ?? 'unknown'}`.
  - `GET/PUT /settings/checkout` (GET mở cho admin đã đăng nhập; PUT gate `settings`).

- [ ] **Step 1: Viết test hỏng** (env override: `{ ...env, PAYOS_CLIENT_ID: 'c', PAYOS_API_KEY: 'k', PAYOS_CHECKSUM_KEY: 'test-checksum' }`, `vi.stubGlobal('fetch', ...)` giả payOS):
  - config: settings mặc định → `{enabled:false,testMode:false}`; bật enabled + đủ key → `enabled:true`; thiếu key → `enabled:false`.
  - POST hợp lệ → 201, `amount` = giá DB (gửi kèm field lạ `unitPrice: 1` bị bỏ qua), payment `pending` trong DB, fetch payOS nhận `amount` đúng.
  - SP giá null trong giỏ → 409 kèm `productIds`.
  - payOS trả lỗi → 502 **và** bảng `payments` rỗng.
  - Thiếu key → 503; enabled=false, không testKey → 403.
  - testKey đúng + SP draft giá 2000 → 201, payment `isTest === true`; testKey sai → 403.
  - SĐT `'12345'` → 400.
  - Limiter giả `{ limit: async () => ({ success: false }) }` → 429.
  - GET `/:id` pending, fetch payOS trả `{ code:'00', data:{ status:'PAID', amount:2000, amountPaid:2000 } }` → `status 'paid'`, `orderCode` khớp `/^DH-/`; GET lần 2 trong 10 giây không gọi fetch nữa.
  - GET `/:id` pending quá hạn, payOS trả `PENDING` → `status 'expired'`.
  - settings: PUT `{ enabled: true, testKey: 'short' }` → 400; PUT hợp lệ rồi GET trả lại đúng.
- [ ] **Step 2:** Chạy → FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** `yarn vitest run` → PASS.
- [ ] **Step 5: Commit** `feat(api): public checkout payOS + cấu hình bán hàng web`.

### Task 6: Webhook payOS

**Files:**
- Create: `api/src/routes/payos.ts`
- Modify: `api/src/index.ts` (`app.route('/payos', payosRoutes)`)
- Test: `api/tests/payos-webhook.test.ts`

**Interfaces:**
- Consumes: `verifyWebhook`, `payosCreds` (Task 2), `markPaid`, `notifyAdmins` (Task 4).
- Produces: `POST /payos/webhook` (URL khai báo với payOS: `https://ichigo-studio-api.cuongyo19997.workers.dev/payos/webhook`). Luôn trả 200 `{ ok: true }` khi chữ ký hợp lệ (để payOS không retry vô hạn), 400 khi body hỏng, 401 khi chữ ký sai, 503 khi thiếu key.
  - `data.code !== '00'` → 200, bỏ qua.
  - Tìm payment theo `payos_order_code = data.orderCode`:
    - có, `kind='cart'`, `data.amount === payment.amount` → `markPaid(env, id, { reference: data.reference, raw: body })`;
    - có nhưng lệch số tiền → set `status='needs_review'`, `rawWebhook`, push `{ title: 'Có khoản thanh toán cần kiểm tra', body: \`payOS ${orderCode} · ${formatVnd(data.amount)}\`, tag: \`payment-${id}\`, url: '/don-hang' }`, **không** tạo đơn;
    - không có → insert payment `kind='unknown'`, `status='needs_review'`, `amount=data.amount`, `payosOrderCode=data.orderCode` (bỏ qua nếu trùng), push tương tự. (Webhook mẫu khi đăng ký URL sẽ rơi vào đây → một push "cần kiểm tra", ghi trong runbook là bình thường.)

- [ ] **Step 1: Viết test hỏng** (ký body bằng `hmacHex('test-checksum', webhookDataString(data))`):
  - chữ ký đúng, khớp payment → 200, có order; gửi lại y hệt → 200, vẫn 1 order.
  - chữ ký sai → 401, không order.
  - amount lệch → 200, payment `needs_review`, 0 order.
  - orderCode lạ → 200, có payment `kind 'unknown'`.
  - payment `expired` nhận webhook hợp lệ → có order.
- [ ] **Step 2:** Chạy → FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Chạy → PASS.
- [ ] **Step 5: Commit** `feat(api): webhook payOS xác nhận thanh toán`.

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
- OrderDetail: dòng "Địa chỉ giao" (`shippingAddress`) trong khối khách hàng; khối "Thanh toán payOS" khi có `payment`: mã payOS, mã giao dịch ngân hàng (`reference`), thời điểm trả, số tiền; badge `Đơn test` nếu `isTest`.
- Settings: card "Bán hàng trên web": Switch "Bật giỏ hàng cho khách"; ô test key (readonly) + nút "Tạo key mới" + dòng link `https://ichigostudio.vn/dat-thu?key=<testKey>` với nút Copy; ghi chú "Đơn đặt qua link thử được đánh dấu TEST và không tính vào thống kê."

- [ ] **Step 1: Viết test hỏng** trong `orders.test.ts`: `ORDER_SOURCE_LABELS.web === 'Web'`; `generateTestKey()` dài 24 và khớp `/^[a-z0-9]{24}$/`, hai lần gọi khác nhau.
- [ ] **Step 2:** `yarn vitest run src/lib/orders.test.ts` → FAIL.
- [ ] **Step 3:** Implement lib + 3 trang.
- [ ] **Step 4:** `yarn vitest run` → PASS; `yarn build` → in ra dòng `built in` (vue-tsc sạch, xem cảnh báo vue-tsc ở memory: build fail thì deploy đẩy dist cũ).
- [ ] **Step 5: Commit** `feat(admin): đơn web, cờ test, thanh toán payOS, cấu hình bán hàng web`.

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
- Create: `store/pages/gio-hang.vue`, `store/pages/thanh-toan/index.vue`, `store/pages/thanh-toan/[id].vue`, `store/components/PaymentQr.client.vue`
- Modify: `store/package.json` (`yarn add qrcode@1.5.4` + `yarn add -D @types/qrcode`)

**Interfaces:**
- Consumes: Task 9, 10; API `POST /public/checkout`, `GET /public/checkout/:id`.
- Produces: localStorage `ichigo.pendingCheckout.v1` = `{ id: string; phone: string }` (để trang chờ biết SĐT khi lưu đơn).

Hành vi:
- `/gio-hang`: danh sách dòng (ảnh, tên link SP, đơn giá, stepper qty 1–10, xoá), dòng "không còn bán" cho `unavailable` + nút xoá, tạm tính, dòng `Phí ship bạn trả khi nhận hàng.`, nút `Đặt hàng` → `/thanh-toan` (disabled nếu giỏ rỗng hoặc còn dòng unavailable). Giỏ rỗng: lời nhắn + link `/san-pham`.
- `/thanh-toan`: form Họ tên, Số điện thoại (`inputmode="tel"`, validate `isValidVnPhone`), Địa chỉ nhận hàng (textarea), Ghi chú (tùy chọn); tóm tắt đơn; dòng ship; nút `Thanh toán bằng QR`. Gửi `{ items: entries, name, phone, address, note, testKey? }`. GA4 `begin_checkout` khi vào trang. Lỗi: 409 → đánh dấu SP không còn bán, quay về giỏ; 429 → "Bạn thao tác hơi nhanh, thử lại sau ít phút."; 502/503/khác → "Chưa tạo được mã thanh toán. Bạn thử lại hoặc nhắn Messenger cho shop." + MessengerButton. Thành công → lưu pendingCheckout → `navigateTo('/thanh-toan/' + id)`. Label gắn `for`/`id`, lỗi có `aria-live="polite"`.
- `/thanh-toan/[id]`: poll `GET /public/checkout/:id` mỗi 3 giây (dừng khi rời trang hoặc status khác `pending`).
  - `pending`: `<PaymentQr :value="qrCode" />` (dynamic import `qrcode`, `toDataURL`, `alt="Mã QR thanh toán"`), số tiền, đếm ngược tới `expiresAt`, nút `Mở trang thanh toán` (`checkoutUrl`, tab mới), hướng dẫn "Mở app ngân hàng, quét mã. Không sửa số tiền và nội dung chuyển khoản."
  - `paid`: trang cảm ơn: mã đơn lớn, `Shop sẽ gọi cho bạn để xác nhận đơn.`, dòng ship, link `/don-hang`. Lần đầu thấy `paid`: `useSavedOrders().save({ code, phone })`, `useCart().clear()`, xoá pendingCheckout, GA4 `purchase` `{ transaction_id: orderCode, currency: 'VND', value: amount }` (chỉ bắn nếu code chưa có trong saved orders).
  - `expired` / `cancelled`: "Mã QR đã hết hạn." + nút `Tạo mã mới` (về `/thanh-toan`, giỏ vẫn còn). Kèm dòng "Nếu bạn đã chuyển khoản, đừng lo: đơn vẫn được ghi nhận, shop sẽ liên hệ." (vì đã trả sau hạn vẫn tạo đơn).
- Cả 3 trang: `useSeoMeta({ robots: 'noindex, nofollow' })`.

- [ ] **Step 1:** Implement 3 trang + PaymentQr.
- [ ] **Step 2:** `yarn build` thành công; kiểm tra chunk `qrcode` chỉ nằm trong chunk async (không có trong entry).
- [ ] **Step 3:** Kiểm tay với test key + SP draft 2.000đ (khi đã có key payOS ở `.dev.vars`; chưa có thì kiểm tới bước hiển thị lỗi 503 thân thiện): giỏ → form (thử SĐT sai báo lỗi) → QR hiện → đếm ngược chạy.
- [ ] **Step 4:** `yarn test` PASS.
- [ ] **Step 5: Commit** `feat(store): trang giỏ, checkout và chờ thanh toán QR payOS`.

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

- [ ] **Step 1: Hỏi chủ shop** đã có 3 key payOS chưa và có đồng ý deploy không. Chưa có thì dừng ở đây.
- [ ] **Step 2: API:** `ls drizzle/` xác nhận số migration → `yarn db:migrate` (áp vào prod **trước**) → `wrangler secret put PAYOS_CLIENT_ID` / `PAYOS_API_KEY` / `PAYOS_CHECKSUM_KEY` → `wrangler deploy`. Kiểm: `curl -s .../public/checkout/config` → `{"enabled":false,"testMode":false}`.
- [ ] **Step 3: Admin:** `npm run build` (thấy `built in`) → `npx wrangler deploy`.
- [ ] **Step 4: Store:** `yarn build` → `npx wrangler deploy`.
- [ ] **Step 5: Webhook:** chủ shop dán `https://ichigo-studio-api.cuongyo19997.workers.dev/payos/webhook` vào kênh thanh toán trên dashboard payOS. payOS gửi webhook mẫu → admin nhận một push "Có khoản thanh toán cần kiểm tra" (bình thường, xác nhận push chạy).
- [ ] **Step 6: Test thật:** admin → Cài đặt → "Tạo key mới" → lưu; tạo SP **nháp** "TEST thanh toán" giá 2.000đ; mở link `/dat-thu?key=...` trên điện thoại → đặt → quét QR trả 2.000đ. Kỳ vọng: trang chuyển "cảm ơn" trong vài giây; push "Đơn web mới (TEST)"; đơn có badge TEST, nguồn Web, khối payOS; `/thong-ke` doanh thu không đổi; `/don-hang` trên store thấy đơn; tra cứu từ máy khác bằng mã + SĐT thấy đơn.
- [ ] **Step 7: Test hết hạn:** tạo đơn thử nhưng không trả, đợi 15 phút → trang báo hết hạn, không có đơn mới trong admin.
- [ ] **Step 8:** Chủ shop tự hủy/xóa đơn test và hoàn 2.000đ nếu muốn, rồi bật Switch "Bật giỏ hàng cho khách". Kiểm trang SP thật có nút "Thêm vào giỏ".
- [ ] **Step 9:** Cập nhật memory (`cart-checkout-payos.md`) với version deploy + trạng thái.
