# Tokusatsu 3D Shop - Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Xây website showcase (không bán hàng) đồ chơi in 3D chủ đề Tokusatsu bằng Nuxt 3, dữ liệu từ Markdown, liên hệ qua Messenger.

**Architecture:** Nuxt 3 render tĩnh (SSG). Sản phẩm lưu trong `content/products/*.md` qua @nuxt/content v3. Logic thuần (lọc/sort/link) tách ra `utils/` để unit-test bằng Vitest; pages/components nghiệm thu qua dev server + `nuxt generate`. Styling bằng Tailwind, ảnh tối ưu bằng @nuxt/image, cấu hình shop tập trung trong `app.config.ts`.

**Tech Stack:** Nuxt 3, Vue 3, TypeScript, Tailwind CSS, @nuxt/content (v3), @nuxt/image, Vitest + @nuxt/test-utils.

## Global Constraints

- Ngôn ngữ nội dung: **tiếng Việt**.
- Render: **SSG** (`nuxt generate`); mọi route sản phẩm phải được prerender.
- Dữ liệu sản phẩm: **chỉ** từ `content/products/<slug>.md` (thêm SP = thêm file, không sửa code).
- Link liên hệ: duy nhất qua `messengerUrl` trong `app.config.ts` (1 chỗ, áp toàn site).
- Thẩm mỹ: museum/gallery. Dials `DESIGN_VARIANCE 6 / MOTION 4 / DENSITY 3`.
- **Chống AI-slop (bắt buộc)**: ZERO em-dash (`—`/`–`) ở mọi text hiển thị; tối đa 1 eyebrow / 3 section; không scroll cue; không locale/time/weather strip; không version label; không decorative dots; 1 accent màu duy nhất; không serif mặc định (cấm Fraunces/Instrument Serif); nền off-white + chữ off-black (không `#000`/`#fff`); ảnh thật là nhân vật chính, không fake-screenshot bằng div.
- A11y: alt cho mọi ảnh; focus state rõ; contrast WCAG AA; lightbox có focus trap + bàn phím; honor `prefers-reduced-motion`.
- Placeholder ảnh: `https://picsum.photos/seed/<seed>/<w>/<h>`.
- Commit thường xuyên, mỗi task >= 1 commit.

---

### Task 1: Scaffold dự án Nuxt 3 + Tailwind + dependencies + cấu hình nền

**Files:**
- Create: `package.json`, `nuxt.config.ts`, `tsconfig.json`, `app.config.ts`, `app.vue`, `assets/css/main.css`, `tailwind.config.ts`, `vitest.config.ts`, `.gitignore` (đã có)
- Create: `types/product.ts`

**Interfaces:**
- Produces:
  - `app.config.ts` default export với `shop: { name, tagline, messengerUrl, facebookUrl, responseTime, area }` (tất cả `string`).
  - `types/product.ts`: `export interface Product { title: string; slug: string; series: string; scale: string; height: string; material: string; priceRef: string; featured: boolean; order: number; images: string[]; cover: string; description?: string }`
  - `export type ProductMeta = Omit<Product, 'description'>` (dùng cho list/grid).

- [ ] **Step 1: Khởi tạo project & cài dependencies**

Run:
```bash
cd /Users/assmin/Documents/Projects/3d-website
npm init -y
npm install nuxt@^3 vue vue-router
npm install @nuxt/content @nuxt/image
npm install -D tailwindcss@^3 @nuxtjs/tailwindcss vitest @nuxt/test-utils @vue/test-utils happy-dom typescript
```
Expected: cài thành công, `node_modules/` xuất hiện.

> Nếu `@nuxtjs/tailwindcss` gây xung đột với Nuxt mới, dùng Tailwind v3 chuẩn. Implementer xác nhận phiên bản Nuxt thực tế (`npx nuxi info`) và điều chỉnh nếu cần.

- [ ] **Step 2: Viết `nuxt.config.ts`**

```ts
export default defineNuxtConfig({
  compatibilityDate: '2025-01-01',
  modules: ['@nuxt/content', '@nuxt/image', '@nuxtjs/tailwindcss'],
  css: ['~/assets/css/main.css'],
  app: {
    head: {
      htmlAttrs: { lang: 'vi' },
      meta: [{ name: 'viewport', content: 'width=device-width, initial-scale=1' }],
    },
  },
  image: {
    domains: ['picsum.photos'],
  },
  nitro: {
    prerender: { crawlLinks: true, routes: ['/'] },
  },
  colorMode: { classSuffix: '' },
})
```

- [ ] **Step 3: Viết `app.config.ts`** (cấu hình shop tập trung)

```ts
export default defineAppConfig({
  shop: {
    name: 'Henshin Studio',
    tagline: 'Figure in 3D thủ công cho người mê tokusatsu.',
    messengerUrl: 'https://m.me/henshinstudio',
    facebookUrl: 'https://facebook.com/henshinstudio',
    responseTime: 'Thường phản hồi trong vài giờ',
    area: 'TP. Hồ Chí Minh',
  },
})
```

- [ ] **Step 4: Viết `types/product.ts`** (theo Interfaces ở trên — copy đầy đủ)

```ts
export interface Product {
  title: string
  slug: string
  series: string
  scale: string
  height: string
  material: string
  priceRef: string
  featured: boolean
  order: number
  images: string[]
  cover: string
  description?: string
}

export type ProductMeta = Omit<Product, 'description'>
```

- [ ] **Step 5: Viết `tailwind.config.ts`** (design tokens museum + dark mode)

```ts
import type { Config } from 'tailwindcss'

export default <Partial<Config>>{
  darkMode: 'class',
  content: [
    './components/**/*.{vue,js,ts}',
    './layouts/**/*.vue',
    './pages/**/*.vue',
    './app.vue',
    './content/**/*.md',
  ],
  theme: {
    extend: {
      colors: {
        // nền off-white / off-black, 1 accent duy nhất (đỏ thép trầm)
        bone: '#f4f2ec',
        ink: '#16151a',
        accent: { DEFAULT: '#b4232a', soft: '#c8443b' },
      },
      fontFamily: {
        // sans display có gu cho heading, sans sạch cho body (self-host ở Task 3)
        display: ['"Clash Display"', 'system-ui', 'sans-serif'],
        sans: ['"Geist"', 'system-ui', 'sans-serif'],
      },
      maxWidth: { content: '1400px' },
    },
  },
}
```

- [ ] **Step 6: Viết `assets/css/main.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root { color-scheme: light dark; }

html { scroll-behavior: smooth; }
@media (prefers-reduced-motion: reduce) {
  html { scroll-behavior: auto; }
  *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
}

body {
  @apply bg-bone text-ink antialiased;
}
.dark body {
  @apply bg-ink text-bone;
}
```

- [ ] **Step 7: Viết `app.vue`** (tạm, sẽ dùng layout ở Task 3)

```vue
<template>
  <NuxtRouteAnnouncer />
  <NuxtPage />
</template>
```

- [ ] **Step 8: Viết `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'happy-dom',
    include: ['tests/**/*.test.ts'],
  },
})
```

- [ ] **Step 9: Thêm scripts vào `package.json`**

Đảm bảo `package.json` có:
```json
{
  "scripts": {
    "dev": "nuxt dev",
    "build": "nuxt build",
    "generate": "nuxt generate",
    "preview": "nuxt preview",
    "test": "vitest run"
  }
}
```

- [ ] **Step 10: Chạy dev server kiểm tra scaffold**

Run: `npm run dev`
Expected: server khởi động ở `http://localhost:3000`, không lỗi build. Tắt server (Ctrl-C).

- [ ] **Step 11: Commit**

```bash
git add -A
git commit -m "chore: scaffold Nuxt 3 + Tailwind + cấu hình nền"
```

---

### Task 2: Content collection + sản phẩm mẫu + utils lọc/sort (TDD)

**Files:**
- Create: `content.config.ts`
- Create: `content/products/kamen-rider-kuuga-mighty.md`, `content/products/ultraman-tiga-multi.md`, `content/products/godzilla-1995.md`, `content/products/zyuranger-tyrannoranger.md`, `content/products/kamen-rider-w-cyclonejoker.md`
- Create: `utils/products.ts`
- Test: `tests/products.test.ts`

**Interfaces:**
- Consumes: `Product`, `ProductMeta` từ `types/product.ts` (Task 1).
- Produces (hàm thuần, dùng ở composable & pages):
  - `sortByOrder(items: ProductMeta[]): ProductMeta[]`
  - `getFeatured(items: ProductMeta[]): ProductMeta[]` (lọc `featured`, đã sort)
  - `getSeriesList(items: ProductMeta[]): string[]` (series duy nhất, giữ thứ tự xuất hiện)
  - `filterBySeries(items: ProductMeta[], series: string | null): ProductMeta[]` (`null`/`'all'` -> tất cả)
  - `getRelated(items: ProductMeta[], current: ProductMeta, limit = 4): ProductMeta[]` (cùng series, khác slug)

- [ ] **Step 1: Viết test thất bại** `tests/products.test.ts`

```ts
import { describe, it, expect } from 'vitest'
import { sortByOrder, getFeatured, getSeriesList, filterBySeries, getRelated } from '../utils/products'
import type { ProductMeta } from '../types/product'

const p = (over: Partial<ProductMeta>): ProductMeta => ({
  title: 't', slug: 's', series: 'Kamen Rider', scale: '1/12', height: '18 cm',
  material: 'resin', priceRef: 'Liên hệ', featured: false, order: 0,
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
    const cur = items[0] // slug a, Ultraman
    expect(getRelated(items, cur, 4).map(i => i.slug)).toEqual(['c'])
  })
})
```

- [ ] **Step 2: Chạy test xác nhận FAIL**

Run: `npm test`
Expected: FAIL (`Cannot find module '../utils/products'`).

- [ ] **Step 3: Viết `utils/products.ts`** (minimal cho test pass)

```ts
import type { ProductMeta } from '../types/product'

export function sortByOrder(items: ProductMeta[]): ProductMeta[] {
  return [...items].sort((a, b) => a.order - b.order)
}

export function getFeatured(items: ProductMeta[]): ProductMeta[] {
  return sortByOrder(items.filter(i => i.featured))
}

export function getSeriesList(items: ProductMeta[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const i of sortByOrder(items)) {
    if (!seen.has(i.series)) { seen.add(i.series); out.push(i.series) }
  }
  return out
}

export function filterBySeries(items: ProductMeta[], series: string | null): ProductMeta[] {
  const sorted = sortByOrder(items)
  if (!series || series === 'all') return sorted
  return sorted.filter(i => i.series === series)
}

export function getRelated(items: ProductMeta[], current: ProductMeta, limit = 4): ProductMeta[] {
  return sortByOrder(items)
    .filter(i => i.series === current.series && i.slug !== current.slug)
    .slice(0, limit)
}
```

- [ ] **Step 4: Chạy test xác nhận PASS**

Run: `npm test`
Expected: PASS toàn bộ 5 test.

- [ ] **Step 5: Viết `content.config.ts`** (schema collection - Nuxt Content v3)

```ts
import { defineContentConfig, defineCollection, z } from '@nuxt/content'

export default defineContentConfig({
  collections: {
    products: defineCollection({
      type: 'page',
      source: 'products/*.md',
      schema: z.object({
        title: z.string(),
        slug: z.string(),
        series: z.string(),
        scale: z.string(),
        height: z.string(),
        material: z.string(),
        priceRef: z.string(),
        featured: z.boolean().default(false),
        order: z.number().default(99),
        images: z.array(z.string()),
        cover: z.string(),
      }),
    }),
  },
})
```

> Nếu phiên bản @nuxt/content là v2 (API `queryContent` thay vì `queryCollection`), implementer dùng `content/` thư mục + frontmatter không cần `content.config.ts`. Xác nhận version bằng `npm ls @nuxt/content` trước. Plan này nhắm v3.

- [ ] **Step 6: Viết 5 file sản phẩm mẫu**

Tạo `content/products/kamen-rider-kuuga-mighty.md`:
```markdown
---
title: "Kamen Rider Kuuga - Mighty Form"
slug: "kamen-rider-kuuga-mighty"
series: "Kamen Rider"
scale: "1/12"
height: "18 cm"
material: "Resin in 3D, sơn thủ công"
priceRef: "Liên hệ"
featured: true
order: 1
cover: "https://picsum.photos/seed/kuuga-cover/1200/1500"
images:
  - "https://picsum.photos/seed/kuuga-1/1200/1500"
  - "https://picsum.photos/seed/kuuga-2/1200/1500"
  - "https://picsum.photos/seed/kuuga-3/1200/1500"
---

Mighty Form là hình thái cơ bản của Kamen Rider Kuuga. Model tái hiện chi tiết
giáp Arcle, đường gân cơ và đôi mắt kép đặc trưng. Sơn thủ công nhiều lớp,
có thể tùy chọn nền trưng bày.
```

Tạo 4 file còn lại theo cùng cấu trúc, đổi nội dung:
- `ultraman-tiga-multi.md`: title "Ultraman Tiga - Multi Type", series "Ultraman", order 2, featured true, seed `tiga-*`.
- `godzilla-1995.md`: title "Godzilla 1995 - Burning", series "Kaiju / Godzilla", order 3, featured true, seed `godzilla-*`.
- `zyuranger-tyrannoranger.md`: title "Tyranno Ranger - Zyuranger", series "Super Sentai", order 4, featured false, seed `zyuranger-*`.
- `kamen-rider-w-cyclonejoker.md`: title "Kamen Rider W - CycloneJoker", series "Kamen Rider", order 5, featured false, seed `w-*`.

Mỗi file có 3 ảnh `images` + 1 `cover`, mô tả tiếng Việt 2-3 câu (không em-dash).

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: content schema, sản phẩm mẫu, utils lọc/sort (TDD)"
```

---

### Task 3: useProducts composable + useShop + Layout (Header/Footer/Floating/Messenger) + fonts

**Files:**
- Create: `composables/useProducts.ts`, `composables/useShop.ts`
- Create: `layouts/default.vue`
- Create: `components/AppHeader.vue`, `components/AppFooter.vue`, `components/FloatingContact.vue`, `components/MessengerButton.vue`, `components/SectionHeading.vue`, `components/ColorModeToggle.vue`
- Create: `utils/messenger.ts`
- Create: `assets/fonts/` (font self-host) + cập nhật `assets/css/main.css`
- Modify: `app.vue`
- Test: `tests/messenger.test.ts`

**Interfaces:**
- Consumes: utils từ Task 2; `app.config.ts` shop.
- Produces:
  - `useProducts()` -> `{ all: Ref<ProductMeta[]>, featured, seriesList, getBySlug(slug), related(current) }` (dùng `queryCollection('products')`).
  - `useShop()` -> trả `useAppConfig().shop`.
  - `buildMessengerHref(baseUrl: string): string` trong `utils/messenger.ts` (chuẩn hóa, đảm bảo có `https://`).
  - `<MessengerButton :label="..." variant="primary|ghost" />` - render `<a>` tới messenger.
  - `<SectionHeading title subtitle? />`.

- [ ] **Step 1: Viết test thất bại** `tests/messenger.test.ts`

```ts
import { describe, it, expect } from 'vitest'
import { buildMessengerHref } from '../utils/messenger'

describe('buildMessengerHref', () => {
  it('giữ nguyên url đã có https', () => {
    expect(buildMessengerHref('https://m.me/abc')).toBe('https://m.me/abc')
  })
  it('thêm https nếu thiếu', () => {
    expect(buildMessengerHref('m.me/abc')).toBe('https://m.me/abc')
  })
  it('trả chuỗi rỗng an toàn nếu input rỗng', () => {
    expect(buildMessengerHref('')).toBe('')
  })
})
```

- [ ] **Step 2: Chạy test xác nhận FAIL**

Run: `npm test`
Expected: FAIL (`Cannot find module '../utils/messenger'`).

- [ ] **Step 3: Viết `utils/messenger.ts`**

```ts
export function buildMessengerHref(baseUrl: string): string {
  if (!baseUrl) return ''
  if (/^https?:\/\//i.test(baseUrl)) return baseUrl
  return `https://${baseUrl}`
}
```

- [ ] **Step 4: Chạy test xác nhận PASS**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Viết `composables/useShop.ts`**

```ts
export function useShop() {
  return useAppConfig().shop
}
```

- [ ] **Step 6: Viết `composables/useProducts.ts`**

```ts
import { sortByOrder, getFeatured, getSeriesList, getRelated } from '~/utils/products'
import type { ProductMeta } from '~/types/product'

export function useProducts() {
  const { data } = useAsyncData('products', () =>
    queryCollection('products').all() as Promise<any[]>
  )
  const all = computed<ProductMeta[]>(() => sortByOrder((data.value ?? []) as ProductMeta[]))
  const featured = computed(() => getFeatured(all.value))
  const seriesList = computed(() => getSeriesList(all.value))
  const related = (current: ProductMeta) => getRelated(all.value, current)
  return { all, featured, seriesList, related }
}
```

> `queryCollection` trả về object có cả frontmatter + `body`/`path`. Implementer kiểm tra shape thực tế và map sang `ProductMeta` nếu field tên khác (vd `path` để build route). Giữ logic lọc trong utils đã test.

- [ ] **Step 7: Self-host fonts + cập nhật CSS**

Tải 2 font (display + body) dạng woff2 vào `assets/fonts/`. Trong `assets/css/main.css` thêm `@font-face` với `font-display: swap` cho `Clash Display` (display) và `Geist` (body). Nếu không tải được file, thay bằng cặp khác trong nhóm cho phép (Cabinet Grotesk / PP Neue Montreal / Outfit + system), KHÔNG dùng Inter mặc định, KHÔNG serif.

```css
@font-face {
  font-family: 'Geist';
  src: url('~/assets/fonts/Geist-Regular.woff2') format('woff2');
  font-weight: 400; font-display: swap;
}
/* lặp cho 500/600 và cho Clash Display 600/700 */
```

- [ ] **Step 8: Viết `components/MessengerButton.vue`**

```vue
<script setup lang="ts">
import { buildMessengerHref } from '~/utils/messenger'
const props = withDefaults(defineProps<{ label?: string; variant?: 'primary' | 'ghost' }>(), {
  label: 'Liên hệ qua Messenger', variant: 'primary',
})
const shop = useShop()
const href = computed(() => buildMessengerHref(shop.messengerUrl))
</script>

<template>
  <a
    :href="href" target="_blank" rel="noopener noreferrer"
    :class="[
      'inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-medium transition active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
      variant === 'primary'
        ? 'bg-accent text-white hover:bg-accent-soft'
        : 'border border-ink/20 text-ink hover:border-ink/50 dark:border-bone/30 dark:text-bone',
    ]"
  >
    <svg viewBox="0 0 24 24" class="h-4 w-4" fill="currentColor" aria-hidden="true"><path d="M12 2C6.5 2 2 6.1 2 11.2c0 2.9 1.4 5.5 3.7 7.2V22l3.4-1.9c.9.3 1.9.4 2.9.4 5.5 0 10-4.1 10-9.2S17.5 2 12 2zm1 12.4l-2.5-2.7-4.9 2.7 5.4-5.7 2.6 2.7 4.8-2.7-5.4 5.7z"/></svg>
    {{ label }}
  </a>
</template>
```

> Icon Messenger trên là 1 glyph thương hiệu đơn giản (chấp nhận được vì là logo nền tảng, không phải tự vẽ icon UI). Nếu cài được thư viện icon, có thể thay.

- [ ] **Step 9: Viết `components/SectionHeading.vue`**

```vue
<script setup lang="ts">
defineProps<{ title: string; subtitle?: string }>()
</script>

<template>
  <div class="mb-10 max-w-content">
    <h2 class="font-display text-3xl md:text-4xl tracking-tight leading-tight">{{ title }}</h2>
    <p v-if="subtitle" class="mt-3 max-w-[60ch] text-ink/60 dark:text-bone/60">{{ subtitle }}</p>
  </div>
</template>
```

- [ ] **Step 10: Viết `components/ColorModeToggle.vue`**

```vue
<script setup lang="ts">
const colorMode = useColorMode()
function toggle() { colorMode.preference = colorMode.value === 'dark' ? 'light' : 'dark' }
</script>

<template>
  <button
    type="button" @click="toggle"
    class="rounded-full p-2 text-ink/70 transition hover:text-ink dark:text-bone/70 dark:hover:text-bone focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
    :aria-label="colorMode.value === 'dark' ? 'Chuyển nền sáng' : 'Chuyển nền tối'"
  >
    <span v-if="colorMode.value === 'dark'">○</span>
    <span v-else>●</span>
  </button>
</template>
```

> Cần `@nuxtjs/color-mode`. Thêm vào dependencies (`npm i -D @nuxtjs/color-mode`) và `modules` trong `nuxt.config.ts` ở task này nếu chưa có.

- [ ] **Step 11: Viết `components/AppHeader.vue`** (nav 1 dòng, <= 80px)

```vue
<script setup lang="ts">
const shop = useShop()
const links = [
  { to: '/', label: 'Trang chủ' },
  { to: '/san-pham', label: 'Bộ sưu tập' },
  { to: '/gioi-thieu', label: 'Giới thiệu' },
  { to: '/lien-he', label: 'Liên hệ' },
]
const open = ref(false)
</script>

<template>
  <header class="sticky top-0 z-40 border-b border-ink/10 bg-bone/80 backdrop-blur dark:border-bone/10 dark:bg-ink/80">
    <div class="mx-auto flex h-16 max-w-content items-center justify-between px-4 md:px-8">
      <NuxtLink to="/" class="font-display text-lg tracking-tight">{{ shop.name }}</NuxtLink>
      <nav class="hidden items-center gap-8 md:flex">
        <NuxtLink v-for="l in links" :key="l.to" :to="l.to"
          class="text-sm text-ink/70 transition hover:text-ink dark:text-bone/70 dark:hover:text-bone">{{ l.label }}</NuxtLink>
        <ColorModeToggle />
      </nav>
      <div class="flex items-center gap-2 md:hidden">
        <ColorModeToggle />
        <button type="button" @click="open = !open" aria-label="Mở menu" class="p-2">≡</button>
      </div>
    </div>
    <nav v-if="open" class="border-t border-ink/10 px-4 py-3 md:hidden dark:border-bone/10">
      <NuxtLink v-for="l in links" :key="l.to" :to="l.to" @click="open = false"
        class="block py-2 text-ink/80 dark:text-bone/80">{{ l.label }}</NuxtLink>
    </nav>
  </header>
</template>
```

- [ ] **Step 12: Viết `components/AppFooter.vue`**

```vue
<script setup lang="ts">
const shop = useShop()
</script>

<template>
  <footer class="mt-24 border-t border-ink/10 dark:border-bone/10">
    <div class="mx-auto flex max-w-content flex-col gap-6 px-4 py-12 md:flex-row md:items-end md:justify-between md:px-8">
      <div>
        <p class="font-display text-xl tracking-tight">{{ shop.name }}</p>
        <p class="mt-2 max-w-[40ch] text-sm text-ink/60 dark:text-bone/60">{{ shop.tagline }}</p>
        <p class="mt-1 text-sm text-ink/50 dark:text-bone/50">Khu vực: {{ shop.area }}</p>
      </div>
      <MessengerButton variant="ghost" label="Nhắn tin cho shop" />
    </div>
    <div class="border-t border-ink/10 py-4 text-center text-xs text-ink/40 dark:border-bone/10 dark:text-bone/40">
      © {{ new Date().getFullYear() }} {{ shop.name }}
    </div>
  </footer>
</template>
```

- [ ] **Step 13: Viết `components/FloatingContact.vue`** (nút nổi)

```vue
<script setup lang="ts">
import { buildMessengerHref } from '~/utils/messenger'
const shop = useShop()
const href = computed(() => buildMessengerHref(shop.messengerUrl))
</script>

<template>
  <a :href="href" target="_blank" rel="noopener noreferrer"
    aria-label="Liên hệ qua Messenger"
    class="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-accent text-white shadow-lg transition hover:bg-accent-soft active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">
    <svg viewBox="0 0 24 24" class="h-6 w-6" fill="currentColor" aria-hidden="true"><path d="M12 2C6.5 2 2 6.1 2 11.2c0 2.9 1.4 5.5 3.7 7.2V22l3.4-1.9c.9.3 1.9.4 2.9.4 5.5 0 10-4.1 10-9.2S17.5 2 12 2zm1 12.4l-2.5-2.7-4.9 2.7 5.4-5.7 2.6 2.7 4.8-2.7-5.4 5.7z"/></svg>
  </a>
</template>
```

- [ ] **Step 14: Viết `layouts/default.vue`**

```vue
<template>
  <div class="flex min-h-[100dvh] flex-col">
    <AppHeader />
    <main class="flex-1">
      <slot />
    </main>
    <AppFooter />
    <FloatingContact />
  </div>
</template>
```

- [ ] **Step 15: Cập nhật `app.vue` để dùng layout**

```vue
<template>
  <NuxtRouteAnnouncer />
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>
```

- [ ] **Step 16: Tạo trang tạm `pages/index.vue` để chạy dev**

```vue
<template>
  <section class="mx-auto max-w-content px-4 py-20 md:px-8">
    <h1 class="font-display text-4xl">Đang dựng...</h1>
  </section>
</template>
```

- [ ] **Step 17: Chạy dev kiểm tra layout + dark mode**

Run: `npm run dev`
Expected: Header (nav 1 dòng), footer, nút nổi Messenger hiển thị; toggle dark mode đổi nền; không lỗi console. Tắt server.

- [ ] **Step 18: Commit**

```bash
git add -A
git commit -m "feat: layout, header/footer, messenger CTA, dark mode, fonts, useProducts"
```

---

### Task 4: ProductCard + SeriesFilter + trang Bộ sưu tập `/san-pham`

**Files:**
- Create: `components/ProductCard.vue`, `components/SeriesFilter.vue`
- Create: `pages/san-pham/index.vue`

**Interfaces:**
- Consumes: `useProducts()` (Task 3), `filterBySeries` (Task 2), `ProductMeta`.
- Produces:
  - `<ProductCard :product="ProductMeta" />` - link tới `/san-pham/<slug>`.
  - `<SeriesFilter :series="string[]" v-model="active" />` - `active: string` (`'all'` mặc định).

- [ ] **Step 1: Viết `components/ProductCard.vue`**

```vue
<script setup lang="ts">
import type { ProductMeta } from '~/types/product'
defineProps<{ product: ProductMeta }>()
</script>

<template>
  <NuxtLink :to="`/san-pham/${product.slug}`" class="group block">
    <div class="relative overflow-hidden rounded-xl bg-ink/5 dark:bg-bone/5">
      <NuxtImg :src="product.cover" :alt="product.title" loading="lazy"
        width="600" height="750"
        class="aspect-[4/5] w-full object-cover transition duration-500 group-hover:scale-[1.03]" />
    </div>
    <div class="mt-3">
      <p class="text-xs uppercase tracking-wide text-ink/45 dark:text-bone/45">{{ product.series }}</p>
      <h3 class="mt-1 font-display text-lg leading-snug">{{ product.title }}</h3>
      <p class="mt-0.5 text-sm text-ink/55 dark:text-bone/55">Tỉ lệ {{ product.scale }}</p>
    </div>
  </NuxtLink>
</template>
```

> Lưu ý eyebrow: `series` ở đây là nhãn dữ liệu trên card (không phải eyebrow section), chấp nhận được. Không thêm eyebrow vào tiêu đề các section trang.

- [ ] **Step 2: Viết `components/SeriesFilter.vue`**

```vue
<script setup lang="ts">
const props = defineProps<{ series: string[]; modelValue: string }>()
const emit = defineEmits<{ 'update:modelValue': [string] }>()
const options = computed(() => ['all', ...props.series])
function label(s: string) { return s === 'all' ? 'Tất cả' : s }
</script>

<template>
  <div class="flex flex-wrap gap-2">
    <button v-for="s in options" :key="s" type="button"
      @click="emit('update:modelValue', s)"
      :aria-pressed="modelValue === s"
      :class="[
        'rounded-full border px-4 py-1.5 text-sm transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent',
        modelValue === s
          ? 'border-accent bg-accent text-white'
          : 'border-ink/15 text-ink/70 hover:border-ink/40 dark:border-bone/20 dark:text-bone/70',
      ]">
      {{ label(s) }}
    </button>
  </div>
</template>
```

- [ ] **Step 3: Viết `pages/san-pham/index.vue`**

```vue
<script setup lang="ts">
import { filterBySeries } from '~/utils/products'
const { all, seriesList } = useProducts()
const active = ref('all')
const visible = computed(() => filterBySeries(all.value, active.value))

useSeoMeta({
  title: 'Bộ sưu tập - Henshin Studio',
  description: 'Bộ sưu tập figure in 3D chủ đề tokusatsu, sơn thủ công.',
})
</script>

<template>
  <section class="mx-auto max-w-content px-4 py-16 md:px-8">
    <SectionHeading
      title="Bộ sưu tập"
      subtitle="Mỗi model được in 3D độ phân giải cao và hoàn thiện sơn thủ công. Lọc theo series bên dưới." />

    <SeriesFilter :series="seriesList" v-model="active" class="mb-10" />

    <div v-if="visible.length" class="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
      <ProductCard v-for="p in visible" :key="p.slug" :product="p" />
    </div>
    <p v-else class="py-20 text-center text-ink/50 dark:text-bone/50">
      Chưa có sản phẩm trong series này. Nhắn shop để đặt mẫu riêng.
    </p>
  </section>
</template>
```

- [ ] **Step 4: Chạy dev kiểm tra**

Run: `npm run dev`, mở `/san-pham`
Expected: grid hiển thị 5 SP mẫu; bấm chip series lọc đúng, không reload; empty state hiện khi series trống. Tắt server.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: trang bộ sưu tập với ProductCard + lọc series"
```

---

### Task 5: ProductGallery + Lightbox + trang chi tiết `/san-pham/[slug]` + prerender

**Files:**
- Create: `components/ProductGallery.vue`, `components/Lightbox.vue`
- Create: `pages/san-pham/[slug].vue`
- Modify: `nuxt.config.ts` (prerender routes từ products)
- Create: `composables/useLightbox.ts` (state đóng/mở + index) - optional, có thể inline

**Interfaces:**
- Consumes: `useProducts()`, `getRelated`, `ProductMeta`/`Product`.
- Produces:
  - `<ProductGallery :images="string[]" :alt="string" />` - ảnh chính + thumbnails, mở Lightbox.
  - `<Lightbox :images :index :open @close @prev @next />` - overlay zoom, bàn phím, focus trap.

- [ ] **Step 1: Viết `components/Lightbox.vue`**

```vue
<script setup lang="ts">
const props = defineProps<{ images: string[]; index: number; open: boolean; alt: string }>()
const emit = defineEmits<{ close: []; prev: []; next: [] }>()

function onKey(e: KeyboardEvent) {
  if (!props.open) return
  if (e.key === 'Escape') emit('close')
  if (e.key === 'ArrowLeft') emit('prev')
  if (e.key === 'ArrowRight') emit('next')
}
onMounted(() => window.addEventListener('keydown', onKey))
onUnmounted(() => window.removeEventListener('keydown', onKey))
watch(() => props.open, (v) => {
  if (import.meta.client) document.body.style.overflow = v ? 'hidden' : ''
})
</script>

<template>
  <Teleport to="body">
    <div v-if="open" role="dialog" aria-modal="true" aria-label="Xem ảnh sản phẩm"
      class="fixed inset-0 z-[60] flex items-center justify-center bg-ink/90 p-4"
      @click.self="emit('close')">
      <button type="button" @click="emit('close')" aria-label="Đóng"
        class="absolute right-4 top-4 rounded-full p-3 text-bone/80 hover:text-bone focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent">✕</button>
      <button type="button" @click="emit('prev')" aria-label="Ảnh trước"
        class="absolute left-4 rounded-full p-3 text-bone/80 hover:text-bone">‹</button>
      <NuxtImg :src="images[index]" :alt="alt" class="max-h-[85vh] max-w-full rounded-lg object-contain" />
      <button type="button" @click="emit('next')" aria-label="Ảnh sau"
        class="absolute right-4 rounded-full p-3 text-bone/80 hover:text-bone">›</button>
    </div>
  </Teleport>
</template>
```

- [ ] **Step 2: Viết `components/ProductGallery.vue`**

```vue
<script setup lang="ts">
const props = defineProps<{ images: string[]; alt: string }>()
const current = ref(0)
const lightbox = ref(false)
function select(i: number) { current.value = i }
function open() { lightbox.value = true }
function close() { lightbox.value = false }
function prev() { current.value = (current.value - 1 + props.images.length) % props.images.length }
function next() { current.value = (current.value + 1) % props.images.length }
</script>

<template>
  <div>
    <button type="button" @click="open" aria-label="Phóng to ảnh"
      class="block w-full overflow-hidden rounded-2xl bg-ink/5 dark:bg-bone/5">
      <NuxtImg :src="images[current]" :alt="alt" width="900" height="1125"
        class="aspect-[4/5] w-full object-cover" />
    </button>
    <div class="mt-3 flex gap-3 overflow-x-auto">
      <button v-for="(img, i) in images" :key="i" type="button" @click="select(i)"
        :aria-label="`Ảnh ${i + 1}`" :aria-current="i === current"
        :class="['h-20 w-16 shrink-0 overflow-hidden rounded-lg border-2 transition',
          i === current ? 'border-accent' : 'border-transparent opacity-70 hover:opacity-100']">
        <NuxtImg :src="img" :alt="`${alt} ảnh ${i + 1}`" width="120" height="150" class="h-full w-full object-cover" />
      </button>
    </div>
    <Lightbox :images="images" :index="current" :open="lightbox" :alt="alt"
      @close="close" @prev="prev" @next="next" />
  </div>
</template>
```

- [ ] **Step 3: Viết `pages/san-pham/[slug].vue`**

```vue
<script setup lang="ts">
const route = useRoute()
const slug = computed(() => String(route.params.slug))
const { all, related } = useProducts()

const { data: product } = await useAsyncData(`product-${slug.value}`, () =>
  queryCollection('products').where('slug', '=', slug.value).first()
)
if (!product.value) throw createError({ statusCode: 404, statusMessage: 'Không tìm thấy sản phẩm' })

const relatedItems = computed(() => product.value ? related(product.value as any) : [])

useSeoMeta({
  title: () => `${product.value?.title} - Henshin Studio`,
  description: () => `Figure ${product.value?.title}, ${product.value?.series}, tỉ lệ ${product.value?.scale}.`,
  ogImage: () => product.value?.cover,
})
</script>

<template>
  <article v-if="product" class="mx-auto max-w-content px-4 py-12 md:px-8">
    <NuxtLink to="/san-pham" class="text-sm text-ink/50 hover:text-ink dark:text-bone/50">← Bộ sưu tập</NuxtLink>

    <div class="mt-6 grid grid-cols-1 gap-10 lg:grid-cols-2">
      <ProductGallery :images="product.images" :alt="product.title" />

      <div class="lg:py-4">
        <p class="text-sm uppercase tracking-wide text-accent">{{ product.series }}</p>
        <h1 class="mt-2 font-display text-3xl md:text-4xl tracking-tight">{{ product.title }}</h1>

        <dl class="mt-6 grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <div><dt class="text-ink/45 dark:text-bone/45">Tỉ lệ</dt><dd>{{ product.scale }}</dd></div>
          <div><dt class="text-ink/45 dark:text-bone/45">Chiều cao</dt><dd>{{ product.height }}</dd></div>
          <div class="col-span-2"><dt class="text-ink/45 dark:text-bone/45">Chất liệu</dt><dd>{{ product.material }}</dd></div>
          <div><dt class="text-ink/45 dark:text-bone/45">Giá tham khảo</dt><dd>{{ product.priceRef }}</dd></div>
        </dl>

        <div class="prose prose-sm mt-6 max-w-none text-ink/80 dark:prose-invert dark:text-bone/80">
          <ContentRenderer :value="product" />
        </div>

        <div class="mt-8">
          <MessengerButton :label="`Hỏi mua ${product.title}`" />
          <p class="mt-2 text-xs text-ink/45 dark:text-bone/45">{{ useShop().responseTime }}</p>
        </div>
      </div>
    </div>

    <section v-if="relatedItems.length" class="mt-20">
      <SectionHeading title="Cùng series" />
      <div class="grid grid-cols-2 gap-6 lg:grid-cols-4">
        <ProductCard v-for="p in relatedItems" :key="p.slug" :product="p" />
      </div>
    </section>
  </article>
</template>
```

> `ContentRenderer`/`queryCollection` là API @nuxt/content v3. Implementer xác nhận shape `product` (đặc biệt field render body) và điều chỉnh nếu v2.

- [ ] **Step 4: Cấu hình prerender mọi route SP trong `nuxt.config.ts`**

Thêm hook sinh route từ file products:
```ts
import { readdirSync } from 'node:fs'

const productRoutes = readdirSync('content/products')
  .filter(f => f.endsWith('.md'))
  .map(f => `/san-pham/${f.replace(/\.md$/, '')}`)

export default defineNuxtConfig({
  // ...giữ nguyên cấu hình cũ...
  nitro: {
    prerender: { crawlLinks: true, routes: ['/', ...productRoutes] },
  },
})
```

> Cách này yêu cầu tên file = slug. 5 file mẫu đã đặt đúng. Nếu slug khác tên file, implementer đọc frontmatter thay vì tên file.

- [ ] **Step 5: Chạy dev kiểm tra trang chi tiết + lightbox**

Run: `npm run dev`, mở 1 SP từ grid.
Expected: gallery đổi ảnh khi click thumbnail; click ảnh chính mở lightbox; phím ←/→ chuyển ảnh, ESC đóng; mô tả markdown render; nút "Hỏi mua ..." trỏ Messenger; section "Cùng series" hiển thị. Tắt server.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: trang chi tiết SP với gallery + lightbox + prerender routes"
```

---

### Task 6: Trang Home `/`

**Files:**
- Modify: `pages/index.vue` (thay trang tạm)

**Interfaces:**
- Consumes: `useProducts()`, `useShop()`, `MessengerButton`, `ProductCard`, `SectionHeading`.

- [ ] **Step 1: Viết `pages/index.vue`** (hero asymmetric + featured + about teaser + CTA)

```vue
<script setup lang="ts">
const shop = useShop()
const { featured } = useProducts()
useSeoMeta({
  title: `${shop.name} - Figure in 3D chủ đề tokusatsu`,
  description: shop.tagline,
})
</script>

<template>
  <!-- HERO: asymmetric split, gọn trong viewport, không center -->
  <section class="mx-auto grid max-w-content items-center gap-10 px-4 pt-16 pb-20 md:grid-cols-2 md:px-8 md:pt-24">
    <div>
      <h1 class="font-display text-4xl leading-[1.05] tracking-tight md:text-6xl">
        Hero tokusatsu,<br />tái hiện bằng in 3D.
      </h1>
      <p class="mt-5 max-w-[42ch] text-lg text-ink/65 dark:text-bone/65">
        {{ shop.tagline }} Sơn thủ công, chi tiết sắc nét, số lượng giới hạn.
      </p>
      <div class="mt-8 flex flex-wrap gap-3">
        <NuxtLink to="/san-pham"
          class="inline-flex items-center rounded-full bg-ink px-6 py-3 text-sm font-medium text-bone transition hover:opacity-90 active:scale-[0.98] dark:bg-bone dark:text-ink">
          Xem bộ sưu tập
        </NuxtLink>
        <MessengerButton variant="ghost" />
      </div>
    </div>
    <div class="overflow-hidden rounded-2xl bg-ink/5 dark:bg-bone/5">
      <NuxtImg src="https://picsum.photos/seed/toku-hero/1200/1400" alt="Figure tokusatsu in 3D"
        width="1200" height="1400" preload class="aspect-[6/7] w-full object-cover" />
    </div>
  </section>

  <!-- FEATURED -->
  <section class="mx-auto max-w-content px-4 md:px-8">
    <SectionHeading title="Sản phẩm nổi bật" subtitle="Vài mẫu được yêu thích nhất trong xưởng." />
    <div class="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
      <ProductCard v-for="p in featured" :key="p.slug" :product="p" />
    </div>
    <div class="mt-10">
      <NuxtLink to="/san-pham" class="text-sm font-medium text-accent hover:underline">Xem tất cả sản phẩm →</NuxtLink>
    </div>
  </section>

  <!-- ABOUT TEASER: layout khác (full-width split ngược) -->
  <section class="mt-24 bg-ink/[0.03] py-20 dark:bg-bone/[0.03]">
    <div class="mx-auto grid max-w-content items-center gap-10 px-4 md:grid-cols-5 md:px-8">
      <div class="overflow-hidden rounded-2xl md:col-span-2">
        <NuxtImg src="https://picsum.photos/seed/toku-workshop/900/900" alt="Xưởng in 3D và sơn thủ công"
          width="900" height="900" loading="lazy" class="aspect-square w-full object-cover" />
      </div>
      <div class="md:col-span-3">
        <h2 class="font-display text-3xl tracking-tight md:text-4xl">Từ file 3D đến figure trưng bày</h2>
        <p class="mt-4 max-w-[55ch] text-ink/65 dark:text-bone/65">
          Mỗi sản phẩm đi qua in resin độ phân giải cao, xử lý bề mặt và sơn nhiều lớp bằng tay.
          Chúng tôi làm số lượng nhỏ để giữ chất lượng từng con.
        </p>
        <NuxtLink to="/gioi-thieu" class="mt-6 inline-block text-sm font-medium text-accent hover:underline">Tìm hiểu quy trình →</NuxtLink>
      </div>
    </div>
  </section>

  <!-- CTA -->
  <section class="mx-auto max-w-content px-4 py-24 text-center md:px-8">
    <h2 class="mx-auto max-w-[20ch] font-display text-3xl tracking-tight md:text-4xl">Tìm thấy con bạn thích?</h2>
    <p class="mx-auto mt-3 max-w-[45ch] text-ink/60 dark:text-bone/60">Nhắn shop qua Messenger để hỏi giá, đặt màu sơn hoặc mẫu theo yêu cầu.</p>
    <div class="mt-8 flex justify-center"><MessengerButton /></div>
  </section>
</template>
```

- [ ] **Step 2: Chạy dev kiểm tra Home**

Run: `npm run dev`, mở `/`
Expected: hero không center, gọn trong viewport; featured hiện 3 SP; section about teaser + CTA; >= 4 layout family khác nhau; không em-dash. Tắt server.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: trang chủ (hero, featured, about teaser, CTA)"
```

---

### Task 7: Trang Giới thiệu `/gioi-thieu` + Liên hệ `/lien-he`

**Files:**
- Create: `pages/gioi-thieu.vue`, `pages/lien-he.vue`

**Interfaces:**
- Consumes: `useShop()`, `MessengerButton`, `SectionHeading`, `buildMessengerHref`.

- [ ] **Step 1: Viết `pages/gioi-thieu.vue`** (editorial, layout khác Home)

```vue
<script setup lang="ts">
const shop = useShop()
useSeoMeta({
  title: `Giới thiệu - ${shop.name}`,
  description: 'Câu chuyện xưởng figure in 3D tokusatsu và quy trình làm sản phẩm.',
})
const steps = [
  { t: 'Dựng & tinh chỉnh model', d: 'Chọn lọc và xử lý file 3D, căn chỉnh chi tiết trước khi in.' },
  { t: 'In resin độ phân giải cao', d: 'In từng phần, làm sạch bề mặt và lắp ghép cẩn thận.' },
  { t: 'Sơn thủ công nhiều lớp', d: 'Lên màu, đổ bóng và phủ bảo vệ để model bền màu khi trưng bày.' },
]
</script>

<template>
  <section class="mx-auto max-w-content px-4 py-16 md:px-8">
    <div class="max-w-[60ch]">
      <h1 class="font-display text-4xl tracking-tight md:text-5xl">Làm figure vì mê tokusatsu</h1>
      <p class="mt-6 text-lg text-ink/65 dark:text-bone/65">
        {{ shop.name }} là xưởng nhỏ chuyên figure in 3D các nhân vật tokusatsu.
        Chúng tôi làm số lượng giới hạn, tập trung vào độ chi tiết và nước sơn.
      </p>
    </div>

    <div class="mt-12 grid gap-6 md:grid-cols-3">
      <NuxtImg v-for="n in 3" :key="n" :src="`https://picsum.photos/seed/about-${n}/800/600`"
        :alt="`Hình ảnh xưởng ${n}`" width="800" height="600" loading="lazy"
        class="aspect-[4/3] w-full rounded-xl object-cover" />
    </div>

    <div class="mt-20">
      <SectionHeading title="Quy trình" />
      <div class="grid gap-px overflow-hidden rounded-2xl bg-ink/10 dark:bg-bone/10 md:grid-cols-3">
        <div v-for="(s, i) in steps" :key="i" class="bg-bone p-8 dark:bg-ink">
          <p class="font-display text-4xl text-accent">{{ i + 1 }}</p>
          <h3 class="mt-3 font-display text-lg">{{ s.t }}</h3>
          <p class="mt-2 text-sm text-ink/60 dark:text-bone/60">{{ s.d }}</p>
        </div>
      </div>
    </div>

    <div class="mt-20 flex flex-col items-start gap-4">
      <p class="font-display text-2xl">Muốn một mẫu theo yêu cầu?</p>
      <MessengerButton label="Trao đổi với shop" />
    </div>
  </section>
</template>
```

- [ ] **Step 2: Viết `pages/lien-he.vue`** (không form, chỉ kênh liên hệ)

```vue
<script setup lang="ts">
import { buildMessengerHref } from '~/utils/messenger'
const shop = useShop()
useSeoMeta({
  title: `Liên hệ - ${shop.name}`,
  description: 'Liên hệ shop qua Messenger để hỏi sản phẩm figure tokusatsu in 3D.',
})
</script>

<template>
  <section class="mx-auto max-w-content px-4 py-16 md:px-8">
    <div class="grid gap-12 md:grid-cols-2">
      <div>
        <h1 class="font-display text-4xl tracking-tight md:text-5xl">Liên hệ</h1>
        <p class="mt-5 max-w-[45ch] text-lg text-ink/65 dark:text-bone/65">
          Cách nhanh nhất là nhắn tin Messenger. Cho shop biết bạn quan tâm mẫu nào,
          shop sẽ báo giá và tình trạng hàng.
        </p>
        <div class="mt-8"><MessengerButton label="Mở Messenger" /></div>
      </div>

      <dl class="space-y-6 border-t border-ink/10 pt-8 dark:border-bone/10 md:border-l md:border-t-0 md:pl-12 md:pt-0">
        <div>
          <dt class="text-sm text-ink/45 dark:text-bone/45">Facebook</dt>
          <dd><a :href="shop.facebookUrl" target="_blank" rel="noopener noreferrer" class="text-accent hover:underline">{{ shop.facebookUrl }}</a></dd>
        </div>
        <div>
          <dt class="text-sm text-ink/45 dark:text-bone/45">Thời gian phản hồi</dt>
          <dd>{{ shop.responseTime }}</dd>
        </div>
        <div>
          <dt class="text-sm text-ink/45 dark:text-bone/45">Khu vực</dt>
          <dd>{{ shop.area }}</dd>
        </div>
      </dl>
    </div>
  </section>
</template>
```

- [ ] **Step 3: Chạy dev kiểm tra 2 trang**

Run: `npm run dev`, mở `/gioi-thieu` và `/lien-he`
Expected: cả 2 trang render đúng, nút Messenger hoạt động, layout khác nhau và khác Home, không form ở trang liên hệ. Tắt server.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: trang giới thiệu + liên hệ"
```

---

### Task 8: Build tĩnh + pre-flight chống AI-slop + a11y/perf + nghiệm thu cuối

**Files:**
- Modify: bất kỳ file nào lộ lỗi pre-flight.
- Create: `README.md` (hướng dẫn thêm sản phẩm + đổi link Messenger).

**Interfaces:** không thêm interface mới.

- [ ] **Step 1: Chạy toàn bộ unit test**

Run: `npm test`
Expected: tất cả PASS (utils products + messenger).

- [ ] **Step 2: Build tĩnh**

Run: `npm run generate`
Expected: build thành công; trong `.output/public/san-pham/` có file html cho cả 5 slug; có `index.html`, `gioi-thieu/index.html`, `lien-he/index.html`. Nếu thiếu route SP, sửa lại danh sách prerender (Task 5 Step 4).

- [ ] **Step 3: Preview bản tĩnh**

Run: `npm run preview`
Expected: site chạy từ bản build; điều hướng 5 trang, filter, lightbox, dark mode đều hoạt động. Tắt server.

- [ ] **Step 4: Pre-flight chống AI-slop (rà thủ công, sửa nếu vi phạm)**

Kiểm tra theo checklist:
- [ ] `grep -rn "—\|–" pages components content app.config.ts layouts` -> **không có kết quả** (zero em-dash/en-dash). Nếu có, thay bằng dấu phẩy/chấm/`-`.
- [ ] Đếm eyebrow (`uppercase tracking`) trên heading section: <= 1 mỗi 3 section/trang.
- [ ] 1 accent màu duy nhất (`accent`) dùng nhất quán; không màu lạ ở 1 section.
- [ ] Không scroll cue, không locale/time/weather strip, không version label, không decorative dots trang trí.
- [ ] Home dùng >= 4 layout family khác nhau; không 3 card đều cứng nhắc lặp lại; không zigzag > 2 lần liên tiếp.
- [ ] Hero gọn trong viewport (headline <= 2 dòng desktop, subtext <= ~20 từ).
- [ ] Font: không Inter mặc định, không serif (Fraunces/Instrument Serif).
- [ ] Mọi CTA "liên hệ" cùng 1 intent dùng nhất quán, nút không wrap 2 dòng ở desktop.

- [ ] **Step 5: Pre-flight a11y/perf (rà thủ công)**

- [ ] Mọi `<NuxtImg>` có `alt` ý nghĩa.
- [ ] Lightbox: `role="dialog"` + `aria-modal`, đóng bằng ESC/click nền, phím ←/→, khóa scroll body.
- [ ] Focus state nhìn thấy trên link/nút (`focus-visible:outline`).
- [ ] Contrast text/nền đạt AA ở cả light & dark (kiểm nhanh các chỗ `text-ink/45`, `/40` trên nền tương ứng).
- [ ] Test dark mode toàn site: không section nào lệch theme.
- [ ] Test responsive: mobile (1 cột), tablet (2), desktop (3); nav mobile mở/đóng được.

- [ ] **Step 6: Viết `README.md`**

```markdown
# Henshin Studio - Website showcase figure 3D tokusatsu

Nuxt 3 (SSG) + @nuxt/content + Tailwind. Site chỉ trưng bày sản phẩm, liên hệ qua Messenger.

## Phát triển
\`\`\`bash
npm install
npm run dev        # http://localhost:3000
npm test           # unit test
npm run generate   # build tĩnh -> .output/public
\`\`\`

## Thêm / sửa sản phẩm
Tạo file mới trong \`content/products/<slug>.md\` (tên file = slug). Copy frontmatter
từ file có sẵn, đổi nội dung. Ảnh để trong \`public/products/<slug>/\` rồi trỏ đường
dẫn trong \`images\` + \`cover\` (tạm dùng link picsum). Đặt \`featured: true\` để hiện ở trang chủ.

## Đổi link Messenger / thông tin shop
Sửa \`app.config.ts\` (mục \`shop\`): \`messengerUrl\`, \`name\`, \`tagline\`, \`facebookUrl\`, \`area\`, \`responseTime\`.
\`\`\`
```

- [ ] **Step 7: Commit cuối**

```bash
git add -A
git commit -m "chore: build tĩnh, pre-flight a11y/anti-slop, README"
```

---

## Self-Review (đã chạy)

**Spec coverage:**
- Nuxt 3 SSG -> Task 1, 8. @nuxt/content -> Task 2, 5. Tailwind -> Task 1, 3. @nuxt/image -> Task 4-7.
- 5 trang (Home/Bộ sưu tập/Chi tiết/About/Contact) -> Task 4, 5, 6, 7.
- Model dữ liệu sản phẩm -> Task 2 (schema + samples).
- Filter series client-side -> Task 4. Gallery + lightbox + phím tắt + reduced-motion -> Task 5.
- Messenger floating + chi tiết + liên hệ, 1 nguồn config -> Task 1 (config), 3 (components), 5/6/7 (dùng).
- Prerender mọi route SP -> Task 5. Dark mode -> Task 1, 3. SEO -> Task 4-7 (`useSeoMeta`).
- A11y + anti-slop pre-flight + DoD -> Task 8.

**Placeholder scan:** không có TODO/TBD mơ hồ; mọi step có code/lệnh cụ thể. Các giá trị shop (tên/area) là placeholder nội dung có chủ đích, dễ đổi qua `app.config.ts`.

**Type consistency:** `ProductMeta`/`Product` định nghĩa Task 1, dùng nhất quán Task 2-7. Hàm utils (`sortByOrder`, `getFeatured`, `getSeriesList`, `filterBySeries`, `getRelated`) đặt tên thống nhất giữa định nghĩa (Task 2) và nơi dùng (Task 3-6). `buildMessengerHref` nhất quán Task 3/5/7.

**Rủi ro đã ghi chú:** version @nuxt/content (v2 vs v3 - API `queryCollection`/`ContentRenderer`), `@nuxtjs/color-mode` cần cài, shape dữ liệu trả từ content cần map sang `ProductMeta`. Đã chú thích inline cho implementer xác nhận.
```
