# Storefront SSR-from-API Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Chuyển `ichigo-studio-store` (Nuxt 3) từ SSG-đọc-Markdown sang **SSR fetch sản phẩm từ API `/public`** — trang chủ/danh sách/chi tiết hiển thị sản phẩm quản trong admin.

**Architecture:** Thay `@nuxt/content` bằng `useFetch` tới `${apiBase}/public/products` (SSR, server-side). Map dữ liệu API → `ProductMeta`/`Product`. Render mô tả `bodyMd` bằng `markdown-it`. Ảnh hiển thị theo dữ liệu từng sản phẩm (thay cờ toàn cục `shop.hasPhotos`). Giá là số VND (`price`), format khi hiển thị.

**Tech Stack:** Nuxt 3, `useFetch`/`useAsyncData`, `runtimeConfig`, `markdown-it`, `@nuxt/image`, Tailwind, vitest.

## Global Constraints

- Package manager **yarn** (Yarn Classic). Không thêm/bớt tool ngoài `markdown-it`.
- Giữ mỗi task **build xanh** (`yarn build` = `nuxt build` chạy được) và `yarn test` (vitest) pass. Không xóa `@nuxt/content` cho tới task cuối (khi không còn ai dùng).
- API `apiBase` mặc định `http://localhost:8787`, override env `NUXT_PUBLIC_API_BASE`, đọc qua `useRuntimeConfig().public.apiBase`.
- **API shape:** `GET /public/products` → `{ items }`, mỗi item CÓ `cover` NHƯNG **KHÔNG** có mảng `images` (chỉ trang chi tiết mới join). `GET /public/products/:slug` → product **kèm** `images: {url,sort}[]`, hoặc 404. Cả hai chỉ trả `status='published'`.
- `price` là số nguyên VND hoặc `null` (null = "Liên hệ"). Hiển thị bằng `formatPrice`.
- Copy tiếng Việt có dấu, không em-dash. Giữ design tokens/brand hiện có.
- SSR fetch là server-to-server (không dính CORS). Local: cần API `wrangler dev` chạy ở 8787 + đã seed sản phẩm published để xem thực tế; nhưng `yarn build`/`yarn test` không cần API sống.

---

### Task 1: Types + pure helpers (mapApiProduct, formatPrice) + tests

**Files:**
- Modify: `types/product.ts`
- Modify: `utils/products.ts`
- Modify: `tests/products.test.ts`

**Interfaces:**
- Produces: `ProductMeta` = `{ id, slug, title, series, material, price: number | null, cover: string, images: string[], featured: boolean, order: number }`; `Product = ProductMeta & { bodyMd?: string | null }`. `mapApiProduct(api: any): Product`; `formatPrice(price: number | null): string`. Existing pure fns unchanged.

- [ ] **Step 1: `types/product.ts`** — replace content:

```typescript
export interface ProductMeta {
  id: string
  slug: string
  title: string
  series: string
  material: string
  price: number | null
  cover: string
  images: string[]
  featured: boolean
  order: number
}

export interface Product extends ProductMeta {
  bodyMd?: string | null
}
```

- [ ] **Step 2: `tests/products.test.ts`** — update fixture to new shape + add helper tests. Replace the `p()` factory and add tests:

```typescript
import { describe, it, expect } from 'vitest'
import { sortByOrder, getFeatured, getSeriesList, filterBySeries, getRelated, mapApiProduct, formatPrice } from '../utils/products'
import type { ProductMeta } from '../types/product'

const p = (over: Partial<ProductMeta>): ProductMeta => ({
  id: 'id', title: 't', slug: 's', series: 'Kamen Rider',
  material: 'PLA', price: null, featured: false, order: 0,
  images: [], cover: '', ...over,
})

const items: ProductMeta[] = [
  p({ slug: 'a', series: 'Ultraman', order: 2, featured: true }),
  p({ slug: 'b', series: 'Kamen Rider', order: 1, featured: false }),
  p({ slug: 'c', series: 'Ultraman', order: 3, featured: true }),
]

describe('utils/products', () => {
  it('sortByOrder sắp tăng dần theo order', () => {
    expect(sortByOrder(items).map(i => i.slug)).toEqual(['b', 'a', 'c'])
  })
  it('getFeatured chỉ lấy featured và đã sort', () => {
    expect(getFeatured(items).map(i => i.slug)).toEqual(['a', 'c'])
  })
  it('getSeriesList trả series duy nhất theo thứ tự xuất hiện sau sort', () => {
    expect(getSeriesList(items)).toEqual(['Kamen Rider', 'Ultraman'])
  })
  it('filterBySeries lọc đúng; null trả tất cả', () => {
    expect(filterBySeries(items, 'Ultraman').map(i => i.slug)).toEqual(['a', 'c'])
    expect(filterBySeries(items, null).length).toBe(3)
    expect(filterBySeries(items, 'all').length).toBe(3)
  })
  it('getRelated lấy cùng series khác slug, giới hạn limit', () => {
    expect(getRelated(items, items[0], 4).map(i => i.slug)).toEqual(['c'])
  })
})

describe('mapApiProduct', () => {
  it('maps images [{url}] -> string[] và cover fallback ảnh đầu', () => {
    const r = mapApiProduct({ id: '1', slug: 's', title: 'T', series: 'X', material: 'PLA', price: 360000, cover: null, featured: false, order: 1, bodyMd: '# hi', images: [{ url: '/media/a.jpg', sort: 0 }, { url: '/media/b.jpg', sort: 1 }] })
    expect(r.images).toEqual(['/media/a.jpg', '/media/b.jpg'])
    expect(r.cover).toBe('/media/a.jpg')
    expect(r.price).toBe(360000)
    expect(r.bodyMd).toBe('# hi')
  })
  it('list item không có images -> images [], cover từ API', () => {
    const r = mapApiProduct({ id: '1', slug: 's', title: 'T', series: 'X', material: 'PLA', price: null, cover: '/media/c.jpg', featured: true, order: 2 })
    expect(r.images).toEqual([])
    expect(r.cover).toBe('/media/c.jpg')
    expect(r.price).toBeNull()
  })
})

describe('formatPrice', () => {
  it('null -> Liên hệ', () => { expect(formatPrice(null)).toBe('Liên hệ') })
  it('số -> định dạng vi-VN + ₫', () => { expect(formatPrice(360000)).toBe('360.000 ₫') })
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `yarn test` — FAIL (mapApiProduct/formatPrice missing; fixture type mismatch resolved by new type).

- [ ] **Step 4: `utils/products.ts`** — add imports + two helpers (keep existing fns unchanged):

```typescript
import type { ProductMeta, Product } from '../types/product'

export function mapApiProduct(api: any): Product {
  const images: string[] = Array.isArray(api?.images) ? api.images.map((i: any) => i.url) : []
  return {
    id: api.id,
    slug: api.slug,
    title: api.title,
    series: api.series,
    material: api.material,
    price: api.price ?? null,
    cover: api.cover ?? images[0] ?? '',
    images,
    featured: !!api.featured,
    order: api.order ?? 0,
    bodyMd: api.bodyMd ?? null,
  }
}

export function formatPrice(price: number | null): string {
  if (price == null) return 'Liên hệ'
  return `${price.toLocaleString('vi-VN')} ₫`
}
```
(Existing `sortByOrder`/`getFeatured`/`getSeriesList`/`filterBySeries`/`getRelated` stay; they only use `order/series/featured/slug`.)

- [ ] **Step 5: Run test to verify it passes**

Run: `yarn test` — PASS.

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat(store): product types for API shape + mapApiProduct/formatPrice helpers"
```

---

### Task 2: useProducts fetches API + runtimeConfig

**Files:**
- Modify: `nuxt.config.ts` (add runtimeConfig only)
- Modify: `composables/useProducts.ts`

**Interfaces:**
- Consumes: `mapApiProduct`, `sortByOrder`, `getFeatured`, `getSeriesList`, `getRelated`.
- Produces: `useProducts()` returns `{ all, featured, seriesList, getBySlug, related }` (same shape), data from `${apiBase}/public/products`.

- [ ] **Step 1: `nuxt.config.ts`** — add `runtimeConfig` (additive; leave modules/nitro as-is for now):

```typescript
  runtimeConfig: {
    public: {
      apiBase: 'http://localhost:8787',
    },
  },
```
(Add as a top-level key in `defineNuxtConfig({...})`. `NUXT_PUBLIC_API_BASE` overrides it automatically.)

- [ ] **Step 2: `composables/useProducts.ts`** — replace with API fetch:

```typescript
import { sortByOrder, getFeatured, getSeriesList, getRelated, mapApiProduct } from '~/utils/products'
import type { ProductMeta } from '~/types/product'

export function useProducts() {
  const { public: { apiBase } } = useRuntimeConfig()
  const { data } = useAsyncData('products', async () => {
    try {
      const res = await $fetch<{ items: any[] }>(`${apiBase}/public/products`)
      return (res.items ?? []).map(mapApiProduct)
    } catch {
      return []
    }
  })
  const all = computed<ProductMeta[]>(() => sortByOrder((data.value ?? []) as ProductMeta[]))
  const featured = computed(() => getFeatured(all.value))
  const seriesList = computed(() => getSeriesList(all.value))
  const related = (current: ProductMeta) => getRelated(all.value, current)
  const getBySlug = (slug: string) => all.value.find(p => p.slug === slug)
  return { all, featured, seriesList, getBySlug, related }
}
```

- [ ] **Step 3: Verify build**

Run: `yarn build`
Expected: succeeds. (Detail page still uses `@nuxt/content` — untouched here; both coexist.) `yarn test` still passes.

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat(store): useProducts fetches /public/products (SSR) via runtimeConfig apiBase"
```

---

### Task 3: Detail page fetches API + markdown-it render

**Files:**
- Modify: `package.json` (add `markdown-it` + `@types/markdown-it`)
- Modify: `pages/san-pham/[slug].vue`

**Interfaces:**
- Consumes: `mapApiProduct`, `formatPrice`, `related` from `useProducts`, `${apiBase}/public/products/:slug`.

- [ ] **Step 1: Add dep**

```bash
cd /Users/assmin/Documents/Projects/ichigo-studio/ichigo-studio-store
yarn add markdown-it && yarn add -D @types/markdown-it
```

- [ ] **Step 2: `pages/san-pham/[slug].vue`** — replace `<script setup>` data + the specs/body render:

Script:
```typescript
<script setup lang="ts">
import MarkdownIt from 'markdown-it'
import { mapApiProduct, formatPrice } from '~/utils/products'

const route = useRoute()
const slug = computed(() => String(route.params.slug))
const { public: { apiBase } } = useRuntimeConfig()
const { related } = useProducts()
const shop = useShop()

const { data: product } = await useAsyncData(`product-${slug.value}`, async () => {
  try {
    const api = await $fetch<any>(`${apiBase}/public/products/${slug.value}`)
    return mapApiProduct(api)
  } catch {
    return null
  }
})

if (!product.value) {
  throw createError({ statusCode: 404, statusMessage: 'Không tìm thấy sản phẩm' })
}

const md = new MarkdownIt()
const bodyHtml = computed(() => md.render(product.value?.bodyMd ?? ''))

const relatedItems = computed(() => (product.value ? related(product.value) : []))

useSeoMeta({
  title: () => `${product.value?.title} - Ichigo Studio`,
  description: () => `${product.value?.title} - ${product.value?.series}. Phụ kiện in 3D cho đồ chơi DX, in FDM.`,
  ogImage: () => product.value?.cover,
})
</script>
```

Template changes (within the existing markup):
- Remove the `scale`/`height`/`capacity` `<dl>` rows (fields no longer exist). Keep the "Chất liệu" row; change the price row.
- Replace the price `<dd>`:
  ```html
  <dd class="mt-0.5 text-sm font-medium text-hopper">{{ formatPrice(product.price) }}</dd>
  ```
- Replace the body block:
  ```html
  <div class="prose prose-sm mt-6 max-w-none" style="color: rgba(238,240,232,0.75);" v-html="bodyHtml" />
  ```
  (remove `<ContentRenderer :value="product" />`).

Final specs `<dl>` becomes just Chất liệu + Giá:
```html
<dl class="mt-6 border-t border-paper/10 pt-4 font-sans">
  <div class="py-3 border-b border-paper/10">
    <dt class="text-[10px] uppercase tracking-[0.12em] text-silver font-medium">Chất liệu</dt>
    <dd class="mt-0.5 text-sm font-medium text-paper">{{ product.material }}</dd>
  </div>
  <div class="pt-3">
    <dt class="text-[10px] uppercase tracking-[0.12em] text-silver font-medium">Giá tham khảo</dt>
    <dd class="mt-0.5 text-sm font-medium text-hopper">{{ formatPrice(product.price) }}</dd>
  </div>
</dl>
```

- [ ] **Step 3: Verify build**

Run: `yarn build` — succeeds. `yarn test` passes. (`@nuxt/content` now unused at runtime but still installed — removed in Task 5.)

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat(store): product detail fetches API + renders bodyMd via markdown-it"
```

---

### Task 4: Per-product images + price in cards/gallery

**Files:**
- Modify: `components/ProductCard.vue`
- Modify: `components/ProductGallery.vue`
- Modify: `components/Lightbox.vue` (only the `hasPhotos` prop wiring, if needed)

**Interfaces:**
- Consumes: `product.cover` (card), `product.images` (gallery), `formatPrice`.

- [ ] **Step 1: `components/ProductCard.vue`** — real image when `product.cover`, else placeholder; drop `shop.hasPhotos`; drop `scale/capacity` lines; add price:

```vue
<script setup lang="ts">
import type { ProductMeta } from '~/types/product'
import { formatPrice } from '~/utils/products'
defineProps<{ product: ProductMeta }>()
</script>

<template>
  <NuxtLink :to="`/san-pham/${product.slug}`" class="group block">
    <div class="relative overflow-hidden rounded bg-panel border border-paper/10 transition hover:border-hopper">
      <template v-if="product.cover">
        <NuxtImg
          :src="product.cover"
          :alt="`${product.title} - phụ kiện in 3D`"
          loading="lazy"
          width="600"
          class="aspect-square w-full object-contain transition duration-500 group-hover:scale-[1.03]"
        />
      </template>
      <template v-else>
        <FigurePlaceholder :label="product.title" ratio="1/1" :seed="product.slug" />
      </template>
      <span class="absolute bottom-2 right-2 font-sans text-[9px] font-medium tracking-[0.15em] text-silver/60 bg-night/70 px-1.5 py-0.5 rounded-sm">FDM</span>
    </div>
    <div class="mt-3">
      <p class="font-sans text-[10px] uppercase tracking-[0.15em] text-hopper font-medium">{{ product.series }}</p>
      <h3 class="mt-1 font-sans text-base font-semibold leading-snug text-paper">{{ product.title }}</h3>
      <p class="mt-0.5 font-sans text-xs font-medium text-hopper">{{ formatPrice(product.price) }}</p>
    </div>
  </NuxtLink>
</template>
```

- [ ] **Step 2: `components/ProductGallery.vue`** — replace `shop.hasPhotos` checks with `props.images?.length` (real images available). Read the file; where it does `v-if="shop.hasPhotos"` for showing real images, change to `v-if="images && images.length"`; the `else` keeps `FigurePlaceholder`. Remove the now-unused `useShop`/`shop` import if only used for this. Pass `:has-photos="!!(images && images.length)"` to `Lightbox` (replacing `shop.hasPhotos`).

- [ ] **Step 3: `components/Lightbox.vue`** — no change needed if it already takes `hasPhotos` prop and renders real image when `hasPhotos !== false`; the parent now passes the per-product value. Verify by reading; adjust only if it referenced `shop` directly.

- [ ] **Step 4: Verify build + test**

Run: `yarn build` (succeeds) and `yarn test` (passes).

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat(store): per-product images (cover/images) + price display in card/gallery"
```

---

### Task 5: Remove @nuxt/content + SSR nitro config cleanup

**Files:**
- Modify: `nuxt.config.ts`
- Delete: `content.config.ts`
- Delete: `content/products/*.md` (unused)

**Interfaces:** none new.

- [ ] **Step 1: `nuxt.config.ts`** — remove markdown/prerender wiring:
  - Delete the `readdirSync`/`resolve` imports and the `productRoutes` const (lines 1-6).
  - `modules`: remove `'@nuxt/content'` → `modules: ['@nuxt/image', '@nuxtjs/tailwindcss']`.
  - Remove the `nitro.prerender` block entirely (SSR now; no route prerendering). Keep the rest (`app`, `image`, `css`, `runtimeConfig`).
  - Keep `image.domains` as-is; when deploying with remote R2 images, add the media host there (note only).

Resulting `nuxt.config.ts` top:
```typescript
export default defineNuxtConfig({
  compatibilityDate: '2025-01-01',
  modules: ['@nuxt/image', '@nuxtjs/tailwindcss'],
  css: ['~/assets/css/main.css'],
  app: { /* unchanged */ },
  image: { domains: ['picsum.photos'] },
  runtimeConfig: { public: { apiBase: 'http://localhost:8787' } },
})
```

- [ ] **Step 2: Remove content module + files**

```bash
cd /Users/assmin/Documents/Projects/ichigo-studio/ichigo-studio-store
git rm content.config.ts
git rm -r content/products
yarn remove @nuxt/content @nuxt/content-related-if-any 2>/dev/null || yarn remove @nuxt/content
```
(If `yarn remove @nuxt/content` errors because also referenced, just remove `@nuxt/content`; leaving it in devDeps is harmless but prefer removing. `better-sqlite3` was a @nuxt/content build dep — can also `yarn remove better-sqlite3` if nothing else uses it.)

- [ ] **Step 3: Grep for stragglers**

Run: `grep -rn "queryCollection\|ContentRenderer\|@nuxt/content\|content.config" --include=*.vue --include=*.ts . | grep -v node_modules`
Expected: no results (all removed). Fix any leftover.

- [ ] **Step 4: Verify build + test**

Run: `yarn build` (succeeds, no @nuxt/content) + `yarn test` (passes).

- [ ] **Step 5: Manual smoke (optional, needs API)**

Chạy API local (`cd ../ichigo-studio-api && yarn dev`, đã seed + có sản phẩm `published` với ảnh), rồi `yarn dev` store: trang chủ + `/san-pham` + chi tiết hiển thị sản phẩm từ API, giá đúng (hoặc "Liên hệ"), mô tả markdown render, ảnh thật khi có cover/images, placeholder khi không.

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "chore(store): drop @nuxt/content + prerender; SSR-only from API"
```

---

## Self-Review Notes

- **Spec coverage:** SSR fetch /public (T2 list, T3 detail); markdown-it for bodyMd (T3); per-product images via cover/images not global hasPhotos (T4); price number + formatPrice everywhere priceRef was (T1 helper, T3 detail, T4 card); runtimeConfig apiBase (T2); drop @nuxt/content + prerender (T5); type updated (T1). Local-first (apiBase localhost default). Out-of-scope: deploy preset (noted), edge cache, deleting md handled in T5.
- **Type consistency:** `ProductMeta` (list) has no `bodyMd`; `Product` adds `bodyMd`. `mapApiProduct` returns `Product` (superset) — assignable where `ProductMeta` expected. List API lacks `images` → `mapApiProduct` yields `images: []`, `cover` from API; detail API has `images` → populated. Card keys on `cover`, gallery on `images` — matches which endpoint provides what.
- **Green-per-task:** T1 (types/utils, content still there) builds; T2 (useProducts→API, content still there for detail) builds; T3 (detail→API, content now unused but installed) builds; T4 (components) builds; T5 removes content last. Each task independently builds + tests.
- **Ambiguity fixed:** SSR fetch is server-side (no CORS). `$fetch` used inside `useAsyncData` for SSR data + graceful `[]`/null on error. Detail 404 via `createError`. markdown-it default (no raw HTML) for basic safety on owner-authored content.
