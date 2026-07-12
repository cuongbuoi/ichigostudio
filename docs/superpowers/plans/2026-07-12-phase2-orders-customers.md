# Ichigo Studio Phase 2 (Orders & Customers) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Thêm quản lý Khách hàng + Đơn hàng (CRM nhập tay) vào `ichigo-studio-api` và `ichigo-studio-admin`: CRUD khách, tạo/sửa/đổi-trạng-thái/xóa đơn với dòng sản phẩm snapshot và tính tiền.

**Architecture:** Mở rộng API Hono + D1 (Drizzle) với 3 bảng mới (customers, orders, order_items), snapshot title/giá/khách trên đơn, tính tiền ở tầng API. Admin Vue 3 + shadcn-vue thêm trang Khách hàng + Đơn hàng dưới DashboardLayout, dùng Pinia + vue-query như Phase 1.

**Tech Stack:** Hono, Drizzle, D1, zod, `@hono/zod-validator`, vitest (`@cloudflare/vitest-pool-workers`) — API. Vue 3, Vite, shadcn-vue, vue-router v5, Pinia, `@tanstack/vue-query`, zod v3, `@lucide/vue`, vitest+happy-dom — admin.

## Global Constraints

- Package manager **yarn** cả 2 repo. TypeScript **strict**.
- Local-first: KHÔNG `wrangler d1 create`/deploy. D1 `database_id` giữ placeholder. Test dùng miniflare local + `applyD1Migrations` từ `./drizzle`.
- Tiền là **integer VND ≥ 0**; `qty` integer ≥ 1. Không có phí ship.
- Trạng thái đơn: `pending|in_progress|ready|delivered|completed|cancelled`. Thanh toán: `unpaid|deposit|paid`.
- Tính tiền: `subtotal=Σ(unitPrice×qty)`, `total=max(0,subtotal−discount)`, `remaining = paymentStatus==='paid' ? 0 : max(0,total−deposit)`. KHÔNG lưu subtotal/total/remaining vào DB — tính khi trả.
- **Snapshot**: `order_items.title/unitPrice`, `orders.customer_name/customer_phone` chụp lúc tạo.
- PATCH cập nhật items theo chiến lược **thay-toàn-bộ** (xóa hết + chèn lại); zod patch mọi field `.optional()` KHÔNG `.default()` (bài học Phase 1: `.partial()` trên field có default gây reset/wipe).
- Copy tiếng Việt có dấu, không em-dash.
- API test pattern (đã có): `import { env } from 'cloudflare:test'`; `app.request(path, { headers }, env)`; seed admin bằng `ensureAdmin(db, 'owner@ichigo.studio','test-pass')` rồi POST `/auth/login` lấy token; reset bảng trong `beforeEach`. `JWT_SECRET` có sẵn trong test env.
- Admin dùng token qua `api` ofetch instance (`@/lib/api`), brand light tokens shadcn, `formatPrice` từ `@/lib/products`.

---

## PHẦN A — ichigo-studio-api

### Task 1: DB schema (customers, orders, order_items) + migration

**Files:**
- Modify: `ichigo-studio-api/src/db/schema.ts`
- Create (generated): `ichigo-studio-api/drizzle/0001_*.sql`
- Test: `ichigo-studio-api/tests/orders-schema.test.ts`

**Interfaces:**
- Produces: tables `customers`, `orders`, `orderItems`; types `Customer`, `Order`, `OrderItem` (+ `New*`) exported from `src/db/schema.ts`.

- [ ] **Step 1: Thêm bảng vào `src/db/schema.ts`** (giữ nguyên products/productImages/users; append)

```typescript
export const customers = sqliteTable('customers', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  phone: text('phone'),
  social: text('social'),
  address: text('address'),
  note: text('note'),
  createdAt: integer('created_at').notNull(),
})

export const orders = sqliteTable('orders', {
  id: text('id').primaryKey(),
  code: text('code').notNull().unique(),
  customerId: text('customer_id').references(() => customers.id, { onDelete: 'set null' }),
  customerName: text('customer_name'),
  customerPhone: text('customer_phone'),
  status: text('status', { enum: ['pending', 'in_progress', 'ready', 'delivered', 'completed', 'cancelled'] })
    .notNull().default('pending'),
  paymentStatus: text('payment_status', { enum: ['unpaid', 'deposit', 'paid'] }).notNull().default('unpaid'),
  discount: integer('discount').notNull().default(0),
  deposit: integer('deposit').notNull().default(0),
  note: text('note'),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
})

export const orderItems = sqliteTable('order_items', {
  id: text('id').primaryKey(),
  orderId: text('order_id').notNull().references(() => orders.id, { onDelete: 'cascade' }),
  productId: text('product_id').references(() => products.id, { onDelete: 'set null' }),
  title: text('title').notNull(),
  unitPrice: integer('unit_price').notNull(),
  qty: integer('qty').notNull(),
})

export type Customer = typeof customers.$inferSelect
export type NewCustomer = typeof customers.$inferInsert
export type Order = typeof orders.$inferSelect
export type NewOrder = typeof orders.$inferInsert
export type OrderItem = typeof orderItems.$inferSelect
```

- [ ] **Step 2: Sinh migration**

Run: `cd ichigo-studio-api && yarn db:generate`
Expected: tạo `drizzle/0001_*.sql` với 3 CREATE TABLE (adding tables — không hỏi tương tác). Xác nhận file có `customers`, `orders`, `order_items`.

- [ ] **Step 3: Test schema `tests/orders-schema.test.ts` (failing)**

```typescript
import { env } from 'cloudflare:test'
import { describe, it, expect } from 'vitest'
import { getDb } from '../src/db/client'
import { customers, orders, orderItems } from '../src/db/schema'

describe('phase2 schema', () => {
  it('inserts customer + order + item and cascades delete', async () => {
    const db = getDb(env.DB)
    const now = 1720000000000
    await db.insert(customers).values({ id: 'c1', name: 'Nam', createdAt: now })
    await db.insert(orders).values({ id: 'o1', code: 'DH-0001', customerId: 'c1', customerName: 'Nam', status: 'pending', paymentStatus: 'unpaid', discount: 0, deposit: 0, createdAt: now, updatedAt: now })
    await db.insert(orderItems).values({ id: 'i1', orderId: 'o1', productId: null, title: 'Set dây', unitPrice: 360000, qty: 2 })
    expect(await db.select().from(orderItems)).toHaveLength(1)
    await db.delete(orders).where(eq(orders.id, 'o1'))
    expect(await db.select().from(orderItems)).toHaveLength(0)
  })
})
```

Thêm `import { eq } from 'drizzle-orm'` ở đầu file test.

- [ ] **Step 4: Chạy test**

Run: `yarn test tests/orders-schema.test.ts`
Expected: PASS (migration mới được `applyD1Migrations` áp tự động vì đọc toàn bộ `./drizzle`).

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat(api): customers/orders/order_items schema + migration"
```

---

### Task 2: Zod schemas + money-compute helper

**Files:**
- Create: `ichigo-studio-api/src/lib/order-total.ts`
- Create: `ichigo-studio-api/src/schemas/customer.ts`
- Create: `ichigo-studio-api/src/schemas/order.ts`
- Test: `ichigo-studio-api/tests/order-total.test.ts`

**Interfaces:**
- Produces: `computeTotals(items, discount, deposit, paymentStatus): { subtotal, total, remaining }` from `src/lib/order-total.ts`; `customerInputSchema`, `customerPatchSchema` from `src/schemas/customer.ts`; `orderInputSchema`, `orderPatchSchema`, `orderStatusSchema`, `ORDER_STATUSES`, `PAYMENT_STATUSES`, type `OrderInput` from `src/schemas/order.ts`.

- [ ] **Step 1: `tests/order-total.test.ts` (failing)**

```typescript
import { describe, it, expect } from 'vitest'
import { computeTotals } from '../src/lib/order-total'

const items = [{ unitPrice: 360000, qty: 2 }, { unitPrice: 100000, qty: 1 }] // subtotal 820000

describe('computeTotals', () => {
  it('subtotal, total after discount, remaining after deposit', () => {
    expect(computeTotals(items, 20000, 300000, 'deposit')).toEqual({ subtotal: 820000, total: 800000, remaining: 500000 })
  })
  it('paid => remaining 0', () => {
    expect(computeTotals(items, 0, 0, 'paid')).toEqual({ subtotal: 820000, total: 820000, remaining: 0 })
  })
  it('never negative', () => {
    expect(computeTotals([{ unitPrice: 100, qty: 1 }], 500, 999, 'deposit')).toEqual({ subtotal: 100, total: 0, remaining: 0 })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn test tests/order-total.test.ts` — FAIL (module missing).

- [ ] **Step 3: `src/lib/order-total.ts`**

```typescript
export interface LineLike { unitPrice: number; qty: number }

export function computeTotals(
  items: LineLike[],
  discount: number,
  deposit: number,
  paymentStatus: string,
): { subtotal: number; total: number; remaining: number } {
  const subtotal = items.reduce((s, i) => s + i.unitPrice * i.qty, 0)
  const total = Math.max(0, subtotal - discount)
  const remaining = paymentStatus === 'paid' ? 0 : Math.max(0, total - deposit)
  return { subtotal, total, remaining }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `yarn test tests/order-total.test.ts` — PASS (3).

- [ ] **Step 5: `src/schemas/customer.ts`**

```typescript
import { z } from 'zod'

const customerFields = {
  name: z.string().min(1),
  phone: z.string().optional(),
  social: z.string().optional(),
  address: z.string().optional(),
  note: z.string().optional(),
}

export const customerInputSchema = z.object(customerFields)

export const customerPatchSchema = z.object({
  name: customerFields.name.optional(),
  phone: customerFields.phone,
  social: customerFields.social,
  address: customerFields.address,
  note: customerFields.note,
})

export type CustomerInput = z.infer<typeof customerInputSchema>
```

- [ ] **Step 6: `src/schemas/order.ts`**

```typescript
import { z } from 'zod'

export const ORDER_STATUSES = ['pending', 'in_progress', 'ready', 'delivered', 'completed', 'cancelled'] as const
export const PAYMENT_STATUSES = ['unpaid', 'deposit', 'paid'] as const

const orderItemInput = z.object({
  productId: z.string().nullable().optional(),
  title: z.string().min(1),
  unitPrice: z.number().int().nonnegative(),
  qty: z.number().int().min(1),
})

const orderFields = {
  customerId: z.string().min(1),
  status: z.enum(ORDER_STATUSES),
  paymentStatus: z.enum(PAYMENT_STATUSES),
  discount: z.number().int().nonnegative(),
  deposit: z.number().int().nonnegative(),
  note: z.string().optional(),
  items: z.array(orderItemInput).min(1),
}

export const orderInputSchema = z.object({
  ...orderFields,
  status: orderFields.status.default('pending'),
  paymentStatus: orderFields.paymentStatus.default('unpaid'),
  discount: orderFields.discount.default(0),
  deposit: orderFields.deposit.default(0),
})

export const orderPatchSchema = z.object({
  customerId: orderFields.customerId.optional(),
  status: orderFields.status.optional(),
  paymentStatus: orderFields.paymentStatus.optional(),
  discount: orderFields.discount.optional(),
  deposit: orderFields.deposit.optional(),
  note: orderFields.note,
  items: orderFields.items.optional(),
})

export const orderStatusSchema = z.object({ status: z.enum(ORDER_STATUSES) })

export type OrderInput = z.infer<typeof orderInputSchema>
```

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "feat(api): order/customer zod schemas + computeTotals helper"
```

---

### Task 3: Customers routes

**Files:**
- Create: `ichigo-studio-api/src/routes/customers.ts`
- Modify: `ichigo-studio-api/src/index.ts`
- Test: `ichigo-studio-api/tests/customers.test.ts`

**Interfaces:**
- Consumes: `requireAuth`, `getDb`, `customers`, `orders`, `customerInputSchema`, `customerPatchSchema`.
- Produces: router mounted `/customers` — `GET /` (`?q=` search name/phone), `GET /:id` (kèm `orders`), `POST /` (201 `{id}`), `PATCH /:id`, `DELETE /:id` (đặt `orders.customer_id=null`).

- [ ] **Step 1: `tests/customers.test.ts` (failing)**

```typescript
import { env } from 'cloudflare:test'
import { describe, it, expect, beforeEach } from 'vitest'
import app from '../src/index'
import { getDb } from '../src/db/client'
import { customers, orders, orderItems, users } from '../src/db/schema'
import { ensureAdmin } from '../src/lib/seed-admin'

async function tokenFor() {
  const db = getDb(env.DB)
  await db.delete(orderItems); await db.delete(orders); await db.delete(customers); await db.delete(users)
  await ensureAdmin(db, 'owner@ichigo.studio', 'test-pass')
  const res = await app.request('/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: 'owner@ichigo.studio', password: 'test-pass' }) }, env)
  return (await res.json<{ token: string }>()).token
}

describe('customers', () => {
  let token: string
  beforeEach(async () => { token = await tokenFor() })
  const auth = () => ({ authorization: `Bearer ${token}`, 'content-type': 'application/json' })

  it('requires auth', async () => {
    expect((await app.request('/customers', {}, env)).status).toBe(401)
  })

  it('creates, lists, searches', async () => {
    const c = await app.request('/customers', { method: 'POST', headers: auth(), body: JSON.stringify({ name: 'Nguyễn Nam', phone: '0900123456' }) }, env)
    expect(c.status).toBe(201)
    await app.request('/customers', { method: 'POST', headers: auth(), body: JSON.stringify({ name: 'Trần Bình', phone: '0911' }) }, env)
    const all = await (await app.request('/customers', { headers: auth() }, env)).json<{ items: any[] }>()
    expect(all.items).toHaveLength(2)
    const q = await (await app.request('/customers?q=nam', { headers: auth() }, env)).json<{ items: any[] }>()
    expect(q.items).toHaveLength(1)
    expect(q.items[0].name).toBe('Nguyễn Nam')
  })

  it('detail includes order history; delete nulls order.customer_id', async () => {
    const { id } = await (await app.request('/customers', { method: 'POST', headers: auth(), body: JSON.stringify({ name: 'Nam' }) }, env)).json<{ id: string }>()
    const db = getDb(env.DB)
    await db.insert(orders).values({ id: 'o1', code: 'DH-0001', customerId: id, customerName: 'Nam', status: 'pending', paymentStatus: 'unpaid', discount: 0, deposit: 0, createdAt: 1, updatedAt: 1 })
    const detail = await (await app.request(`/customers/${id}`, { headers: auth() }, env)).json<any>()
    expect(detail.orders).toHaveLength(1)
    expect((await app.request(`/customers/${id}`, { method: 'DELETE', headers: auth() }, env)).status).toBe(200)
    const o = await db.select().from(orders).where(eq(orders.id, 'o1'))
    expect(o[0].customerId).toBeNull()
  })
})
```

Thêm `import { eq } from 'drizzle-orm'`.

- [ ] **Step 2: Run test — FAIL.**

Run: `yarn test tests/customers.test.ts`

- [ ] **Step 3: `src/routes/customers.ts`**

```typescript
import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { and, desc, eq, like, or } from 'drizzle-orm'
import { z } from 'zod'
import type { Bindings } from '../index'
import { getDb } from '../db/client'
import { customers, orders } from '../db/schema'
import { requireAuth } from '../middleware/require-auth'
import { customerInputSchema, customerPatchSchema } from '../schemas/customer'

export const customerRoutes = new Hono<{ Bindings: Bindings; Variables: { userId: string } }>()
customerRoutes.use('*', requireAuth)

customerRoutes.get('/', zValidator('query', z.object({ q: z.string().optional() })), async (c) => {
  const { q } = c.req.valid('query')
  const db = getDb(c.env.DB)
  const where = q ? or(like(customers.name, `%${q}%`), like(customers.phone, `%${q}%`)) : undefined
  const items = await db.select().from(customers).where(where).orderBy(desc(customers.createdAt))
  return c.json({ items })
})

customerRoutes.get('/:id', async (c) => {
  const db = getDb(c.env.DB)
  const rows = await db.select().from(customers).where(eq(customers.id, c.req.param('id'))).limit(1)
  if (!rows[0]) return c.json({ error: 'not_found' }, 404)
  const history = await db.select().from(orders).where(eq(orders.customerId, rows[0].id)).orderBy(desc(orders.createdAt))
  return c.json({ ...rows[0], orders: history })
})

customerRoutes.post('/', zValidator('json', customerInputSchema), async (c) => {
  const db = getDb(c.env.DB)
  const id = crypto.randomUUID()
  await db.insert(customers).values({ id, ...c.req.valid('json'), createdAt: Date.now() })
  return c.json({ id }, 201)
})

customerRoutes.patch('/:id', zValidator('json', customerPatchSchema), async (c) => {
  const db = getDb(c.env.DB)
  const id = c.req.param('id')
  const rows = await db.select().from(customers).where(eq(customers.id, id)).limit(1)
  if (!rows[0]) return c.json({ error: 'not_found' }, 404)
  const input = c.req.valid('json')
  const set: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(input)) if (v !== undefined) set[k] = v
  if (Object.keys(set).length) await db.update(customers).set(set).where(eq(customers.id, id))
  const updated = await db.select().from(customers).where(eq(customers.id, id)).limit(1)
  return c.json(updated[0])
})

customerRoutes.delete('/:id', async (c) => {
  const db = getDb(c.env.DB)
  const id = c.req.param('id')
  await db.update(orders).set({ customerId: null }).where(eq(orders.customerId, id))
  await db.delete(customers).where(eq(customers.id, id))
  return c.json({ ok: true })
})
```

- [ ] **Step 4: Mount trong `src/index.ts`**

```typescript
import { customerRoutes } from './routes/customers'
// ...
app.route('/customers', customerRoutes)
```

- [ ] **Step 5: Run test — PASS (3).**

Run: `yarn test tests/customers.test.ts`

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat(api): customers CRUD routes + order history + delete-nulls-orders"
```

---

### Task 4: Orders — create, list, get

**Files:**
- Create: `ichigo-studio-api/src/routes/orders.ts`
- Modify: `ichigo-studio-api/src/index.ts`
- Test: `ichigo-studio-api/tests/orders.test.ts`

**Interfaces:**
- Consumes: `requireAuth`, `getDb`, `customers`, `orders`, `orderItems`, `orderInputSchema`, `computeTotals`.
- Produces: router mounted `/orders`; helpers `nextOrderCode(db)`, `loadOrderDetail(db, id)`. `POST /` (201 `{id, code}`); `GET /` (`?status=&payment_status=`, mỗi item kèm `subtotal/total/remaining`); `GET /:id` (order + `items` + `customer` + totals). Full order shape used by Task 5.

- [ ] **Step 1: `tests/orders.test.ts` (failing) — create/list/get**

```typescript
import { env } from 'cloudflare:test'
import { describe, it, expect, beforeEach } from 'vitest'
import app from '../src/index'
import { getDb } from '../src/db/client'
import { customers, orders, orderItems, users } from '../src/db/schema'
import { ensureAdmin } from '../src/lib/seed-admin'

async function setup() {
  const db = getDb(env.DB)
  await db.delete(orderItems); await db.delete(orders); await db.delete(customers); await db.delete(users)
  await ensureAdmin(db, 'owner@ichigo.studio', 'test-pass')
  const res = await app.request('/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: 'owner@ichigo.studio', password: 'test-pass' }) }, env)
  const token = (await res.json<{ token: string }>()).token
  await db.insert(customers).values({ id: 'c1', name: 'Nam', phone: '0900', createdAt: 1 })
  return token
}
const H = (t: string) => ({ authorization: `Bearer ${t}`, 'content-type': 'application/json' })
const sample = () => ({
  customerId: 'c1', status: 'pending', paymentStatus: 'deposit', discount: 20000, deposit: 300000,
  note: 'gấp', items: [{ productId: null, title: 'Set dây', unitPrice: 360000, qty: 2 }, { title: 'Đế', unitPrice: 100000, qty: 1 }],
})

describe('orders create/list/get', () => {
  let t: string
  beforeEach(async () => { t = await setup() })

  it('rejects without auth', async () => {
    expect((await app.request('/orders', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(sample()) }, env)).status).toBe(401)
  })

  it('creates with code, snapshots customer, computes totals', async () => {
    const res = await app.request('/orders', { method: 'POST', headers: H(t), body: JSON.stringify(sample()) }, env)
    expect(res.status).toBe(201)
    const { id, code } = await res.json<{ id: string; code: string }>()
    expect(code).toBe('DH-0001')
    const d = await (await app.request(`/orders/${id}`, { headers: H(t) }, env)).json<any>()
    expect(d.customerName).toBe('Nam')
    expect(d.items).toHaveLength(2)
    expect(d.subtotal).toBe(820000)
    expect(d.total).toBe(800000)
    expect(d.remaining).toBe(500000)
  })

  it('second order gets DH-0002; rejects empty items and bad qty', async () => {
    await app.request('/orders', { method: 'POST', headers: H(t), body: JSON.stringify(sample()) }, env)
    const r2 = await app.request('/orders', { method: 'POST', headers: H(t), body: JSON.stringify(sample()) }, env)
    expect((await r2.json<{ code: string }>()).code).toBe('DH-0002')
    const bad = await app.request('/orders', { method: 'POST', headers: H(t), body: JSON.stringify({ ...sample(), items: [] }) }, env)
    expect(bad.status).toBe(400)
    const badQty = await app.request('/orders', { method: 'POST', headers: H(t), body: JSON.stringify({ ...sample(), items: [{ title: 'x', unitPrice: 1, qty: 0 }] }) }, env)
    expect(badQty.status).toBe(400)
  })

  it('lists with totals and filters by status', async () => {
    await app.request('/orders', { method: 'POST', headers: H(t), body: JSON.stringify(sample()) }, env)
    await app.request('/orders', { method: 'POST', headers: H(t), body: JSON.stringify({ ...sample(), status: 'completed' }) }, env)
    const all = await (await app.request('/orders', { headers: H(t) }, env)).json<{ items: any[] }>()
    expect(all.items).toHaveLength(2)
    expect(all.items[0].total).toBeDefined()
    const done = await (await app.request('/orders?status=completed', { headers: H(t) }, env)).json<{ items: any[] }>()
    expect(done.items).toHaveLength(1)
  })
})
```

- [ ] **Step 2: Run test — FAIL.**

- [ ] **Step 3: `src/routes/orders.ts`** (create/list/get; Task 5 thêm patch/status/delete)

```typescript
import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { and, count, desc, eq, inArray } from 'drizzle-orm'
import { z } from 'zod'
import type { Bindings } from '../index'
import type { Db } from '../db/client'
import { getDb } from '../db/client'
import { customers, orders, orderItems } from '../db/schema'
import { requireAuth } from '../middleware/require-auth'
import { orderInputSchema, ORDER_STATUSES, PAYMENT_STATUSES } from '../schemas/order'
import { computeTotals } from '../lib/order-total'

export const orderRoutes = new Hono<{ Bindings: Bindings; Variables: { userId: string } }>()
orderRoutes.use('*', requireAuth)

async function nextOrderCode(db: Db): Promise<string> {
  const rows = await db.select({ c: count() }).from(orders)
  return `DH-${String((rows[0]?.c ?? 0) + 1).padStart(4, '0')}`
}

export async function loadOrderDetail(db: Db, id: string) {
  const rows = await db.select().from(orders).where(eq(orders.id, id)).limit(1)
  const order = rows[0]
  if (!order) return null
  const items = await db.select().from(orderItems).where(eq(orderItems.orderId, id))
  const customer = order.customerId
    ? (await db.select().from(customers).where(eq(customers.id, order.customerId)).limit(1))[0] ?? null
    : null
  const totals = computeTotals(items, order.discount, order.deposit, order.paymentStatus)
  return { ...order, items, customer, ...totals }
}

orderRoutes.post('/', zValidator('json', orderInputSchema), async (c) => {
  const input = c.req.valid('json')
  const db = getDb(c.env.DB)
  const cust = (await db.select().from(customers).where(eq(customers.id, input.customerId)).limit(1))[0]
  if (!cust) return c.json({ error: 'customer_not_found' }, 400)
  const id = crypto.randomUUID()
  const code = await nextOrderCode(db)
  const now = Date.now()
  await db.insert(orders).values({
    id, code, customerId: cust.id, customerName: cust.name, customerPhone: cust.phone ?? null,
    status: input.status, paymentStatus: input.paymentStatus, discount: input.discount, deposit: input.deposit,
    note: input.note ?? null, createdAt: now, updatedAt: now,
  })
  await db.insert(orderItems).values(input.items.map((it) => ({
    id: crypto.randomUUID(), orderId: id, productId: it.productId ?? null,
    title: it.title, unitPrice: it.unitPrice, qty: it.qty,
  })))
  return c.json({ id, code }, 201)
})

const listQuery = z.object({
  status: z.enum(ORDER_STATUSES).optional(),
  payment_status: z.enum(PAYMENT_STATUSES).optional(),
})

orderRoutes.get('/', zValidator('query', listQuery), async (c) => {
  const { status, payment_status } = c.req.valid('query')
  const db = getDb(c.env.DB)
  const conds = []
  if (status) conds.push(eq(orders.status, status))
  if (payment_status) conds.push(eq(orders.paymentStatus, payment_status))
  const rows = await db.select().from(orders).where(conds.length ? and(...conds) : undefined).orderBy(desc(orders.createdAt))
  const ids = rows.map((r) => r.id)
  const allItems = ids.length ? await db.select().from(orderItems).where(inArray(orderItems.orderId, ids)) : []
  const items = rows.map((o) => {
    const its = allItems.filter((i) => i.orderId === o.id)
    return { ...o, ...computeTotals(its, o.discount, o.deposit, o.paymentStatus) }
  })
  return c.json({ items })
})

orderRoutes.get('/:id', async (c) => {
  const db = getDb(c.env.DB)
  const detail = await loadOrderDetail(db, c.req.param('id'))
  if (!detail) return c.json({ error: 'not_found' }, 404)
  return c.json(detail)
})
```

- [ ] **Step 4: Mount trong `src/index.ts`**

```typescript
import { orderRoutes } from './routes/orders'
// ...
app.route('/orders', orderRoutes)
```

- [ ] **Step 5: Run test — PASS (4).**

Run: `yarn test tests/orders.test.ts`

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat(api): order create/list/get with code, snapshots, computed totals"
```

---

### Task 5: Orders — patch, status, delete

**Files:**
- Modify: `ichigo-studio-api/src/routes/orders.ts`
- Test: `ichigo-studio-api/tests/orders-update.test.ts`

**Interfaces:**
- Consumes: `orderPatchSchema`, `orderStatusSchema`, `loadOrderDetail`, `computeTotals`.
- Produces: `PATCH /:id` (thay-all items khi `items` được gửi; snapshot lại customer nếu đổi `customerId`; trả detail), `PATCH /:id/status` (đổi `status`), `DELETE /:id` (xóa items rồi order).

- [ ] **Step 1: `tests/orders-update.test.ts` (failing)**

```typescript
import { env } from 'cloudflare:test'
import { describe, it, expect, beforeEach } from 'vitest'
import app from '../src/index'
import { getDb } from '../src/db/client'
import { customers, orders, orderItems, users } from '../src/db/schema'
import { ensureAdmin } from '../src/lib/seed-admin'
import { eq } from 'drizzle-orm'

async function setup() {
  const db = getDb(env.DB)
  await db.delete(orderItems); await db.delete(orders); await db.delete(customers); await db.delete(users)
  await ensureAdmin(db, 'owner@ichigo.studio', 'test-pass')
  const token = (await (await app.request('/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: 'owner@ichigo.studio', password: 'test-pass' }) }, env)).json<{ token: string }>()).token
  await db.insert(customers).values({ id: 'c1', name: 'Nam', createdAt: 1 })
  return token
}
const H = (t: string) => ({ authorization: `Bearer ${t}`, 'content-type': 'application/json' })
const sample = () => ({ customerId: 'c1', items: [{ title: 'Set dây', unitPrice: 360000, qty: 2 }] })

async function makeOrder(t: string) {
  return (await (await app.request('/orders', { method: 'POST', headers: H(t), body: JSON.stringify(sample()) }, env)).json<{ id: string }>()).id
}

describe('orders update/status/delete', () => {
  let t: string
  beforeEach(async () => { t = await setup() })

  it('partial PATCH (deposit only) preserves items and status', async () => {
    const id = await makeOrder(t)
    const res = await app.request(`/orders/${id}`, { method: 'PATCH', headers: H(t), body: JSON.stringify({ deposit: 100000 }) }, env)
    expect(res.status).toBe(200)
    const d = await res.json<any>()
    expect(d.deposit).toBe(100000)
    expect(d.items).toHaveLength(1)
    expect(d.status).toBe('pending')
    expect(d.remaining).toBe(620000) // 720000 - 100000
  })

  it('PATCH items replaces them', async () => {
    const id = await makeOrder(t)
    await app.request(`/orders/${id}`, { method: 'PATCH', headers: H(t), body: JSON.stringify({ items: [{ title: 'Mới', unitPrice: 50000, qty: 3 }] }) }, env)
    const d = await (await app.request(`/orders/${id}`, { headers: H(t) }, env)).json<any>()
    expect(d.items).toHaveLength(1)
    expect(d.subtotal).toBe(150000)
  })

  it('PATCH /:id/status changes only status', async () => {
    const id = await makeOrder(t)
    const res = await app.request(`/orders/${id}/status`, { method: 'PATCH', headers: H(t), body: JSON.stringify({ status: 'in_progress' }) }, env)
    expect(res.status).toBe(200)
    expect((await res.json<any>()).status).toBe('in_progress')
  })

  it('DELETE removes order and items', async () => {
    const id = await makeOrder(t)
    expect((await app.request(`/orders/${id}`, { method: 'DELETE', headers: H(t) }, env)).status).toBe(200)
    expect((await app.request(`/orders/${id}`, { headers: H(t) }, env)).status).toBe(404)
    const db = getDb(env.DB)
    expect(await db.select().from(orderItems).where(eq(orderItems.orderId, id))).toHaveLength(0)
  })
})
```

- [ ] **Step 2: Run test — FAIL.**

- [ ] **Step 3: Thêm vào `src/routes/orders.ts`** (import thêm `orderPatchSchema`, `orderStatusSchema`)

```typescript
import { orderInputSchema, orderPatchSchema, orderStatusSchema, ORDER_STATUSES, PAYMENT_STATUSES } from '../schemas/order'

// ... sau GET /:id:

orderRoutes.patch('/:id', zValidator('json', orderPatchSchema), async (c) => {
  const db = getDb(c.env.DB)
  const id = c.req.param('id')
  const existing = (await db.select().from(orders).where(eq(orders.id, id)).limit(1))[0]
  if (!existing) return c.json({ error: 'not_found' }, 404)
  const input = c.req.valid('json')
  const set: Record<string, unknown> = { updatedAt: Date.now() }
  for (const k of ['status', 'paymentStatus', 'discount', 'deposit', 'note'] as const) {
    if (input[k] !== undefined) set[k] = input[k]
  }
  if (input.customerId !== undefined) {
    const cust = (await db.select().from(customers).where(eq(customers.id, input.customerId)).limit(1))[0]
    if (!cust) return c.json({ error: 'customer_not_found' }, 400)
    set.customerId = cust.id; set.customerName = cust.name; set.customerPhone = cust.phone ?? null
  }
  await db.update(orders).set(set).where(eq(orders.id, id))
  if (input.items !== undefined) {
    await db.delete(orderItems).where(eq(orderItems.orderId, id))
    await db.insert(orderItems).values(input.items.map((it) => ({
      id: crypto.randomUUID(), orderId: id, productId: it.productId ?? null,
      title: it.title, unitPrice: it.unitPrice, qty: it.qty,
    })))
  }
  return c.json(await loadOrderDetail(db, id))
})

orderRoutes.patch('/:id/status', zValidator('json', orderStatusSchema), async (c) => {
  const db = getDb(c.env.DB)
  const id = c.req.param('id')
  const existing = (await db.select().from(orders).where(eq(orders.id, id)).limit(1))[0]
  if (!existing) return c.json({ error: 'not_found' }, 404)
  await db.update(orders).set({ status: c.req.valid('json').status, updatedAt: Date.now() }).where(eq(orders.id, id))
  return c.json(await loadOrderDetail(db, id))
})

orderRoutes.delete('/:id', async (c) => {
  const db = getDb(c.env.DB)
  const id = c.req.param('id')
  await db.delete(orderItems).where(eq(orderItems.orderId, id))
  await db.delete(orders).where(eq(orders.id, id))
  return c.json({ ok: true })
})
```

- [ ] **Step 4: Run test — PASS (4). Rồi full `yarn test` (tất cả suites).**

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat(api): order patch (replace items), status update, cascade delete"
```

---

## PHẦN B — ichigo-studio-admin

### Task 6: Data libs + schemas + nav/routes scaffold

**Files:**
- Create: `ichigo-studio-admin/src/lib/customers.ts`
- Create: `ichigo-studio-admin/src/lib/orders.ts`
- Create: `ichigo-studio-admin/src/lib/order-schema.ts`
- Modify: `ichigo-studio-admin/src/router/index.ts`
- Modify: `ichigo-studio-admin/src/layouts/DashboardLayout.vue`
- Create placeholder pages: `src/pages/CustomerListPage.vue`, `CustomerEditPage.vue`, `CustomerDetailPage.vue`, `OrderListPage.vue`, `OrderEditPage.vue`, `OrderDetailPage.vue`
- Test: `ichigo-studio-admin/src/lib/orders.test.ts`

**Interfaces:**
- Produces: `src/lib/customers.ts` — types `Customer`, `CustomerInput`; `fetchCustomers(q?)`, `fetchCustomer(id)`, `createCustomer`, `updateCustomer`, `deleteCustomer`. `src/lib/orders.ts` — types `Order`, `OrderItem`, `OrderInput`, `OrderStatus`, `PaymentStatus`; constants `ORDER_STATUS_LABELS`, `PAYMENT_STATUS_LABELS`, `ORDER_STATUS_VARIANT`; `orderTotals(items, discount, deposit, paymentStatus)`; `fetchOrders(params?)`, `fetchOrder(id)`, `createOrder`, `updateOrder`, `updateOrderStatus`, `deleteOrder`. `src/lib/order-schema.ts` — `orderFormSchema`. Routes + nav wired; pages are stubs (real UI in Tasks 7-10).

- [ ] **Step 1: `src/lib/orders.test.ts` (failing)**

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
const apiMock = vi.fn()
vi.mock('@/lib/api', () => ({ api: (...a: any[]) => apiMock(...a), TOKEN_KEY: 'ichigo_token' }))
import { orderTotals, fetchOrders } from './orders'

describe('orders lib', () => {
  beforeEach(() => apiMock.mockReset())
  it('orderTotals mirrors API math', () => {
    expect(orderTotals([{ unitPrice: 360000, qty: 2 }], 20000, 300000, 'deposit')).toEqual({ subtotal: 720000, total: 700000, remaining: 400000 })
  })
  it('fetchOrders passes filters as query', async () => {
    apiMock.mockResolvedValue({ items: [] })
    await fetchOrders({ status: 'pending' })
    expect(apiMock).toHaveBeenCalledWith('/orders', { query: { status: 'pending' } })
  })
})
```

- [ ] **Step 2: Run — FAIL.**

- [ ] **Step 3: `src/lib/customers.ts`**

```typescript
import { api } from '@/lib/api'

export interface Customer {
  id: string; name: string; phone?: string | null; social?: string | null
  address?: string | null; note?: string | null; createdAt: number
}
export interface CustomerInput {
  name: string; phone?: string; social?: string; address?: string; note?: string
}

export function fetchCustomers(q?: string) {
  return api<{ items: Customer[] }>('/customers', { query: q ? { q } : {} })
}
export function fetchCustomer(id: string) {
  return api<Customer & { orders: any[] }>(`/customers/${id}`)
}
export function createCustomer(input: CustomerInput) {
  return api<{ id: string }>('/customers', { method: 'POST', body: input })
}
export function updateCustomer(id: string, input: Partial<CustomerInput>) {
  return api<Customer>(`/customers/${id}`, { method: 'PATCH', body: input })
}
export function deleteCustomer(id: string) {
  return api<{ ok: true }>(`/customers/${id}`, { method: 'DELETE' })
}
```

- [ ] **Step 4: `src/lib/orders.ts`**

```typescript
import { api } from '@/lib/api'

export type OrderStatus = 'pending' | 'in_progress' | 'ready' | 'delivered' | 'completed' | 'cancelled'
export type PaymentStatus = 'unpaid' | 'deposit' | 'paid'

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'Chờ xác nhận', in_progress: 'Đang làm', ready: 'Xong, chờ giao',
  delivered: 'Đã giao', completed: 'Hoàn tất', cancelled: 'Đã hủy',
}
export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  unpaid: 'Chưa thanh toán', deposit: 'Đã cọc', paid: 'Đã thanh toán',
}
export const ORDER_STATUS_VARIANT: Record<OrderStatus, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  pending: 'secondary', in_progress: 'default', ready: 'default',
  delivered: 'outline', completed: 'default', cancelled: 'destructive',
}

export interface OrderItem { id?: string; productId?: string | null; title: string; unitPrice: number; qty: number }
export interface Order {
  id: string; code: string; customerId?: string | null; customerName?: string | null; customerPhone?: string | null
  status: OrderStatus; paymentStatus: PaymentStatus; discount: number; deposit: number; note?: string | null
  createdAt: number; updatedAt: number
  items?: OrderItem[]; customer?: any
  subtotal?: number; total?: number; remaining?: number
}
export interface OrderInput {
  customerId: string; status: OrderStatus; paymentStatus: PaymentStatus
  discount: number; deposit: number; note?: string; items: OrderItem[]
}

export function orderTotals(items: { unitPrice: number; qty: number }[], discount: number, deposit: number, paymentStatus: string) {
  const subtotal = items.reduce((s, i) => s + i.unitPrice * i.qty, 0)
  const total = Math.max(0, subtotal - discount)
  const remaining = paymentStatus === 'paid' ? 0 : Math.max(0, total - deposit)
  return { subtotal, total, remaining }
}

export function fetchOrders(params?: { status?: OrderStatus; payment_status?: PaymentStatus }) {
  return api<{ items: Order[] }>('/orders', { query: params ?? {} })
}
export function fetchOrder(id: string) {
  return api<Order>(`/orders/${id}`)
}
export function createOrder(input: OrderInput) {
  return api<{ id: string; code: string }>('/orders', { method: 'POST', body: input })
}
export function updateOrder(id: string, input: Partial<OrderInput>) {
  return api<Order>(`/orders/${id}`, { method: 'PATCH', body: input })
}
export function updateOrderStatus(id: string, status: OrderStatus) {
  return api<Order>(`/orders/${id}/status`, { method: 'PATCH', body: { status } })
}
export function deleteOrder(id: string) {
  return api<{ ok: true }>(`/orders/${id}`, { method: 'DELETE' })
}
```

- [ ] **Step 5: `src/lib/order-schema.ts`**

```typescript
import { z } from 'zod'

export const orderFormSchema = z.object({
  customerId: z.string().min(1, 'Chọn khách hàng'),
  status: z.enum(['pending', 'in_progress', 'ready', 'delivered', 'completed', 'cancelled']),
  paymentStatus: z.enum(['unpaid', 'deposit', 'paid']),
  discount: z.number().int().nonnegative(),
  deposit: z.number().int().nonnegative(),
  note: z.string().optional(),
  items: z.array(z.object({
    productId: z.string().nullable().optional(),
    title: z.string().min(1, 'Tên dòng hàng'),
    unitPrice: z.number().int().nonnegative(),
    qty: z.number().int().min(1),
  })).min(1, 'Cần ít nhất 1 sản phẩm'),
})
export type OrderFormValues = z.infer<typeof orderFormSchema>
```

- [ ] **Step 6: Run — PASS (2).**

Run: `yarn vitest run src/lib/orders.test.ts`

- [ ] **Step 7: Routes — `src/router/index.ts`** (thêm children dưới DashboardLayout, sau các route sản phẩm)

```typescript
{ path: 'khach-hang', name: 'customers', component: () => import('@/pages/CustomerListPage.vue') },
{ path: 'khach-hang/moi', name: 'customer-new', component: () => import('@/pages/CustomerEditPage.vue') },
{ path: 'khach-hang/:id', name: 'customer-detail', component: () => import('@/pages/CustomerDetailPage.vue') },
{ path: 'khach-hang/:id/sua', name: 'customer-edit', component: () => import('@/pages/CustomerEditPage.vue') },
{ path: 'don-hang', name: 'orders', component: () => import('@/pages/OrderListPage.vue') },
{ path: 'don-hang/moi', name: 'order-new', component: () => import('@/pages/OrderEditPage.vue') },
{ path: 'don-hang/:id', name: 'order-detail', component: () => import('@/pages/OrderDetailPage.vue') },
{ path: 'don-hang/:id/sua', name: 'order-edit', component: () => import('@/pages/OrderEditPage.vue') },
```

- [ ] **Step 8: Nav — `src/layouts/DashboardLayout.vue`**

Thêm import icons `ShoppingCart`, `Users` (giữ các icon cũ). Thêm vào mảng `nav` (nhóm "Quản lý"): `{ label: 'Đơn hàng', name: 'orders', icon: ShoppingCart }`, `{ label: 'Khách hàng', name: 'customers', icon: Users }`. Trong `soon`: bỏ `ShoppingCart` (Đơn hàng), giữ `Boxes` (Tồn kho) + `Megaphone` (Marketing). Cập nhật `productRouteNames`-style active cho order/customer: thêm hàm nhận biết active để `orders` active khi route ∈ {orders,order-new,order-detail,order-edit}, `customers` tương tự. Thêm nhánh vào `title` computed cho các route mới ('Đơn hàng', 'Khách hàng', 'Tạo đơn hàng', 'Chi tiết đơn', 'Khách hàng mới', ...).

- [ ] **Step 9: Placeholder pages** — mỗi file:

```vue
<template>
  <div class="text-muted-foreground">Trang đang được dựng.</div>
</template>
```

- [ ] **Step 10: `yarn build` + `yarn vitest run` — PASS. Commit.**

```bash
git add -A && git commit -m "feat(admin): orders/customers data libs, schema, nav + routes scaffold"
```

---

### Task 7: Customer pages (list, editor, detail)

**Files:**
- Overwrite: `src/pages/CustomerListPage.vue`, `CustomerEditPage.vue`, `CustomerDetailPage.vue`
- Test: `src/lib/customers.test.ts`

**Interfaces:**
- Consumes: `src/lib/customers.ts`, `formatPrice` (`@/lib/products`), `ORDER_STATUS_LABELS` (`@/lib/orders`), shadcn Card/Table/Button/Input/Label/Badge.

- [ ] **Step 1: `src/lib/customers.test.ts` (failing)**

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
const apiMock = vi.fn()
vi.mock('@/lib/api', () => ({ api: (...a: any[]) => apiMock(...a), TOKEN_KEY: 'ichigo_token' }))
import { fetchCustomers } from './customers'

describe('customers lib', () => {
  beforeEach(() => apiMock.mockReset())
  it('passes search query', async () => {
    apiMock.mockResolvedValue({ items: [] })
    await fetchCustomers('nam')
    expect(apiMock).toHaveBeenCalledWith('/customers', { query: { q: 'nam' } })
  })
})
```

- [ ] **Step 2: Run — FAIL. Then implement, then PASS.**

- [ ] **Step 3: `CustomerListPage.vue`** — search box (`ref q`, vue-query keyed on q), shadcn Table cột Tên/SĐT/Social + nút Chi tiết/Sửa/Xóa (confirm), nút "Thêm khách". Delete qua `useMutation` invalidate `['customers']`.

```vue
<script setup lang="ts">
import { ref, computed } from 'vue'
import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import { useRouter } from 'vue-router'
import { Plus } from '@lucide/vue'
import { fetchCustomers, deleteCustomer } from '@/lib/customers'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

const router = useRouter()
const qc = useQueryClient()
const q = ref('')
const { data, isLoading } = useQuery({
  queryKey: computed(() => ['customers', q.value]),
  queryFn: () => fetchCustomers(q.value || undefined),
})
const del = useMutation({ mutationFn: (id: string) => deleteCustomer(id), onSuccess: () => qc.invalidateQueries({ queryKey: ['customers'] }) })
function onDelete(id: string) { if (confirm('Xóa khách này? Đơn liên quan sẽ mất liên kết khách.')) del.mutate(id) }
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between gap-2">
      <Input v-model="q" placeholder="Tìm theo tên hoặc SĐT..." class="max-w-xs" />
      <Button @click="router.push({ name: 'customer-new' })"><Plus />Thêm khách</Button>
    </div>
    <p v-if="isLoading" class="text-muted-foreground">Đang tải...</p>
    <Table v-else>
      <TableHeader><TableRow><TableHead>Tên</TableHead><TableHead>SĐT</TableHead><TableHead>Kênh</TableHead><TableHead></TableHead></TableRow></TableHeader>
      <TableBody>
        <TableRow v-for="ct in data?.items ?? []" :key="ct.id">
          <TableCell class="font-medium">{{ ct.name }}</TableCell>
          <TableCell>{{ ct.phone || '—' }}</TableCell>
          <TableCell>{{ ct.social || '—' }}</TableCell>
          <TableCell class="text-right space-x-2">
            <Button size="sm" variant="outline" @click="router.push({ name: 'customer-detail', params: { id: ct.id } })">Chi tiết</Button>
            <Button size="sm" variant="outline" @click="router.push({ name: 'customer-edit', params: { id: ct.id } })">Sửa</Button>
            <Button size="sm" variant="destructive" @click="onDelete(ct.id)">Xóa</Button>
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
  </div>
</template>
```

- [ ] **Step 4: `CustomerEditPage.vue`** — create/edit form (name/phone/social/address/note) trong Card, sticky action bar; đọc `route.params.id` để edit. Validate name không rỗng (đơn giản, inline). Trên lưu gọi create/update rồi về `customers`.

```vue
<script setup lang="ts">
import { reactive, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { fetchCustomer, createCustomer, updateCustomer } from '@/lib/customers'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const route = useRoute(); const router = useRouter()
const id = route.params.id as string | undefined
const isEdit = !!id
const form = reactive({ name: '', phone: '', social: '', address: '', note: '' })
const error = ref(''); const saving = ref(false); const loading = ref(isEdit)

onMounted(async () => {
  if (!isEdit) return
  try { const c = await fetchCustomer(id!); Object.assign(form, { name: c.name, phone: c.phone ?? '', social: c.social ?? '', address: c.address ?? '', note: c.note ?? '' }) }
  finally { loading.value = false }
})
async function onSubmit() {
  if (!form.name.trim()) { error.value = 'Tên bắt buộc'; return }
  saving.value = true
  try { if (isEdit) await updateCustomer(id!, form); else await createCustomer(form); router.push({ name: 'customers' }) }
  finally { saving.value = false }
}
</script>

<template>
  <div class="mx-auto max-w-2xl pb-24">
    <p v-if="loading" class="text-muted-foreground">Đang tải...</p>
    <form v-else class="space-y-6" @submit.prevent="onSubmit">
      <Card>
        <CardHeader><CardTitle>Thông tin khách hàng</CardTitle></CardHeader>
        <CardContent class="space-y-5">
          <div class="space-y-2"><Label>Tên</Label><Input v-model="form.name" /><p v-if="error" class="text-sm text-destructive">{{ error }}</p></div>
          <div class="grid gap-5 sm:grid-cols-2">
            <div class="space-y-2"><Label>SĐT</Label><Input v-model="form.phone" /></div>
            <div class="space-y-2"><Label>Facebook/Zalo</Label><Input v-model="form.social" /></div>
          </div>
          <div class="space-y-2"><Label>Địa chỉ</Label><Input v-model="form.address" /></div>
          <div class="space-y-2"><Label>Ghi chú</Label><Input v-model="form.note" /></div>
        </CardContent>
      </Card>
      <div class="sticky bottom-4 z-10 flex justify-end gap-2 rounded-lg border bg-background/80 p-3 shadow-lg backdrop-blur">
        <Button type="button" variant="ghost" @click="router.push({ name: 'customers' })">Hủy</Button>
        <Button type="submit" :disabled="saving">{{ saving ? 'Đang lưu...' : 'Lưu' }}</Button>
      </div>
    </form>
  </div>
</template>
```

- [ ] **Step 5: `CustomerDetailPage.vue`** — thông tin khách + bảng lịch sử đơn (code/tổng(format)/trạng thái(Badge)/ngày), nút Sửa.

```vue
<script setup lang="ts">
import { useQuery } from '@tanstack/vue-query'
import { useRoute, useRouter } from 'vue-router'
import { fetchCustomer } from '@/lib/customers'
import { formatPrice } from '@/lib/products'
import { ORDER_STATUS_LABELS, ORDER_STATUS_VARIANT, orderTotals, type OrderStatus } from '@/lib/orders'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

const route = useRoute(); const router = useRouter()
const id = route.params.id as string
const { data, isLoading } = useQuery({ queryKey: ['customer', id], queryFn: () => fetchCustomer(id) })
function total(o: any) { return orderTotals(o.items ?? [], o.discount, o.deposit, o.paymentStatus).total }
</script>

<template>
  <div v-if="isLoading" class="text-muted-foreground">Đang tải...</div>
  <div v-else-if="data" class="space-y-6">
    <Card>
      <CardHeader class="flex flex-row items-center justify-between">
        <CardTitle>{{ data.name }}</CardTitle>
        <Button size="sm" variant="outline" @click="router.push({ name: 'customer-edit', params: { id } })">Sửa</Button>
      </CardHeader>
      <CardContent class="grid gap-2 text-sm sm:grid-cols-2">
        <div><span class="text-muted-foreground">SĐT:</span> {{ data.phone || '—' }}</div>
        <div><span class="text-muted-foreground">Facebook/Zalo:</span> {{ data.social || '—' }}</div>
        <div class="sm:col-span-2"><span class="text-muted-foreground">Địa chỉ:</span> {{ data.address || '—' }}</div>
        <div class="sm:col-span-2"><span class="text-muted-foreground">Ghi chú:</span> {{ data.note || '—' }}</div>
      </CardContent>
    </Card>
    <Card>
      <CardHeader><CardTitle class="text-base">Lịch sử đơn ({{ data.orders?.length ?? 0 }})</CardTitle></CardHeader>
      <CardContent>
        <Table>
          <TableHeader><TableRow><TableHead>Mã</TableHead><TableHead class="text-right">Tổng</TableHead><TableHead>Trạng thái</TableHead></TableRow></TableHeader>
          <TableBody>
            <TableRow v-for="o in data.orders ?? []" :key="o.id" class="cursor-pointer" @click="router.push({ name: 'order-detail', params: { id: o.id } })">
              <TableCell class="font-medium">{{ o.code }}</TableCell>
              <TableCell class="text-right tabular-nums">{{ formatPrice(total(o)) }}</TableCell>
              <TableCell><Badge :variant="ORDER_STATUS_VARIANT[o.status as OrderStatus]">{{ ORDER_STATUS_LABELS[o.status as OrderStatus] }}</Badge></TableCell>
            </TableRow>
          </TableBody>
        </Table>
        <p v-if="!(data.orders?.length)" class="text-sm text-muted-foreground">Chưa có đơn nào.</p>
      </CardContent>
    </Card>
  </div>
</template>
```

Note: `/customers/:id` trả `orders` KHÔNG kèm `items` (list đơn của khách từ bảng orders). Để `total(o)` đúng cần items — nhưng history rows không có items. Vì vậy hiển thị "—" cho tổng ở lịch sử, HOẶC Task 4's customer detail nên trả kèm tổng. Đơn giản hơn: ở `CustomerDetailPage`, cột Tổng hiển thị `formatPrice(o.total ?? null)` nếu có, ngược lại '—'. Sửa `total(o)` thành: `o.total ?? null`. (History không có items nên bỏ import `orderTotals` nếu không dùng.) Giữ hiển thị mã + trạng thái + ngày là chính.

- [ ] **Step 6: `yarn build` + `yarn vitest run` — PASS. Commit.**

```bash
git add -A && git commit -m "feat(admin): customer list/editor/detail pages"
```

---

### Task 8: Order list page

**Files:**
- Overwrite: `src/pages/OrderListPage.vue`

**Interfaces:**
- Consumes: `fetchOrders`, `deleteOrder`, `ORDER_STATUS_LABELS`, `ORDER_STATUS_VARIANT`, `PAYMENT_STATUS_LABELS`, `ORDER_STATUSES`-style filter, `formatPrice`.

- [ ] **Step 1: Implement `OrderListPage.vue`** — filter trạng thái (nút như ProductList), bảng: Mã / Khách / Tổng(format) / Trạng thái(Badge) / Thanh toán / ngày; click hàng → chi tiết; nút Tạo đơn; xóa qua mutation.

```vue
<script setup lang="ts">
import { ref, computed } from 'vue'
import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import { useRouter } from 'vue-router'
import { Plus } from '@lucide/vue'
import { fetchOrders, deleteOrder, ORDER_STATUS_LABELS, ORDER_STATUS_VARIANT, PAYMENT_STATUS_LABELS, type OrderStatus } from '@/lib/orders'
import { formatPrice } from '@/lib/products'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

const router = useRouter(); const qc = useQueryClient()
const statusFilter = ref<'' | OrderStatus>('')
const filters: Array<{ v: '' | OrderStatus; label: string }> = [
  { v: '', label: 'Tất cả' }, { v: 'pending', label: 'Chờ xác nhận' }, { v: 'in_progress', label: 'Đang làm' },
  { v: 'ready', label: 'Chờ giao' }, { v: 'delivered', label: 'Đã giao' }, { v: 'completed', label: 'Hoàn tất' }, { v: 'cancelled', label: 'Đã hủy' },
]
const { data, isLoading } = useQuery({
  queryKey: computed(() => ['orders', statusFilter.value]),
  queryFn: () => fetchOrders(statusFilter.value ? { status: statusFilter.value } : undefined),
})
const del = useMutation({ mutationFn: (id: string) => deleteOrder(id), onSuccess: () => qc.invalidateQueries({ queryKey: ['orders'] }) })
function onDelete(id: string) { if (confirm('Xóa đơn này?')) del.mutate(id) }
function fmtDate(ms: number) { return new Date(ms).toLocaleDateString('vi-VN') }
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between gap-2">
      <div class="flex flex-wrap gap-2">
        <Button v-for="f in filters" :key="f.v" size="sm" :variant="statusFilter === f.v ? 'default' : 'outline'" @click="statusFilter = f.v">{{ f.label }}</Button>
      </div>
      <Button @click="router.push({ name: 'order-new' })"><Plus />Tạo đơn</Button>
    </div>
    <p v-if="isLoading" class="text-muted-foreground">Đang tải...</p>
    <Table v-else>
      <TableHeader><TableRow>
        <TableHead>Mã</TableHead><TableHead>Khách</TableHead><TableHead class="text-right">Tổng</TableHead>
        <TableHead>Trạng thái</TableHead><TableHead>Thanh toán</TableHead><TableHead>Ngày</TableHead><TableHead></TableHead>
      </TableRow></TableHeader>
      <TableBody>
        <TableRow v-for="o in data?.items ?? []" :key="o.id" class="cursor-pointer" @click="router.push({ name: 'order-detail', params: { id: o.id } })">
          <TableCell class="font-medium">{{ o.code }}</TableCell>
          <TableCell>{{ o.customerName || '—' }}</TableCell>
          <TableCell class="text-right tabular-nums">{{ formatPrice(o.total) }}</TableCell>
          <TableCell><Badge :variant="ORDER_STATUS_VARIANT[o.status]">{{ ORDER_STATUS_LABELS[o.status] }}</Badge></TableCell>
          <TableCell class="text-muted-foreground">{{ PAYMENT_STATUS_LABELS[o.paymentStatus] }}</TableCell>
          <TableCell class="text-muted-foreground">{{ fmtDate(o.createdAt) }}</TableCell>
          <TableCell class="text-right" @click.stop>
            <Button size="sm" variant="destructive" @click="onDelete(o.id)">Xóa</Button>
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
  </div>
</template>
```

- [ ] **Step 2: `yarn build` — PASS. Commit.**

```bash
git add -A && git commit -m "feat(admin): order list page with status filter"
```

---

### Task 9: Order editor (create/edit)

**Files:**
- Overwrite: `src/pages/OrderEditPage.vue`

**Interfaces:**
- Consumes: `fetchOrder`, `createOrder`, `updateOrder`, `orderTotals`, `orderFormSchema`, `fetchCustomers`, `createCustomer`, `fetchProducts` (`@/lib/products`), `formatPrice`, shadcn Card/Select/Input/Label/Button/Dialog.

- [ ] **Step 1: Implement `OrderEditPage.vue`**

Logic:
- Load customers list (vue-query) cho combobox (shadcn Select liệt kê `ct.name — phone`).
- Nút "＋ Khách mới" mở Dialog nhập name/phone → `createCustomer` → refetch customers → chọn id mới.
- Load products list cho Select thêm dòng. Khi chọn product cho 1 dòng: set `title = product.title`, `unitPrice = product.price ?? 0`.
- Dòng hàng: mảng `items` reactive; mỗi dòng có productId?/title/unitPrice/qty + nút xóa; nút "Thêm dòng".
- Panel tóm tắt dùng `orderTotals(items, discount, deposit, paymentStatus)` → subtotal/total/remaining format.
- Validate bằng `orderFormSchema.safeParse`; lỗi → hiện thông báo (đơn giản: alert/inline tổng quát). Lưu → create/update → về `orders`.

```vue
<script setup lang="ts">
import { reactive, ref, computed, onMounted } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { useRoute, useRouter } from 'vue-router'
import { Plus, Trash2 } from '@lucide/vue'
import { fetchOrder, createOrder, updateOrder, orderTotals } from '@/lib/orders'
import { orderFormSchema } from '@/lib/order-schema'
import { fetchCustomers, createCustomer } from '@/lib/customers'
import { fetchProducts, formatPrice } from '@/lib/products'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'

const route = useRoute(); const router = useRouter()
const id = route.params.id as string | undefined
const isEdit = !!id

const form = reactive({
  customerId: '', status: 'pending' as const, paymentStatus: 'unpaid' as 'unpaid' | 'deposit' | 'paid',
  discount: 0, deposit: 0, note: '',
  items: [] as { productId?: string | null; title: string; unitPrice: number; qty: number }[],
})
const error = ref(''); const saving = ref(false); const loading = ref(isEdit)

const { data: customersData, refetch: refetchCustomers } = useQuery({ queryKey: ['customers', ''], queryFn: () => fetchCustomers() })
const { data: productsData } = useQuery({ queryKey: ['products', ''], queryFn: () => fetchProducts() })

onMounted(async () => {
  if (!isEdit) return
  try {
    const o = await fetchOrder(id!)
    Object.assign(form, {
      customerId: o.customerId ?? '', status: o.status, paymentStatus: o.paymentStatus,
      discount: o.discount, deposit: o.deposit, note: o.note ?? '',
      items: (o.items ?? []).map((it) => ({ productId: it.productId ?? null, title: it.title, unitPrice: it.unitPrice, qty: it.qty })),
    })
  } finally { loading.value = false }
})

function addLine() { form.items.push({ productId: null, title: '', unitPrice: 0, qty: 1 }) }
function removeLine(i: number) { form.items.splice(i, 1) }
function onPickProduct(i: number, productId: string) {
  const p = productsData.value?.items.find((x) => x.id === productId)
  if (p) { form.items[i].productId = p.id; form.items[i].title = p.title; form.items[i].unitPrice = p.price ?? 0 }
}

const totals = computed(() => orderTotals(form.items, form.discount, form.deposit, form.paymentStatus))

// new-customer dialog
const showNewCustomer = ref(false)
const newCustomer = reactive({ name: '', phone: '' })
const creatingCustomer = ref(false)
async function saveNewCustomer() {
  if (!newCustomer.name.trim()) return
  creatingCustomer.value = true
  try {
    const { id: cid } = await createCustomer({ name: newCustomer.name, phone: newCustomer.phone || undefined })
    await refetchCustomers()
    form.customerId = cid
    showNewCustomer.value = false; newCustomer.name = ''; newCustomer.phone = ''
  } finally { creatingCustomer.value = false }
}

async function onSubmit() {
  error.value = ''
  const parsed = orderFormSchema.safeParse({ ...form, items: form.items.map((i) => ({ ...i, unitPrice: Number(i.unitPrice), qty: Number(i.qty) })), discount: Number(form.discount), deposit: Number(form.deposit) })
  if (!parsed.success) { error.value = parsed.error.issues[0]?.message ?? 'Dữ liệu chưa hợp lệ'; return }
  saving.value = true
  try { if (isEdit) await updateOrder(id!, parsed.data); else await createOrder(parsed.data); router.push({ name: 'orders' }) }
  finally { saving.value = false }
}
</script>

<template>
  <div class="mx-auto max-w-3xl pb-24">
    <p v-if="loading" class="text-muted-foreground">Đang tải...</p>
    <form v-else class="space-y-6" @submit.prevent="onSubmit">
      <Card>
        <CardHeader><CardTitle>Khách hàng</CardTitle></CardHeader>
        <CardContent class="flex items-end gap-2">
          <div class="flex-1 space-y-2">
            <Label>Chọn khách</Label>
            <Select v-model="form.customerId">
              <SelectTrigger class="w-full"><SelectValue placeholder="Chọn khách hàng" /></SelectTrigger>
              <SelectContent>
                <SelectItem v-for="ct in customersData?.items ?? []" :key="ct.id" :value="ct.id">{{ ct.name }}{{ ct.phone ? ' — ' + ct.phone : '' }}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button type="button" variant="outline" @click="showNewCustomer = true"><Plus />Khách mới</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader class="flex flex-row items-center justify-between">
          <CardTitle>Sản phẩm</CardTitle>
          <Button type="button" size="sm" variant="outline" @click="addLine"><Plus />Thêm dòng</Button>
        </CardHeader>
        <CardContent class="space-y-3">
          <div v-for="(it, i) in form.items" :key="i" class="grid grid-cols-12 items-end gap-2">
            <div class="col-span-5 space-y-1">
              <Label class="text-xs">Sản phẩm</Label>
              <Select :model-value="it.productId ?? ''" @update:model-value="(v) => onPickProduct(i, String(v))">
                <SelectTrigger class="w-full"><SelectValue placeholder="Chọn / tự nhập" /></SelectTrigger>
                <SelectContent>
                  <SelectItem v-for="p in productsData?.items ?? []" :key="p.id" :value="p.id">{{ p.title }}</SelectItem>
                </SelectContent>
              </Select>
              <Input v-model="it.title" placeholder="Tên dòng hàng" class="mt-1" />
            </div>
            <div class="col-span-3 space-y-1"><Label class="text-xs">Đơn giá</Label><Input v-model.number="it.unitPrice" type="number" min="0" /></div>
            <div class="col-span-2 space-y-1"><Label class="text-xs">SL</Label><Input v-model.number="it.qty" type="number" min="1" /></div>
            <div class="col-span-2 flex justify-end"><Button type="button" size="icon" variant="ghost" @click="removeLine(i)"><Trash2 class="size-4" /></Button></div>
          </div>
          <p v-if="!form.items.length" class="text-sm text-muted-foreground">Chưa có dòng nào. Bấm "Thêm dòng".</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Thanh toán</CardTitle></CardHeader>
        <CardContent class="space-y-5">
          <div class="grid gap-5 sm:grid-cols-2">
            <div class="space-y-2"><Label>Giảm giá (₫)</Label><Input v-model.number="form.discount" type="number" min="0" /></div>
            <div class="space-y-2"><Label>Tiền cọc (₫)</Label><Input v-model.number="form.deposit" type="number" min="0" /></div>
          </div>
          <div class="space-y-2">
            <Label>Trạng thái thanh toán</Label>
            <Select v-model="form.paymentStatus">
              <SelectTrigger class="w-full sm:w-56"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="unpaid">Chưa thanh toán</SelectItem>
                <SelectItem value="deposit">Đã cọc</SelectItem>
                <SelectItem value="paid">Đã thanh toán</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div class="space-y-2"><Label>Ghi chú</Label><Input v-model="form.note" /></div>
          <div class="rounded-lg border bg-muted/30 p-4 text-sm">
            <div class="flex justify-between py-0.5"><span class="text-muted-foreground">Tạm tính</span><span class="tabular-nums">{{ formatPrice(totals.subtotal) }}</span></div>
            <div class="flex justify-between py-0.5"><span class="text-muted-foreground">Giảm giá</span><span class="tabular-nums">-{{ formatPrice(form.discount) }}</span></div>
            <div class="flex justify-between py-0.5 font-semibold"><span>Tổng</span><span class="tabular-nums">{{ formatPrice(totals.total) }}</span></div>
            <div class="flex justify-between py-0.5"><span class="text-muted-foreground">Cọc</span><span class="tabular-nums">{{ formatPrice(form.deposit) }}</span></div>
            <div class="flex justify-between py-0.5 text-primary"><span>Còn lại</span><span class="tabular-nums">{{ formatPrice(totals.remaining) }}</span></div>
          </div>
        </CardContent>
      </Card>

      <p v-if="error" class="text-sm text-destructive">{{ error }}</p>
      <div class="sticky bottom-4 z-10 flex justify-end gap-2 rounded-lg border bg-background/80 p-3 shadow-lg backdrop-blur">
        <Button type="button" variant="ghost" @click="router.push({ name: 'orders' })">Hủy</Button>
        <Button type="submit" :disabled="saving">{{ saving ? 'Đang lưu...' : (isEdit ? 'Lưu thay đổi' : 'Tạo đơn') }}</Button>
      </div>
    </form>

    <Dialog v-model:open="showNewCustomer">
      <DialogContent>
        <DialogHeader><DialogTitle>Khách mới</DialogTitle></DialogHeader>
        <div class="space-y-4">
          <div class="space-y-2"><Label>Tên</Label><Input v-model="newCustomer.name" /></div>
          <div class="space-y-2"><Label>SĐT</Label><Input v-model="newCustomer.phone" /></div>
        </div>
        <DialogFooter>
          <Button type="button" variant="ghost" @click="showNewCustomer = false">Hủy</Button>
          <Button type="button" :disabled="creatingCustomer" @click="saveNewCustomer">Tạo</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
```

Note: xác nhận export của `@/components/ui/dialog` có `Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter` (đã add ở Phase 1). Nếu tên khác, điều chỉnh theo `src/components/ui/dialog/index.ts`. Select `@update:model-value` trả `string | number` → ép `String(v)`.

- [ ] **Step 2: `yarn build` — PASS (kiểm tra Select/Dialog/v-model typecheck). Commit.**

```bash
git add -A && git commit -m "feat(admin): order editor with customer picker, line items, live totals"
```

---

### Task 10: Order detail + Overview stats

**Files:**
- Overwrite: `src/pages/OrderDetailPage.vue`
- Modify: `src/pages/OverviewPage.vue`

**Interfaces:**
- Consumes: `fetchOrder`, `updateOrderStatus`, `updateOrder` (đổi paymentStatus), `ORDER_STATUS_LABELS/VARIANT`, `PAYMENT_STATUS_LABELS`, `formatPrice`, `fetchOrders` (overview).

- [ ] **Step 1: `OrderDetailPage.vue`** — hiển thị đơn: header code + Badge trạng thái; khách; bảng items (title × qty × đơn giá = thành tiền); tóm tắt tiền (subtotal/total/deposit/remaining); 2 Select đổi nhanh `status` và `paymentStatus` (mutation → invalidate `['order', id]` + `['orders']`); nút Sửa (→ order-edit), Xóa.

```vue
<script setup lang="ts">
import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import { useRoute, useRouter } from 'vue-router'
import { fetchOrder, updateOrderStatus, updateOrder, deleteOrder, ORDER_STATUS_LABELS, ORDER_STATUS_VARIANT, type OrderStatus, type PaymentStatus } from '@/lib/orders'
import { formatPrice } from '@/lib/products'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const route = useRoute(); const router = useRouter(); const qc = useQueryClient()
const id = route.params.id as string
const { data, isLoading } = useQuery({ queryKey: ['order', id], queryFn: () => fetchOrder(id) })
function invalidate() { qc.invalidateQueries({ queryKey: ['order', id] }); qc.invalidateQueries({ queryKey: ['orders'] }) }
const statusMut = useMutation({ mutationFn: (s: OrderStatus) => updateOrderStatus(id, s), onSuccess: invalidate })
const payMut = useMutation({ mutationFn: (p: PaymentStatus) => updateOrder(id, { paymentStatus: p }), onSuccess: invalidate })
const del = useMutation({ mutationFn: () => deleteOrder(id), onSuccess: () => { qc.invalidateQueries({ queryKey: ['orders'] }); router.push({ name: 'orders' }) } })
function onDelete() { if (confirm('Xóa đơn này?')) del.mutate() }
</script>

<template>
  <div v-if="isLoading" class="text-muted-foreground">Đang tải...</div>
  <div v-else-if="data" class="space-y-6">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <div class="flex items-center gap-3">
        <h2 class="text-xl font-semibold">{{ data.code }}</h2>
        <Badge :variant="ORDER_STATUS_VARIANT[data.status]">{{ ORDER_STATUS_LABELS[data.status] }}</Badge>
      </div>
      <div class="flex gap-2">
        <Button size="sm" variant="outline" @click="router.push({ name: 'order-edit', params: { id } })">Sửa</Button>
        <Button size="sm" variant="destructive" @click="onDelete">Xóa</Button>
      </div>
    </div>

    <div class="grid gap-4 sm:grid-cols-2">
      <Card>
        <CardHeader><CardTitle class="text-base">Khách hàng</CardTitle></CardHeader>
        <CardContent class="space-y-1 text-sm">
          <div class="font-medium">{{ data.customerName || '—' }}</div>
          <div class="text-muted-foreground">{{ data.customerPhone || '' }}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle class="text-base">Thao tác nhanh</CardTitle></CardHeader>
        <CardContent class="space-y-3">
          <div class="space-y-1">
            <span class="text-xs text-muted-foreground">Trạng thái</span>
            <Select :model-value="data.status" @update:model-value="(v) => statusMut.mutate(v as OrderStatus)">
              <SelectTrigger class="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem v-for="(label, key) in ORDER_STATUS_LABELS" :key="key" :value="key">{{ label }}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div class="space-y-1">
            <span class="text-xs text-muted-foreground">Thanh toán</span>
            <Select :model-value="data.paymentStatus" @update:model-value="(v) => payMut.mutate(v as PaymentStatus)">
              <SelectTrigger class="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="unpaid">Chưa thanh toán</SelectItem>
                <SelectItem value="deposit">Đã cọc</SelectItem>
                <SelectItem value="paid">Đã thanh toán</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
    </div>

    <Card>
      <CardHeader><CardTitle class="text-base">Sản phẩm</CardTitle></CardHeader>
      <CardContent>
        <Table>
          <TableHeader><TableRow><TableHead>Tên</TableHead><TableHead class="text-right">Đơn giá</TableHead><TableHead class="text-right">SL</TableHead><TableHead class="text-right">Thành tiền</TableHead></TableRow></TableHeader>
          <TableBody>
            <TableRow v-for="it in data.items ?? []" :key="it.id">
              <TableCell>{{ it.title }}</TableCell>
              <TableCell class="text-right tabular-nums">{{ formatPrice(it.unitPrice) }}</TableCell>
              <TableCell class="text-right tabular-nums">{{ it.qty }}</TableCell>
              <TableCell class="text-right tabular-nums">{{ formatPrice(it.unitPrice * it.qty) }}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
        <div class="mt-4 ml-auto max-w-xs space-y-1 text-sm">
          <div class="flex justify-between"><span class="text-muted-foreground">Tạm tính</span><span class="tabular-nums">{{ formatPrice(data.subtotal) }}</span></div>
          <div class="flex justify-between"><span class="text-muted-foreground">Giảm giá</span><span class="tabular-nums">-{{ formatPrice(data.discount) }}</span></div>
          <div class="flex justify-between font-semibold"><span>Tổng</span><span class="tabular-nums">{{ formatPrice(data.total) }}</span></div>
          <div class="flex justify-between"><span class="text-muted-foreground">Cọc</span><span class="tabular-nums">{{ formatPrice(data.deposit) }}</span></div>
          <div class="flex justify-between text-primary"><span>Còn lại</span><span class="tabular-nums">{{ formatPrice(data.remaining) }}</span></div>
        </div>
        <p v-if="data.note" class="mt-4 text-sm"><span class="text-muted-foreground">Ghi chú:</span> {{ data.note }}</p>
      </CardContent>
    </Card>
  </div>
</template>
```

- [ ] **Step 2: `OverviewPage.vue`** — thêm 2 thẻ: *Đơn chờ xử lý* (đếm order status ∉ {completed,cancelled}) + *Doanh thu* (Σ total các đơn `completed`). Dùng `fetchOrders()` (một query lấy tất cả, kèm total tính sẵn từ API).

Thêm trong `<script setup>`:

```typescript
import { fetchOrders } from '@/lib/orders'
const { data: ordersData } = useQuery({ queryKey: ['orders', ''], queryFn: () => fetchOrders() })
const orderItemsAll = computed(() => ordersData.value?.items ?? [])
const pendingOrders = computed(() => orderItemsAll.value.filter((o) => o.status !== 'completed' && o.status !== 'cancelled').length)
const revenue = computed(() => orderItemsAll.value.filter((o) => o.status === 'completed').reduce((s, o) => s + (o.total ?? 0), 0))
```

Thêm 2 Card (sau grid stat sản phẩm, cạnh "Tổng giá niêm yết"): "Đơn chờ xử lý" hiển thị `pendingOrders`, "Doanh thu (hoàn tất)" hiển thị `formatPrice(revenue)`. Dùng icon `ShoppingCart`, `Wallet`/`TrendingUp` từ `@lucide/vue`.

- [ ] **Step 3: `yarn build` + `yarn vitest run` (toàn bộ) — PASS.**

- [ ] **Step 4: Smoke test thủ công** (không bắt buộc chạy live): xác nhận build sạch. Nếu chạy full stack: seed admin, tạo khách, tạo đơn 2 dòng, kiểm tra tổng/còn lại, đổi trạng thái ở list/detail, xem lịch sử đơn ở trang khách, xem Overview cập nhật.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat(admin): order detail with quick status/payment + overview order stats"
```

---

## Self-Review Notes

- **Spec coverage:** customers table+CRUD+history+delete-null (T1,T3,T7); orders schema+code+snapshot+compute (T1,T2,T4); patch replace-items/status/delete (T5); 5+1 statuses + payment + discount + deposit (T2 schemas, throughout); admin nav enable + routes (T6); customer pages (T7); order list/editor/detail (T8,T9,T10); customer picker + new-customer dialog + line items + live totals (T9); overview stats (T10). No ship fee (absent). Inventory untouched (out of scope, no stock writes anywhere).
- **Type consistency:** `computeTotals`/`orderTotals` identical math both sides; `ORDER_STATUSES`/labels/variants consistent; API returns `subtotal/total/remaining` on list+detail, admin reads `o.total` (list) and `data.subtotal/total/remaining` (detail). `updateOrder(id,{paymentStatus})` matches `orderPatchSchema`. Snapshot fields (`customerName/customerPhone`, item `title/unitPrice`) written on create + re-snapshot customer on PATCH customerId.
- **Ambiguity fixed:** `/customers/:id` history rows lack `items`, so CustomerDetailPage shows `o.total ?? '—'` (does not call orderTotals on item-less rows). Order editor Select emits string|number → coerced. Dialog/Select export names to be verified against `components/ui/*/index.ts` at implementation.
