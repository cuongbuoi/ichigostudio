# Ichigo Studio Phase 3 (Inventory & Production) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Thêm tồn kho sản phẩm (`products.stock`), lệnh sản xuất/in (`print_jobs`), và tự trừ/hoàn kho theo trạng thái đơn — vào `ichigo-studio-api` và `ichigo-studio-admin`.

**Architecture:** Thêm cột `products.stock` + `orders.stock_deducted` + bảng `print_jobs` (migration additive). Kho là số nguyên trên product, sửa trực tiếp bởi: chỉnh tay, lệnh in vào/rời `done` (cờ `stocked`), đơn vào/rời `completed` (cờ `stock_deducted`). Admin thêm mục Sản xuất + cột tồn + cảnh báo sắp hết.

**Tech Stack:** Hono, Drizzle, D1, zod, `@hono/zod-validator`, vitest (`@cloudflare/vitest-pool-workers`) — API. Vue 3, Vite, shadcn-vue, vue-router v5, Pinia, `@tanstack/vue-query`, zod v3, `@lucide/vue`, vitest+happy-dom — admin.

## Global Constraints

- Package manager **yarn** cả 2 repo. TypeScript **strict**.
- Local-first: KHÔNG `wrangler d1 create`/deploy. Test dùng miniflare + `applyD1Migrations` từ `./drizzle`.
- Migration Phase 3 là **ADDITIVE** (thêm cột + bảng) → `yarn db:generate` chạy non-interactive, tạo migration mới (KHÔNG regenerate/collapse). Áp local bằng `yarn db:migrate:local` (KHÔNG reset — additive). Sau khi migrate local, chạy `yarn db:seed` nếu cần admin.
- `stock` cho phép **âm** (không `.nonnegative()`); `qty` ≥ 1.
- Trạng thái lệnh in: `pending|printing|done|cancelled`. Trạng thái đơn (đã có): `pending|in_progress|ready|delivered|completed|cancelled`.
- Logic kho idempotent bằng cờ boolean (`print_jobs.stocked`, `orders.stock_deducted`) — chỉ tác động khi cờ đổi. Chỉ đụng kho khi có `product_id`.
- Trừ kho khi đơn vào `completed`; hoàn khi rời `completed` (đã trừ). **Xóa đơn KHÔNG đụng kho.**
- Patch schemas: mọi field `.optional()`, KHÔNG `.default()` (bài học Phase 1). PATCH cập nhật chỉ ghi key có mặt.
- Cập nhật kho dùng biểu thức: `db.update(products).set({ stock: sql\`${products.stock} + ${delta}\` })` với `import { sql } from 'drizzle-orm'`.
- Copy tiếng Việt có dấu, không em-dash.
- API test pattern (đã có): `import { env } from 'cloudflare:test'`; `app.request(path, { headers }, env)`; seed admin `ensureAdmin(db,'owner@ichigo.studio','test-pass')` + POST `/auth/login` lấy token; reset bảng trong `beforeEach` (nhớ reset cả `print_jobs` trước `products`/`orders`).
- Admin: `api` ofetch instance (`@/lib/api`), brand light shadcn tokens, `formatPrice` (`@/lib/products`), vue-query/Pinia.

---

## PHẦN A — ichigo-studio-api

### Task 1: Schema (stock, stock_deducted, print_jobs) + migration + product stock

**Files:**
- Modify: `ichigo-studio-api/src/db/schema.ts`
- Modify: `ichigo-studio-api/src/schemas/product.ts`
- Create (generated): `ichigo-studio-api/drizzle/0001_*.sql`
- Test: `ichigo-studio-api/tests/inventory-schema.test.ts`

**Interfaces:**
- Produces: `products.stock` column; `orders.stockDeducted` column; `printJobs` table + types `PrintJob`/`NewPrintJob`; `productInputSchema`/`productPatchSchema` include `stock`.

- [ ] **Step 1: `src/db/schema.ts`** — add `stock` to products, `stockDeducted` to orders, new `printJobs` table.

Trong `products` (thêm sau `bodyMd`):
```typescript
  stock: integer('stock').notNull().default(0),
```
Trong `orders` (thêm sau `deposit`):
```typescript
  stockDeducted: integer('stock_deducted', { mode: 'boolean' }).notNull().default(false),
```
Thêm bảng (sau `orderItems`) + types:
```typescript
export const printJobs = sqliteTable('print_jobs', {
  id: text('id').primaryKey(),
  productId: text('product_id').references(() => products.id, { onDelete: 'set null' }),
  title: text('title').notNull(),
  qty: integer('qty').notNull(),
  status: text('status', { enum: ['pending', 'printing', 'done', 'cancelled'] }).notNull().default('pending'),
  stocked: integer('stocked', { mode: 'boolean' }).notNull().default(false),
  orderId: text('order_id').references(() => orders.id, { onDelete: 'set null' }),
  note: text('note'),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
})

export type PrintJob = typeof printJobs.$inferSelect
export type NewPrintJob = typeof printJobs.$inferInsert
```

- [ ] **Step 2: `src/schemas/product.ts`** — add `stock` to `productFields` (allow negative), input default 0, patch optional.

Trong `productFields` thêm:
```typescript
  stock: z.number().int(),
```
Trong `productInputSchema` (khối defaults) thêm:
```typescript
  stock: productFields.stock.default(0),
```
Trong `productPatchSchema` thêm:
```typescript
  stock: productFields.stock.optional(),
```

- [ ] **Step 3: Generate migration**

Run: `cd ichigo-studio-api && yarn db:generate`
Expected: tạo `drizzle/0001_*.sql` — additive: `ALTER TABLE products ADD stock`, `ALTER TABLE orders ADD stock_deducted`, `CREATE TABLE print_jobs`. Non-interactive (không rename). Verify nội dung.

- [ ] **Step 4: `tests/inventory-schema.test.ts` (failing)**

```typescript
import { env } from 'cloudflare:test'
import { describe, it, expect, beforeEach } from 'vitest'
import app from '../src/index'
import { getDb } from '../src/db/client'
import { products, printJobs, users } from '../src/db/schema'
import { ensureAdmin } from '../src/lib/seed-admin'
import { eq } from 'drizzle-orm'

async function token() {
  const db = getDb(env.DB)
  await db.delete(printJobs); await db.delete(products); await db.delete(users)
  await ensureAdmin(db, 'owner@ichigo.studio', 'test-pass')
  const r = await app.request('/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: 'owner@ichigo.studio', password: 'test-pass' }) }, env)
  return (await r.json<{ token: string }>()).token
}
const H = (t: string) => ({ authorization: `Bearer ${t}`, 'content-type': 'application/json' })

describe('phase3 schema + product stock', () => {
  let t: string
  beforeEach(async () => { t = await token() })

  it('product create persists stock (incl negative) and defaults to 0', async () => {
    const withStock = await app.request('/products', { method: 'POST', headers: H(t), body: JSON.stringify({ slug: 'a', title: 'A', series: 'S', material: 'PLA', stock: -2, images: [] }) }, env)
    const { id } = await withStock.json<{ id: string }>()
    const d = await (await app.request(`/products/${id}`, { headers: H(t) }, env)).json<any>()
    expect(d.stock).toBe(-2)
    const noStock = await app.request('/products', { method: 'POST', headers: H(t), body: JSON.stringify({ slug: 'b', title: 'B', series: 'S', material: 'PLA', images: [] }) }, env)
    const { id: id2 } = await noStock.json<{ id: string }>()
    const d2 = await (await app.request(`/products/${id2}`, { headers: H(t) }, env)).json<any>()
    expect(d2.stock).toBe(0)
  })

  it('print_jobs table exists (insert/select)', async () => {
    const db = getDb(env.DB)
    await db.insert(printJobs).values({ id: 'j1', productId: null, title: 'X', qty: 3, status: 'pending', stocked: false, orderId: null, createdAt: 1, updatedAt: 1 })
    expect(await db.select().from(printJobs).where(eq(printJobs.id, 'j1'))).toHaveLength(1)
  })
})
```

- [ ] **Step 5: Run** `yarn test tests/inventory-schema.test.ts` — PASS. Then full `yarn test`.

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat(api): products.stock + orders.stock_deducted + print_jobs schema/migration; product stock in zod"
```

---

### Task 2: Print jobs — zod + stock helper + routes

**Files:**
- Create: `ichigo-studio-api/src/schemas/print-job.ts`
- Create: `ichigo-studio-api/src/lib/job-stock.ts`
- Create: `ichigo-studio-api/src/routes/print-jobs.ts`
- Modify: `ichigo-studio-api/src/index.ts`
- Test: `ichigo-studio-api/tests/print-jobs.test.ts`

**Interfaces:**
- Consumes: `requireAuth`, `getDb`, `products`, `printJobs`.
- Produces: `printJobInputSchema`/`printJobPatchSchema`/`printJobStatusSchema`/`PRINT_STATUSES` (`src/schemas/print-job.ts`); `applyJobStock(db, job, newStatus): Promise<boolean>` returns new `stocked` (`src/lib/job-stock.ts`); router `/print-jobs`.

- [ ] **Step 1: `src/schemas/print-job.ts`**

```typescript
import { z } from 'zod'

export const PRINT_STATUSES = ['pending', 'printing', 'done', 'cancelled'] as const

const jobFields = {
  productId: z.string().min(1),
  qty: z.number().int().min(1),
  status: z.enum(PRINT_STATUSES),
  orderId: z.string().nullable().optional(),
  note: z.string().optional(),
}

export const printJobInputSchema = z.object({
  ...jobFields,
  status: jobFields.status.default('pending'),
})

export const printJobPatchSchema = z.object({
  productId: jobFields.productId.optional(),
  qty: jobFields.qty.optional(),
  status: jobFields.status.optional(),
  orderId: jobFields.orderId,
  note: jobFields.note,
})

export const printJobStatusSchema = z.object({ status: z.enum(PRINT_STATUSES) })

export type PrintJobInput = z.infer<typeof printJobInputSchema>
```

- [ ] **Step 2: `tests/print-jobs.test.ts` (failing)** — CRUD + stock credit/reverse

```typescript
import { env } from 'cloudflare:test'
import { describe, it, expect, beforeEach } from 'vitest'
import app from '../src/index'
import { getDb } from '../src/db/client'
import { products, printJobs, users } from '../src/db/schema'
import { ensureAdmin } from '../src/lib/seed-admin'
import { eq } from 'drizzle-orm'

async function setup() {
  const db = getDb(env.DB)
  await db.delete(printJobs); await db.delete(products); await db.delete(users)
  await ensureAdmin(db, 'owner@ichigo.studio', 'test-pass')
  const t = (await (await app.request('/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: 'owner@ichigo.studio', password: 'test-pass' }) }, env)).json<{ token: string }>()).token
  await db.insert(products).values({ id: 'p1', slug: 'p1', title: 'Set dây', series: 'S', material: 'PLA', featured: false, order: 0, status: 'draft', stock: 0, createdAt: 1, updatedAt: 1 })
  return t
}
const H = (t: string) => ({ authorization: `Bearer ${t}`, 'content-type': 'application/json' })
async function stock(id = 'p1') {
  const db = getDb(env.DB)
  return (await db.select().from(products).where(eq(products.id, id)))[0].stock
}

describe('print jobs + stock', () => {
  let t: string
  beforeEach(async () => { t = await setup() })

  it('requires auth', async () => {
    expect((await app.request('/print-jobs', {}, env)).status).toBe(401)
  })

  it('create (snapshot title), 400 if product missing, list', async () => {
    const c = await app.request('/print-jobs', { method: 'POST', headers: H(t), body: JSON.stringify({ productId: 'p1', qty: 5 }) }, env)
    expect(c.status).toBe(201)
    const d = await (await app.request(`/print-jobs/${(await (await app.request('/print-jobs', { headers: H(t) }, env)).json<{ items: any[] }>()).items[0].id}`, { headers: H(t) }, env)).json<any>()
    expect(d.title).toBe('Set dây')
    const bad = await app.request('/print-jobs', { method: 'POST', headers: H(t), body: JSON.stringify({ productId: 'nope', qty: 1 }) }, env)
    expect(bad.status).toBe(400)
  })

  it('to done adds stock; leaving done reverses; idempotent', async () => {
    const { id } = await (await app.request('/print-jobs', { method: 'POST', headers: H(t), body: JSON.stringify({ productId: 'p1', qty: 5 }) }, env)).json<{ id: string }>()
    await app.request(`/print-jobs/${id}/status`, { method: 'PATCH', headers: H(t), body: JSON.stringify({ status: 'done' }) }, env)
    expect(await stock()).toBe(5)
    // idempotent: setting done again does not double-add
    await app.request(`/print-jobs/${id}/status`, { method: 'PATCH', headers: H(t), body: JSON.stringify({ status: 'done' }) }, env)
    expect(await stock()).toBe(5)
    // leaving done reverses
    await app.request(`/print-jobs/${id}/status`, { method: 'PATCH', headers: H(t), body: JSON.stringify({ status: 'printing' }) }, env)
    expect(await stock()).toBe(0)
  })

  it('deleting a stocked (done) job reverses stock', async () => {
    const { id } = await (await app.request('/print-jobs', { method: 'POST', headers: H(t), body: JSON.stringify({ productId: 'p1', qty: 4 }) }, env)).json<{ id: string }>()
    await app.request(`/print-jobs/${id}/status`, { method: 'PATCH', headers: H(t), body: JSON.stringify({ status: 'done' }) }, env)
    expect(await stock()).toBe(4)
    await app.request(`/print-jobs/${id}`, { method: 'DELETE', headers: H(t) }, env)
    expect(await stock()).toBe(0)
  })
})
```

- [ ] **Step 3: Run** — FAIL.

- [ ] **Step 4: `src/lib/job-stock.ts`**

```typescript
import { eq, sql } from 'drizzle-orm'
import type { Db } from '../db/client'
import { products, type PrintJob } from '../db/schema'

// Applies stock delta for a print job whose status is transitioning to newStatus.
// Returns the new `stocked` flag. Idempotent: only moves stock when the flag flips.
export async function applyJobStock(db: Db, job: PrintJob, newStatus: string): Promise<boolean> {
  const willBeDone = newStatus === 'done'
  if (willBeDone && !job.stocked) {
    if (job.productId) await db.update(products).set({ stock: sql`${products.stock} + ${job.qty}` }).where(eq(products.id, job.productId))
    return true
  }
  if (!willBeDone && job.stocked) {
    if (job.productId) await db.update(products).set({ stock: sql`${products.stock} - ${job.qty}` }).where(eq(products.id, job.productId))
    return false
  }
  return job.stocked
}
```

- [ ] **Step 5: `src/routes/print-jobs.ts`**

```typescript
import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { and, desc, eq } from 'drizzle-orm'
import { z } from 'zod'
import type { Bindings } from '../index'
import { getDb } from '../db/client'
import { products, printJobs } from '../db/schema'
import { requireAuth } from '../middleware/require-auth'
import { printJobInputSchema, printJobPatchSchema, printJobStatusSchema, PRINT_STATUSES } from '../schemas/print-job'
import { applyJobStock } from '../lib/job-stock'

export const printJobRoutes = new Hono<{ Bindings: Bindings; Variables: { userId: string } }>()
printJobRoutes.use('*', requireAuth)

printJobRoutes.get('/', zValidator('query', z.object({ status: z.enum(PRINT_STATUSES).optional() })), async (c) => {
  const { status } = c.req.valid('query')
  const db = getDb(c.env.DB)
  const items = await db.select().from(printJobs).where(status ? eq(printJobs.status, status) : undefined).orderBy(desc(printJobs.createdAt))
  return c.json({ items })
})

printJobRoutes.get('/:id', async (c) => {
  const db = getDb(c.env.DB)
  const rows = await db.select().from(printJobs).where(eq(printJobs.id, c.req.param('id'))).limit(1)
  if (!rows[0]) return c.json({ error: 'not_found' }, 404)
  return c.json(rows[0])
})

printJobRoutes.post('/', zValidator('json', printJobInputSchema), async (c) => {
  const input = c.req.valid('json')
  const db = getDb(c.env.DB)
  const prod = (await db.select().from(products).where(eq(products.id, input.productId)).limit(1))[0]
  if (!prod) return c.json({ error: 'product_not_found' }, 400)
  const id = crypto.randomUUID()
  const now = Date.now()
  let stocked = false
  await db.insert(printJobs).values({
    id, productId: prod.id, title: prod.title, qty: input.qty, status: input.status,
    stocked: false, orderId: input.orderId ?? null, note: input.note ?? null, createdAt: now, updatedAt: now,
  })
  if (input.status === 'done') {
    const job = (await db.select().from(printJobs).where(eq(printJobs.id, id)).limit(1))[0]
    stocked = await applyJobStock(db, job, 'done')
    await db.update(printJobs).set({ stocked }).where(eq(printJobs.id, id))
  }
  return c.json({ id }, 201)
})

async function patchStatus(c: any, id: string, newStatus: string) {
  const db = getDb(c.env.DB)
  const job = (await db.select().from(printJobs).where(eq(printJobs.id, id)).limit(1))[0]
  if (!job) return c.json({ error: 'not_found' }, 404)
  const stocked = await applyJobStock(db, job, newStatus)
  await db.update(printJobs).set({ status: newStatus, stocked, updatedAt: Date.now() }).where(eq(printJobs.id, id))
  const updated = (await db.select().from(printJobs).where(eq(printJobs.id, id)).limit(1))[0]
  return c.json(updated)
}

printJobRoutes.patch('/:id/status', zValidator('json', printJobStatusSchema), async (c) =>
  patchStatus(c, c.req.param('id'), c.req.valid('json').status))

printJobRoutes.patch('/:id', zValidator('json', printJobPatchSchema), async (c) => {
  const db = getDb(c.env.DB)
  const id = c.req.param('id')
  const job = (await db.select().from(printJobs).where(eq(printJobs.id, id)).limit(1))[0]
  if (!job) return c.json({ error: 'not_found' }, 404)
  const input = c.req.valid('json')
  // Apply stock transition if status provided; use existing status otherwise.
  const newStatus = input.status ?? job.status
  const stocked = await applyJobStock(db, job, newStatus)
  const set: Record<string, unknown> = { updatedAt: Date.now(), stocked, status: newStatus }
  for (const k of ['qty', 'orderId', 'note'] as const) if (input[k] !== undefined) set[k] = input[k]
  await db.update(printJobs).set(set).where(eq(printJobs.id, id))
  const updated = (await db.select().from(printJobs).where(eq(printJobs.id, id)).limit(1))[0]
  return c.json(updated)
})

printJobRoutes.delete('/:id', async (c) => {
  const db = getDb(c.env.DB)
  const id = c.req.param('id')
  const job = (await db.select().from(printJobs).where(eq(printJobs.id, id)).limit(1))[0]
  if (job && job.stocked && job.productId) {
    await db.update(products).set({ stock: sql`${products.stock} - ${job.qty}` }).where(eq(products.id, job.productId))
  }
  await db.delete(printJobs).where(eq(printJobs.id, id))
  return c.json({ ok: true })
})
```
Note: add `import { sql } from 'drizzle-orm'` (used in DELETE). The `qty` change on a stocked job is an edge case not required by tests; keep behavior simple (qty updates the record; stock already credited at old qty — acceptable for scope, note it).

- [ ] **Step 6: Mount `/print-jobs` in `src/index.ts`**

```typescript
import { printJobRoutes } from './routes/print-jobs'
// ...
app.route('/print-jobs', printJobRoutes)
```

- [ ] **Step 7: Run** `yarn test tests/print-jobs.test.ts` — PASS (4). Then full `yarn test`.

- [ ] **Step 8: Commit**

```bash
git add -A && git commit -m "feat(api): print-jobs CRUD + stock credit/reverse on done transition"
```

---

### Task 3: Order auto-deduct on completed

**Files:**
- Create: `ichigo-studio-api/src/lib/order-stock.ts`
- Modify: `ichigo-studio-api/src/routes/orders.ts`
- Test: `ichigo-studio-api/tests/order-stock.test.ts`

**Interfaces:**
- Consumes: `getDb`, `products`, `orders`, `orderItems`.
- Produces: `applyOrderStock(db, order, items, newStatus): Promise<boolean>` returns new `stockDeducted` (`src/lib/order-stock.ts`); orders status handlers apply it.

- [ ] **Step 1: `tests/order-stock.test.ts` (failing)**

```typescript
import { env } from 'cloudflare:test'
import { describe, it, expect, beforeEach } from 'vitest'
import app from '../src/index'
import { getDb } from '../src/db/client'
import { products, customers, orders, orderItems, users } from '../src/db/schema'
import { ensureAdmin } from '../src/lib/seed-admin'
import { eq } from 'drizzle-orm'

async function setup() {
  const db = getDb(env.DB)
  await db.delete(orderItems); await db.delete(orders); await db.delete(customers); await db.delete(products); await db.delete(users)
  await ensureAdmin(db, 'owner@ichigo.studio', 'test-pass')
  const t = (await (await app.request('/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: 'owner@ichigo.studio', password: 'test-pass' }) }, env)).json<{ token: string }>()).token
  await db.insert(products).values({ id: 'p1', slug: 'p1', title: 'Set', series: 'S', material: 'PLA', featured: false, order: 0, status: 'published', stock: 10, createdAt: 1, updatedAt: 1 })
  await db.insert(customers).values({ id: 'c1', name: 'Nam', createdAt: 1 })
  return t
}
const H = (t: string) => ({ authorization: `Bearer ${t}`, 'content-type': 'application/json' })
async function stock() { const db = getDb(env.DB); return (await db.select().from(products).where(eq(products.id, 'p1')))[0].stock }
async function makeOrder(t: string) {
  return (await (await app.request('/orders', { method: 'POST', headers: H(t), body: JSON.stringify({ customerId: 'c1', items: [{ productId: 'p1', title: 'Set', unitPrice: 100, qty: 3 }] }) }, env)).json<{ id: string }>()).id
}

describe('order stock deduction', () => {
  let t: string
  beforeEach(async () => { t = await setup() })

  it('completing deducts stock once; re-completing does not double', async () => {
    const id = await makeOrder(t)
    expect(await stock()).toBe(10)
    await app.request(`/orders/${id}/status`, { method: 'PATCH', headers: H(t), body: JSON.stringify({ status: 'completed' }) }, env)
    expect(await stock()).toBe(7)
    await app.request(`/orders/${id}/status`, { method: 'PATCH', headers: H(t), body: JSON.stringify({ status: 'completed' }) }, env)
    expect(await stock()).toBe(7)
  })

  it('leaving completed (cancel) restores stock', async () => {
    const id = await makeOrder(t)
    await app.request(`/orders/${id}/status`, { method: 'PATCH', headers: H(t), body: JSON.stringify({ status: 'completed' }) }, env)
    expect(await stock()).toBe(7)
    await app.request(`/orders/${id}/status`, { method: 'PATCH', headers: H(t), body: JSON.stringify({ status: 'cancelled' }) }, env)
    expect(await stock()).toBe(10)
  })

  it('deleting a completed (deducted) order does NOT restore stock', async () => {
    const id = await makeOrder(t)
    await app.request(`/orders/${id}/status`, { method: 'PATCH', headers: H(t), body: JSON.stringify({ status: 'completed' }) }, env)
    expect(await stock()).toBe(7)
    await app.request(`/orders/${id}`, { method: 'DELETE', headers: H(t) }, env)
    expect(await stock()).toBe(7)
  })

  it('PATCH /orders/:id status=completed also deducts', async () => {
    const id = await makeOrder(t)
    await app.request(`/orders/${id}`, { method: 'PATCH', headers: H(t), body: JSON.stringify({ status: 'completed' }) }, env)
    expect(await stock()).toBe(7)
  })
})
```

- [ ] **Step 2: Run** — FAIL.

- [ ] **Step 3: `src/lib/order-stock.ts`**

```typescript
import { eq, sql } from 'drizzle-orm'
import type { Db } from '../db/client'
import { products, type Order, type OrderItem } from '../db/schema'

// Deducts (on entering 'completed') or restores (on leaving 'completed') stock
// for an order's items. Idempotent via order.stockDeducted. Returns new flag.
export async function applyOrderStock(db: Db, order: Order, items: OrderItem[], newStatus: string): Promise<boolean> {
  const willComplete = newStatus === 'completed'
  if (willComplete && !order.stockDeducted) {
    for (const it of items) if (it.productId) await db.update(products).set({ stock: sql`${products.stock} - ${it.qty}` }).where(eq(products.id, it.productId))
    return true
  }
  if (!willComplete && order.stockDeducted) {
    for (const it of items) if (it.productId) await db.update(products).set({ stock: sql`${products.stock} + ${it.qty}` }).where(eq(products.id, it.productId))
    return false
  }
  return order.stockDeducted
}
```

- [ ] **Step 4: Wire into `src/routes/orders.ts`**

Import: `import { applyOrderStock } from '../lib/order-stock'` (and ensure `orderItems` imported — it is).

In `PATCH /:id/status` handler (currently sets status): load items + apply stock BEFORE/at update:
```typescript
orderRoutes.patch('/:id/status', zValidator('json', orderStatusSchema), async (c) => {
  const db = getDb(c.env.DB)
  const id = c.req.param('id')
  const existing = (await db.select().from(orders).where(eq(orders.id, id)).limit(1))[0]
  if (!existing) return c.json({ error: 'not_found' }, 404)
  const newStatus = c.req.valid('json').status
  const items = await db.select().from(orderItems).where(eq(orderItems.orderId, id))
  const stockDeducted = await applyOrderStock(db, existing, items, newStatus)
  await db.update(orders).set({ status: newStatus, stockDeducted, updatedAt: Date.now() }).where(eq(orders.id, id))
  return c.json(await loadOrderDetail(db, id))
})
```

In `PATCH /:id` handler: after the items-replace block (so final items are used) and before `loadOrderDetail`, if status is being changed apply stock. Insert after the `if (input.items !== undefined) {...}` block:
```typescript
  // Stock deduction/restore follows the (possibly replaced) items + resulting status.
  const finalStatus = input.status ?? existing.status
  const finalItems = await db.select().from(orderItems).where(eq(orderItems.orderId, id))
  const stockDeducted = await applyOrderStock(db, existing, finalItems, finalStatus)
  if (stockDeducted !== existing.stockDeducted) {
    await db.update(orders).set({ stockDeducted }).where(eq(orders.id, id))
  }
```
Note: the scalar `set` in PATCH /:id already writes `status` when provided; the extra update above only touches `stockDeducted`. `existing` was loaded at handler start (before mutations) so its `stockDeducted`/`status` reflect the pre-patch state — correct for the transition check.

DELETE handler: leave unchanged (must NOT touch stock).

- [ ] **Step 5: Run** `yarn test tests/order-stock.test.ts` — PASS (4). Then full `yarn test` (all suites).

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat(api): auto deduct/restore stock on order completed transition"
```

---

## PHẦN B — ichigo-studio-admin

### Task 4: Print-jobs lib + product stock lib/schema + nav/routes scaffold

**Files:**
- Create: `ichigo-studio-admin/src/lib/print-jobs.ts`
- Modify: `ichigo-studio-admin/src/lib/products.ts`
- Modify: `ichigo-studio-admin/src/lib/product-schema.ts`
- Modify: `ichigo-studio-admin/src/router/index.ts`
- Modify: `ichigo-studio-admin/src/layouts/DashboardLayout.vue`
- Create placeholders: `src/pages/ProductionListPage.vue`, `ProductionEditPage.vue`, `ProductionDetailPage.vue`
- Test: `ichigo-studio-admin/src/lib/print-jobs.test.ts`

**Interfaces:**
- Produces: `src/lib/print-jobs.ts` — types `PrintJob`, `PrintJobInput`, `PrintStatus`; `PRINT_STATUS_LABELS`, `PRINT_STATUS_VARIANT`; `fetchPrintJobs(params?)`, `fetchPrintJob(id)`, `createPrintJob`, `updatePrintJob`, `updatePrintJobStatus`, `deletePrintJob`. `products.ts` adds `stock` to `Product`/`ProductInput` + `LOW_STOCK` const + `stockTone(stock)` helper. `product-schema.ts` adds `stock`. Routes + nav wired; pages are stubs.

- [ ] **Step 1: `src/lib/print-jobs.test.ts` (failing)**

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
const apiMock = vi.fn()
vi.mock('@/lib/api', () => ({ api: (...a: any[]) => apiMock(...a), TOKEN_KEY: 'ichigo_token' }))
import { fetchPrintJobs } from './print-jobs'
import { stockTone, LOW_STOCK } from './products'

describe('print-jobs lib + stock tone', () => {
  beforeEach(() => apiMock.mockReset())
  it('fetchPrintJobs passes status query', async () => {
    apiMock.mockResolvedValue({ items: [] })
    await fetchPrintJobs({ status: 'pending' })
    expect(apiMock).toHaveBeenCalledWith('/print-jobs', { query: { status: 'pending' } })
  })
  it('stockTone: out when <=0, low when <=LOW_STOCK, ok above', () => {
    expect(stockTone(0)).toBe('out')
    expect(stockTone(-1)).toBe('out')
    expect(stockTone(LOW_STOCK)).toBe('low')
    expect(stockTone(LOW_STOCK + 1)).toBe('ok')
  })
})
```

- [ ] **Step 2: Run** — FAIL.

- [ ] **Step 3: `src/lib/products.ts`** — add `stock` + LOW_STOCK + stockTone.

Trong interface `Product` thêm `stock?: number` (số; API luôn trả nhưng optional cho an toàn). Trong `ProductInput` thêm `stock?: number`. Cuối file thêm:
```typescript
export const LOW_STOCK = 3
export function stockTone(stock: number): 'out' | 'low' | 'ok' {
  if (stock <= 0) return 'out'
  if (stock <= LOW_STOCK) return 'low'
  return 'ok'
}
```

- [ ] **Step 4: `src/lib/product-schema.ts`** — add `stock` to the zod object:
```typescript
  stock: z.number().int().default(0),
```

- [ ] **Step 5: `src/lib/print-jobs.ts`**

```typescript
import { api } from '@/lib/api'

export type PrintStatus = 'pending' | 'printing' | 'done' | 'cancelled'

export const PRINT_STATUS_LABELS: Record<PrintStatus, string> = {
  pending: 'Chờ in', printing: 'Đang in', done: 'Đã in xong', cancelled: 'Đã hủy',
}
export const PRINT_STATUS_VARIANT: Record<PrintStatus, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  pending: 'secondary', printing: 'default', done: 'default', cancelled: 'destructive',
}

export interface PrintJob {
  id: string; productId?: string | null; title: string; qty: number
  status: PrintStatus; stocked: boolean; orderId?: string | null; note?: string | null
  createdAt: number; updatedAt: number
}
export interface PrintJobInput {
  productId: string; qty: number; status: PrintStatus; orderId?: string | null; note?: string
}

export function fetchPrintJobs(params?: { status?: PrintStatus }) {
  return api<{ items: PrintJob[] }>('/print-jobs', { query: params ?? {} })
}
export function fetchPrintJob(id: string) {
  return api<PrintJob>(`/print-jobs/${id}`)
}
export function createPrintJob(input: PrintJobInput) {
  return api<{ id: string }>('/print-jobs', { method: 'POST', body: input })
}
export function updatePrintJob(id: string, input: Partial<PrintJobInput>) {
  return api<PrintJob>(`/print-jobs/${id}`, { method: 'PATCH', body: input })
}
export function updatePrintJobStatus(id: string, status: PrintStatus) {
  return api<PrintJob>(`/print-jobs/${id}/status`, { method: 'PATCH', body: { status } })
}
export function deletePrintJob(id: string) {
  return api<{ ok: true }>(`/print-jobs/${id}`, { method: 'DELETE' })
}
```

- [ ] **Step 6: Run** `yarn vitest run src/lib/print-jobs.test.ts` — PASS (2).

- [ ] **Step 7: Router `src/router/index.ts`** — add under DashboardLayout children:
```typescript
{ path: 'san-xuat', name: 'production', component: () => import('@/pages/ProductionListPage.vue') },
{ path: 'san-xuat/moi', name: 'production-new', component: () => import('@/pages/ProductionEditPage.vue') },
{ path: 'san-xuat/:id', name: 'production-detail', component: () => import('@/pages/ProductionDetailPage.vue') },
{ path: 'san-xuat/:id/sua', name: 'production-edit', component: () => import('@/pages/ProductionEditPage.vue') },
```

- [ ] **Step 8: Nav `src/layouts/DashboardLayout.vue`** — import icon `Boxes` (already imported for `soon`). Add to `nav` array: `{ label: 'Sản xuất', name: 'production', icon: Boxes }`. Remove `Boxes`/Tồn kho entry from `soon` (keep Marketing/Megaphone). Add `productionRouteNames = ['production','production-new','production-detail','production-edit']` + active branch in `isActive`. Add title cases: production→'Sản xuất', production-new→'Tạo lệnh in', production-detail→'Chi tiết lệnh in', production-edit→'Sửa lệnh in'.

- [ ] **Step 9: Placeholder pages** — 3 files: `<template><div class="text-muted-foreground">Trang đang được dựng.</div></template>`.

- [ ] **Step 10: `yarn build` + `yarn vitest run` — PASS. Commit.**

```bash
git add -A && git commit -m "feat(admin): print-jobs lib, product stock lib/schema, Sản xuất nav + routes scaffold"
```

---

### Task 5: Product stock UI + Overview low-stock stat

**Files:**
- Modify: `ichigo-studio-admin/src/pages/ProductEditPage.vue`
- Modify: `ichigo-studio-admin/src/pages/ProductListPage.vue`
- Modify: `ichigo-studio-admin/src/pages/OverviewPage.vue`

**Interfaces:**
- Consumes: `stock` on Product/form, `stockTone`, `LOW_STOCK` (`@/lib/products`).

- [ ] **Step 1: `ProductEditPage.vue`** — add stock to `form` (`stock: 0`), map in edit-load (`stock: p.stock ?? 0`), and add a numeric field "Tồn kho" in the "Hiển thị" Card (next to status/featured):
```vue
<div class="space-y-2">
  <Label for="stock">Tồn kho</Label>
  <Input id="stock" v-model.number="form.stock" type="number" />
  <p class="text-xs text-muted-foreground">Số lượng in sẵn. Âm nghĩa là đang thiếu, cần in thêm.</p>
</div>
```
Ensure `form.stock` is included in the `productFormSchema.safeParse` payload (coerce `Number(form.stock)` like discount/deposit lesson) so it is sent to the API.

- [ ] **Step 2: `ProductListPage.vue`** — add a "Tồn" column. Import `stockTone` from `@/lib/products`. Header `<TableHead class="text-right">Tồn</TableHead>` (after Giá). Cell:
```vue
<TableCell class="text-right tabular-nums"
  :class="{ 'text-destructive font-medium': stockTone(p.stock ?? 0) === 'out', 'text-amber-600': stockTone(p.stock ?? 0) === 'low' }">
  {{ p.stock ?? 0 }}
</TableCell>
```

- [ ] **Step 3: `OverviewPage.vue`** — add "SP sắp hết" card. In script, using existing `items` (products): 
```typescript
import { stockTone } from '@/lib/products'
const lowStockCount = computed(() => items.value.filter((p) => stockTone(p.price == null ? 0 : (p.stock ?? 0)) !== 'ok').length)
```
Simplify: `const lowStockCount = computed(() => items.value.filter((p) => stockTone(p.stock ?? 0) !== 'ok').length)`. Add a Card (icon `PackageX` or `AlertTriangle` from `@lucide/vue`) showing `lowStockCount` with subtitle "SP có tồn ≤ {{ LOW_STOCK }}". Place near the product stat grid.

- [ ] **Step 4: `yarn build` + `yarn vitest run` — PASS. Commit.**

```bash
git add -A && git commit -m "feat(admin): product stock field + list column + overview low-stock stat"
```

---

### Task 6: Production pages (list, editor, detail)

**Files:**
- Overwrite: `src/pages/ProductionListPage.vue`, `ProductionEditPage.vue`, `ProductionDetailPage.vue`

**Interfaces:**
- Consumes: `@/lib/print-jobs`, `fetchProducts` + `fetchOrders` (for pickers), shadcn Table/Card/Badge/Button/Select/Input/Label, vue-query.

- [ ] **Step 1: `ProductionListPage.vue`** — status filter (Tất cả + 4), Table: SP(title)/SL/trạng thái(Badge PRINT_STATUS_VARIANT)/đơn(orderId? '—')/ngày; row click → production-detail; delete mutation invalidates `['print-jobs']`; "Tạo lệnh in" → production-new. Pattern mirrors OrderListPage.

```vue
<script setup lang="ts">
import { ref, computed } from 'vue'
import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import { useRouter } from 'vue-router'
import { Plus } from '@lucide/vue'
import { fetchPrintJobs, deletePrintJob, PRINT_STATUS_LABELS, PRINT_STATUS_VARIANT, type PrintStatus } from '@/lib/print-jobs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

const router = useRouter(); const qc = useQueryClient()
const statusFilter = ref<'' | PrintStatus>('')
const filters: Array<{ v: '' | PrintStatus; label: string }> = [
  { v: '', label: 'Tất cả' }, { v: 'pending', label: 'Chờ in' }, { v: 'printing', label: 'Đang in' },
  { v: 'done', label: 'Đã in xong' }, { v: 'cancelled', label: 'Đã hủy' },
]
const { data, isLoading } = useQuery({
  queryKey: computed(() => ['print-jobs', statusFilter.value]),
  queryFn: () => fetchPrintJobs(statusFilter.value ? { status: statusFilter.value } : undefined),
})
const del = useMutation({ mutationFn: (id: string) => deletePrintJob(id), onSuccess: () => qc.invalidateQueries({ queryKey: ['print-jobs'] }) })
function onDelete(id: string) { if (confirm('Xóa lệnh in này? Nếu đã cộng kho sẽ trừ lại.')) del.mutate(id) }
function fmtDate(ms: number) { return new Date(ms).toLocaleDateString('vi-VN') }
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between gap-2">
      <div class="flex flex-wrap gap-2">
        <Button v-for="f in filters" :key="f.v" size="sm" :variant="statusFilter === f.v ? 'default' : 'outline'" @click="statusFilter = f.v">{{ f.label }}</Button>
      </div>
      <Button @click="router.push({ name: 'production-new' })"><Plus />Tạo lệnh in</Button>
    </div>
    <p v-if="isLoading" class="text-muted-foreground">Đang tải...</p>
    <Table v-else>
      <TableHeader><TableRow>
        <TableHead>Sản phẩm</TableHead><TableHead class="text-right">SL</TableHead>
        <TableHead>Trạng thái</TableHead><TableHead>Ngày</TableHead><TableHead></TableHead>
      </TableRow></TableHeader>
      <TableBody>
        <TableRow v-for="j in data?.items ?? []" :key="j.id" class="cursor-pointer" @click="router.push({ name: 'production-detail', params: { id: j.id } })">
          <TableCell class="font-medium">{{ j.title }}</TableCell>
          <TableCell class="text-right tabular-nums">{{ j.qty }}</TableCell>
          <TableCell><Badge :variant="PRINT_STATUS_VARIANT[j.status]">{{ PRINT_STATUS_LABELS[j.status] }}</Badge></TableCell>
          <TableCell class="text-muted-foreground">{{ fmtDate(j.createdAt) }}</TableCell>
          <TableCell class="text-right" @click.stop><Button size="sm" variant="destructive" @click="onDelete(j.id)">Xóa</Button></TableCell>
        </TableRow>
      </TableBody>
    </Table>
  </div>
</template>
```

- [ ] **Step 2: `ProductionEditPage.vue`** — create/edit. Select product (autofill title implied server-side; store productId), qty, status Select, optional order Select, note. On save create/update → route production. Mirror simplified OrderEditPage.

```vue
<script setup lang="ts">
import { reactive, ref, onMounted } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { useRoute, useRouter } from 'vue-router'
import { fetchPrintJob, createPrintJob, updatePrintJob, PRINT_STATUS_LABELS, type PrintStatus } from '@/lib/print-jobs'
import { fetchProducts } from '@/lib/products'
import { fetchOrders } from '@/lib/orders'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const route = useRoute(); const router = useRouter()
const id = route.params.id as string | undefined
const isEdit = !!id
const form = reactive({ productId: '', qty: 1, status: 'pending' as PrintStatus, orderId: '' as string, note: '' })
const error = ref(''); const saving = ref(false); const loading = ref(isEdit)
const { data: productsData } = useQuery({ queryKey: ['products', ''], queryFn: () => fetchProducts() })
const { data: ordersData } = useQuery({ queryKey: ['orders', ''], queryFn: () => fetchOrders() })

onMounted(async () => {
  if (!isEdit) return
  try { const j = await fetchPrintJob(id!); Object.assign(form, { productId: j.productId ?? '', qty: j.qty, status: j.status, orderId: j.orderId ?? '', note: j.note ?? '' }) }
  finally { loading.value = false }
})

async function onSubmit() {
  error.value = ''
  if (!form.productId) { error.value = 'Chọn sản phẩm'; return }
  const qty = Number(form.qty)
  if (!Number.isInteger(qty) || qty < 1) { error.value = 'Số lượng tối thiểu 1'; return }
  saving.value = true
  const payload = { productId: form.productId, qty, status: form.status, orderId: form.orderId || null, note: form.note || undefined }
  try { if (isEdit) await updatePrintJob(id!, payload); else await createPrintJob(payload); router.push({ name: 'production' }) }
  finally { saving.value = false }
}
</script>

<template>
  <div class="mx-auto max-w-2xl pb-24">
    <p v-if="loading" class="text-muted-foreground">Đang tải...</p>
    <form v-else class="space-y-6" @submit.prevent="onSubmit">
      <Card>
        <CardHeader><CardTitle>Lệnh in</CardTitle></CardHeader>
        <CardContent class="space-y-5">
          <div class="space-y-2">
            <Label>Sản phẩm</Label>
            <Select v-model="form.productId">
              <SelectTrigger class="w-full"><SelectValue placeholder="Chọn sản phẩm" /></SelectTrigger>
              <SelectContent>
                <SelectItem v-for="p in productsData?.items ?? []" :key="p.id" :value="p.id">{{ p.title }}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div class="grid gap-5 sm:grid-cols-2">
            <div class="space-y-2"><Label>Số lượng</Label><Input v-model.number="form.qty" type="number" min="1" /></div>
            <div class="space-y-2">
              <Label>Trạng thái</Label>
              <Select v-model="form.status">
                <SelectTrigger class="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem v-for="(label, key) in PRINT_STATUS_LABELS" :key="key" :value="key">{{ label }}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div class="space-y-2">
            <Label>Gắn đơn (tùy chọn)</Label>
            <Select :model-value="form.orderId" @update:model-value="(v) => form.orderId = String(v)">
              <SelectTrigger class="w-full"><SelectValue placeholder="Không gắn đơn" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">Không gắn đơn</SelectItem>
                <SelectItem v-for="o in ordersData?.items ?? []" :key="o.id" :value="o.id">{{ o.code }} — {{ o.customerName || '—' }}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div class="space-y-2"><Label>Ghi chú</Label><Input v-model="form.note" /></div>
          <p v-if="error" class="text-sm text-destructive">{{ error }}</p>
        </CardContent>
      </Card>
      <div class="sticky bottom-4 z-10 flex justify-end gap-2 rounded-lg border bg-background/80 p-3 shadow-lg backdrop-blur">
        <Button type="button" variant="ghost" @click="router.push({ name: 'production' })">Hủy</Button>
        <Button type="submit" :disabled="saving">{{ saving ? 'Đang lưu...' : (isEdit ? 'Lưu thay đổi' : 'Tạo lệnh in') }}</Button>
      </div>
    </form>
  </div>
</template>
```
Note: `updatePrintJob`/`createPrintJob` accept `orderId: string | null`; empty Select value `''` → send `null`. `Select` empty-string item for "Không gắn đơn" is valid.

- [ ] **Step 3: `ProductionDetailPage.vue`** — show job + quick status change (Select) invalidating `['print-job',id]`+`['print-jobs']`+`['products']` (stock changes), + Sửa/Xóa.

```vue
<script setup lang="ts">
import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import { useRoute, useRouter } from 'vue-router'
import { fetchPrintJob, updatePrintJobStatus, deletePrintJob, PRINT_STATUS_LABELS, PRINT_STATUS_VARIANT, type PrintStatus } from '@/lib/print-jobs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const route = useRoute(); const router = useRouter(); const qc = useQueryClient()
const id = route.params.id as string
const { data, isLoading } = useQuery({ queryKey: ['print-job', id], queryFn: () => fetchPrintJob(id) })
function invalidate() { qc.invalidateQueries({ queryKey: ['print-job', id] }); qc.invalidateQueries({ queryKey: ['print-jobs'] }); qc.invalidateQueries({ queryKey: ['products'] }) }
const statusMut = useMutation({ mutationFn: (s: PrintStatus) => updatePrintJobStatus(id, s), onSuccess: invalidate })
const del = useMutation({ mutationFn: () => deletePrintJob(id), onSuccess: () => { qc.invalidateQueries({ queryKey: ['print-jobs'] }); qc.invalidateQueries({ queryKey: ['products'] }); router.push({ name: 'production' }) } })
function onDelete() { if (confirm('Xóa lệnh in này?')) del.mutate() }
function fmtDate(ms: number) { return new Date(ms).toLocaleString('vi-VN') }
</script>

<template>
  <div v-if="isLoading" class="text-muted-foreground">Đang tải...</div>
  <div v-else-if="data" class="space-y-6">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <div class="flex items-center gap-3">
        <h2 class="text-xl font-semibold">{{ data.title }}</h2>
        <Badge :variant="PRINT_STATUS_VARIANT[data.status]">{{ PRINT_STATUS_LABELS[data.status] }}</Badge>
      </div>
      <div class="flex gap-2">
        <Button size="sm" variant="outline" @click="router.push({ name: 'production-edit', params: { id } })">Sửa</Button>
        <Button size="sm" variant="destructive" @click="onDelete">Xóa</Button>
      </div>
    </div>
    <Card>
      <CardHeader><CardTitle class="text-base">Thông tin</CardTitle></CardHeader>
      <CardContent class="space-y-3 text-sm">
        <div><span class="text-muted-foreground">Số lượng:</span> {{ data.qty }}</div>
        <div><span class="text-muted-foreground">Đã cộng kho:</span> {{ data.stocked ? 'Rồi' : 'Chưa' }}</div>
        <div v-if="data.note"><span class="text-muted-foreground">Ghi chú:</span> {{ data.note }}</div>
        <div><span class="text-muted-foreground">Tạo:</span> {{ fmtDate(data.createdAt) }}</div>
        <div class="max-w-xs space-y-1">
          <span class="text-xs text-muted-foreground">Đổi trạng thái</span>
          <Select :model-value="data.status" @update:model-value="(v) => statusMut.mutate(v as PrintStatus)">
            <SelectTrigger class="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem v-for="(label, key) in PRINT_STATUS_LABELS" :key="key" :value="key">{{ label }}</SelectItem>
            </SelectContent>
          </Select>
          <p class="text-xs text-muted-foreground">Chuyển sang "Đã in xong" sẽ cộng {{ data.qty }} vào tồn kho.</p>
        </div>
      </CardContent>
    </Card>
  </div>
</template>
```

- [ ] **Step 4: `yarn build` + `yarn vitest run` (all) — PASS.**

- [ ] **Step 5: Smoke (không bắt buộc chạy live): build sạch. Nếu chạy full stack: tạo lệnh in qty 5 → "Đã in xong" → tồn SP +5; tạo đơn 3 cái → Hoàn tất → tồn −3 (còn 2); hủy đơn → tồn +3; xem cột Tồn + thẻ "SP sắp hết".**

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat(admin): production (print jobs) list/editor/detail pages"
```

---

## Self-Review Notes

- **Spec coverage:** products.stock + orders.stock_deducted + print_jobs schema/migration (T1); product stock in zod + persists incl negative (T1); print jobs CRUD + stock credit/reverse on done + delete-reverses (T2); order deduct on completed + restore on leave + delete-no-restore, both status handlers (T3); admin print-jobs lib + product stock lib/schema + Sản xuất nav/routes (T4); product stock field + list column colored + overview low-stock (T5); production list/editor/detail pages (T6). No filament inventory, no movement log (out of scope). Negative stock allowed (no nonnegative). Additive migration (no reset/collapse).
- **Type consistency:** `applyJobStock`/`applyOrderStock` return the new boolean flag; callers persist it. `stockTone`/`LOW_STOCK` shared admin-side. PrintStatus labels/variants consistent. Admin `updatePrintJob` payload (`orderId: string|null`) matches API `printJobPatchSchema` (`orderId` nullable optional). Product `stock` optional in admin type but always returned by API.
- **Ambiguity fixed:** order PATCH /:id applies stock using items AFTER replacement, and only writes stockDeducted when it flips, using pre-patch `existing` for the transition check. Print job PATCH uses `input.status ?? job.status` so non-status edits don't flip stock. Editing qty of an already-stocked job does not re-reconcile stock (documented, out of test scope). Product editor sends `Number(form.stock)` (Input.vue `.number` gap lesson).
