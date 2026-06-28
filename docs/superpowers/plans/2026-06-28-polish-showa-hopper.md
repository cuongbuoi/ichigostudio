# Polish Pass — Showa Hopper Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace stock picsum photos with an on-brand dark placeholder component, add a `hasPhotos` feature flag, fix the hero headline to real Vietnamese toku copy, and update the README.

**Architecture:** Create a single `FigurePlaceholder.vue` that renders a self-contained CSS halftone + compound-eye SVG frame. Wire it behind a `hasPhotos` boolean in `app.config.ts`. Swap every `NuxtImg` in hero/about/gallery/card pages behind that flag. Fix the literal "HERO" headline in `index.vue`. No new dependencies.

**Tech Stack:** Nuxt 3 SSG, Vue 3 Composition API, Tailwind CSS (design tokens: night/panel/panel2/hopper/silver/paper), Anton + Oswald fonts, @nuxt/content, @nuxt/image, vitest.

## Global Constraints

- Vietnamese full diacritics everywhere (alt, aria, copy); UTF-8 safe; do NOT strip diacritics
- ZERO em-dash (—) or en-dash (–) in any file
- Only one accent color: hopper (`#5c8a24` / `#76b02f` bright); no new colors or fonts
- Dark-only theme; tokens: `night`, `panel`, `panel2`, `hopper(.bright)`, `silver`, `paper`
- No fake stats, no lorem ipsum, no new external dependencies
- No animation (honor reduced-motion; keep it static)
- Compound-eye SVG = intentional brand motif; single clean geometric shape, low opacity
- `npm test` must stay 8/8 green after all changes
- `npm run generate` must succeed emitting 4 pages + 5 product routes
- Commit message: `feat: khung ảnh placeholder on-brand + copy hero thật (Showa Hopper)`

---

## File Map

| Action | File | Responsibility |
|--------|------|---------------|
| **Create** | `components/FigurePlaceholder.vue` | On-brand dark placeholder frame: halftone bg, compound-eye SVG, Oswald caption |
| **Modify** | `app.config.ts` | Add `hasPhotos: false` under `shop` |
| **Modify** | `components/ProductCard.vue` | v-if/v-else on `hasPhotos` for card image vs placeholder |
| **Modify** | `components/ProductGallery.vue` | v-if/v-else for main image, thumbnails, and Lightbox |
| **Modify** | `components/Lightbox.vue` | Accept optional `hasPhotos` prop; render placeholder per index when false |
| **Modify** | `pages/index.vue` | Fix hero copy; swap hero + about-teaser images behind flag |
| **Modify** | `pages/gioi-thieu.vue` | Swap 3 process images behind flag |
| **Modify** | `README.md` | Add note about `hasPhotos` flag and photo folder convention |

---

### Task 1: Create `components/FigurePlaceholder.vue`

**Files:**
- Create: `components/FigurePlaceholder.vue`

**Interfaces:**
- Produces: `<FigurePlaceholder label? ratio? seed? />` consumed by Tasks 3–5

- [ ] **Step 1: Create the component file**

```vue
<!-- components/FigurePlaceholder.vue -->
<script setup lang="ts">
const props = withDefaults(defineProps<{
  label?: string
  ratio?: string
  seed?: string | number
}>(), {
  ratio: '4/5',
  seed: 0,
})

// Vary the compound-eye position/rotation slightly per seed.
// Hash seed to a stable number so it works for both string and number seeds.
const seedNum = computed(() => {
  if (typeof props.seed === 'number') return props.seed
  let h = 0
  for (let i = 0; i < props.seed.length; i++) {
    h = Math.imul(31, h) + props.seed.charCodeAt(i) | 0
  }
  return Math.abs(h)
})

const eyeTranslateX = computed(() => ((seedNum.value % 7) - 3) * 3)  // -9 to +9 px
const eyeTranslateY = computed(() => (((seedNum.value >> 4) % 7) - 3) * 3)
const eyeRotate    = computed(() => ((seedNum.value >> 8) % 30) - 15)  // -15 to +15 deg
</script>

<template>
  <div
    class="relative w-full overflow-hidden rounded border border-paper/10 bg-panel2"
    :style="{
      aspectRatio: ratio,
      backgroundImage: `
        radial-gradient(circle, rgba(92,138,36,0.08) 1px, transparent 1px),
        repeating-linear-gradient(
          -45deg,
          transparent,
          transparent 28px,
          rgba(200,204,196,0.025) 28px,
          rgba(200,204,196,0.025) 29px
        )
      `,
      backgroundSize: '10px 10px, 100% 100%',
    }"
    aria-hidden="true"
  >
    <!-- Compound-eye SVG motif (faceted hexagonal insect-eye) -->
    <svg
      class="pointer-events-none absolute inset-0 m-auto"
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      :style="{
        width: '40%',
        height: '40%',
        top: '30%',
        left: '30%',
        position: 'absolute',
        opacity: 0.18,
        transform: `translate(${eyeTranslateX}px, ${eyeTranslateY}px) rotate(${eyeRotate}deg)`,
      }"
      aria-hidden="true"
    >
      <g fill="#5c8a24">
        <!-- Center column -->
        <polygon points="60,10 73,17 73,33 60,40 47,33 47,17"/>
        <polygon points="60,42 73,49 73,65 60,72 47,65 47,49"/>
        <polygon points="60,74 73,81 73,97 60,104 47,97 47,81"/>
        <!-- Left column -->
        <polygon points="28,26 41,33 41,49 28,56 15,49 15,33"/>
        <polygon points="28,58 41,65 41,81 28,88 15,81 15,65"/>
        <!-- Right column -->
        <polygon points="92,26 105,33 105,49 92,56 79,49 79,33"/>
        <polygon points="92,58 105,65 105,81 92,88 79,81 79,65"/>
      </g>
    </svg>

    <!-- Caption area -->
    <div class="absolute bottom-0 left-0 right-0 px-3 pb-3 pt-2">
      <p class="font-sans text-[9px] font-medium uppercase tracking-[0.18em] text-silver/50">ẢNH FIGURE</p>
      <p v-if="label" class="mt-0.5 font-sans text-[9px] font-light uppercase tracking-[0.12em] text-silver/40 truncate">{{ label }}</p>
    </div>
  </div>
</template>
```

- [ ] **Step 2: Verify the file was created**

```bash
cat /Users/assmin/Documents/Projects/3d-website/components/FigurePlaceholder.vue | head -5
```

Expected: first line `<!-- components/FigurePlaceholder.vue -->`

- [ ] **Step 3: Run tests to ensure nothing broken**

```bash
cd /Users/assmin/Documents/Projects/3d-website && npm test
```

Expected: `Tests 8 passed (8)` — no failures (this task adds no test surface but verifies base still passes)

- [ ] **Step 4: Commit**

```bash
cd /Users/assmin/Documents/Projects/3d-website && git add components/FigurePlaceholder.vue && git -c user.name='Claude' -c user.email='noreply@anthropic.com' commit -m "feat: tạo FigurePlaceholder — khung ảnh on-brand halftone + mắt phức"
```

---

### Task 2: Add `hasPhotos` flag to `app.config.ts`

**Files:**
- Modify: `app.config.ts`

**Interfaces:**
- Produces: `useAppConfig().shop.hasPhotos` (boolean, default `false`) consumed by Tasks 3–5

- [ ] **Step 1: Edit `app.config.ts`**

Replace the entire file content with:

```typescript
export default defineAppConfig({
  shop: {
    name: 'Henshin Studio',
    tagline: 'Figure in FDM thủ công cho người mê tokusatsu Showa.',
    messengerUrl: 'https://m.me/henshinstudio',
    facebookUrl: 'https://facebook.com/henshinstudio',
    responseTime: 'Thường phản hồi trong vài giờ',
    area: 'TP. Hồ Chí Minh',
    hasPhotos: false,
  },
})
```

- [ ] **Step 2: Run tests**

```bash
cd /Users/assmin/Documents/Projects/3d-website && npm test
```

Expected: `Tests 8 passed (8)`

- [ ] **Step 3: Commit**

```bash
cd /Users/assmin/Documents/Projects/3d-website && git add app.config.ts && git -c user.name='Claude' -c user.email='noreply@anthropic.com' commit -m "feat: thêm flag hasPhotos vào app.config"
```

---

### Task 3: Wire `hasPhotos` in `components/ProductCard.vue`

**Files:**
- Modify: `components/ProductCard.vue`

**Interfaces:**
- Consumes: `FigurePlaceholder` from Task 1; `useAppConfig().shop.hasPhotos` from Task 2
- Produces: card image shows placeholder when `hasPhotos=false`, real NuxtImg when `true`

- [ ] **Step 1: Replace the entire file**

Current file is 26 lines. Replace completely:

```vue
<script setup lang="ts">
import type { ProductMeta } from '~/types/product'
defineProps<{ product: ProductMeta }>()
const { shop } = useAppConfig()
</script>

<template>
  <NuxtLink :to="`/san-pham/${product.slug}`" class="group block">
    <div class="relative overflow-hidden rounded bg-panel border border-paper/10 transition hover:border-hopper">
      <template v-if="shop.hasPhotos">
        <NuxtImg
          :src="product.cover"
          :alt="`Figure ${product.title} - in FDM, sơn thủ công`"
          loading="lazy"
          width="600"
          height="750"
          class="aspect-[4/5] w-full object-cover transition duration-500 group-hover:scale-[1.03]"
        />
      </template>
      <template v-else>
        <FigurePlaceholder
          :label="product.title"
          ratio="4/5"
          :seed="product.slug"
        />
      </template>
      <!-- Technical badge -->
      <span class="absolute bottom-2 right-2 font-sans text-[9px] font-medium tracking-[0.15em] text-silver/60 bg-night/70 px-1.5 py-0.5 rounded-sm">FDM</span>
    </div>
    <div class="mt-3">
      <p class="font-sans text-[10px] uppercase tracking-[0.15em] text-hopper font-medium">{{ product.series }}</p>
      <h3 class="mt-1 font-sans text-base font-semibold leading-snug text-paper">{{ product.title }}</h3>
      <p class="mt-0.5 font-sans text-xs font-light text-silver">Tỉ lệ {{ product.scale }}</p>
    </div>
  </NuxtLink>
</template>
```

- [ ] **Step 2: Run tests**

```bash
cd /Users/assmin/Documents/Projects/3d-website && npm test
```

Expected: `Tests 8 passed (8)`

- [ ] **Step 3: Commit**

```bash
cd /Users/assmin/Documents/Projects/3d-website && git add components/ProductCard.vue && git -c user.name='Claude' -c user.email='noreply@anthropic.com' commit -m "feat: ProductCard dùng FigurePlaceholder khi hasPhotos=false"
```

---

### Task 4: Wire `hasPhotos` in `components/ProductGallery.vue` + `Lightbox.vue`

**Files:**
- Modify: `components/ProductGallery.vue`
- Modify: `components/Lightbox.vue`

**Interfaces:**
- Consumes: `FigurePlaceholder` from Task 1; `useAppConfig().shop.hasPhotos` from Task 2
- Produces: gallery + lightbox show placeholders when `hasPhotos=false`; all keyboard nav, focus trap, and counter remain functional

**Note on Lightbox:** The current `Lightbox.vue` takes `images: string[]` and renders `NuxtImg`. We need to add a `hasPhotos` prop so it can render `FigurePlaceholder` when false. Keep all existing logic intact; only swap the image element.

- [ ] **Step 1: Replace `components/ProductGallery.vue`**

```vue
<script setup lang="ts">
const props = defineProps<{ images: string[]; alt: string }>()
const { shop } = useAppConfig()

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
    <!-- Main image / placeholder -->
    <button
      type="button"
      @click="open"
      aria-label="Phóng to ảnh sản phẩm"
      class="block w-full overflow-hidden rounded bg-panel border border-paper/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hopper"
    >
      <template v-if="shop.hasPhotos">
        <NuxtImg
          :src="images[current]"
          :alt="`${alt} - figure in FDM, sơn thủ công`"
          width="900"
          height="1125"
          class="aspect-[4/5] w-full object-cover motion-safe:transition-opacity motion-safe:duration-200"
        />
      </template>
      <template v-else>
        <FigurePlaceholder
          :label="alt"
          ratio="4/5"
          :seed="current"
        />
      </template>
    </button>

    <!-- Thumbnails -->
    <div class="mt-3 flex gap-2 overflow-x-auto pb-1" role="list" :aria-label="`Ảnh ${alt}`">
      <button
        v-for="(img, i) in images"
        :key="i"
        type="button"
        role="listitem"
        @click="select(i)"
        :aria-label="`Xem ảnh ${i + 1} của ${alt}`"
        :aria-current="i === current ? 'true' : undefined"
        :class="[
          'h-20 w-16 shrink-0 overflow-hidden rounded border-2 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-hopper',
          i === current
            ? 'border-hopper'
            : 'border-transparent opacity-60 hover:opacity-90',
        ]"
      >
        <template v-if="shop.hasPhotos">
          <NuxtImg
            :src="img"
            :alt="`${alt} - ảnh ${i + 1}`"
            width="120"
            height="150"
            class="h-full w-full object-cover"
          />
        </template>
        <template v-else>
          <FigurePlaceholder
            :label="`${i + 1}`"
            ratio="4/5"
            :seed="i"
          />
        </template>
      </button>
    </div>

    <Lightbox
      :images="images"
      :index="current"
      :open="lightbox"
      :alt="alt"
      :has-photos="shop.hasPhotos"
      @close="close"
      @prev="prev"
      @next="next"
    />
  </div>
</template>
```

- [ ] **Step 2: Replace `components/Lightbox.vue`**

Add `hasPhotos` prop (default `true` so existing usages without the prop still work).
Replace the `<!-- Image -->` block to conditionally render `FigurePlaceholder`.

Full file:

```vue
<script setup lang="ts">
const props = defineProps<{
  images: string[]
  index: number
  open: boolean
  alt: string
  hasPhotos?: boolean
}>()
const emit = defineEmits<{ close: []; prev: []; next: [] }>()

const closeBtn = ref<HTMLButtonElement | null>(null)
const prevBtn = ref<HTMLButtonElement | null>(null)
const nextBtn = ref<HTMLButtonElement | null>(null)
let previousFocus: HTMLElement | null = null

function onKey(e: KeyboardEvent) {
  if (!props.open) return
  if (e.key === 'Escape') { emit('close'); return }
  if (e.key === 'ArrowLeft') { emit('prev'); return }
  if (e.key === 'ArrowRight') { emit('next'); return }
  if (e.key === 'Tab') {
    const focusable = [prevBtn.value, nextBtn.value, closeBtn.value].filter(Boolean) as HTMLElement[]
    if (!focusable.length) return
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    if (e.shiftKey) {
      if (document.activeElement === first) { e.preventDefault(); last.focus() }
    } else {
      if (document.activeElement === last) { e.preventDefault(); first.focus() }
    }
  }
}

watch(() => props.open, async (v) => {
  if (import.meta.client) {
    document.body.style.overflow = v ? 'hidden' : ''
    if (v) {
      previousFocus = document.activeElement as HTMLElement
      await nextTick()
      closeBtn.value?.focus()
    } else {
      previousFocus?.focus()
      previousFocus = null
    }
  }
})

onMounted(() => window.addEventListener('keydown', onKey))
onUnmounted(() => window.removeEventListener('keydown', onKey))
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      role="dialog"
      aria-modal="true"
      :aria-label="`Xem ảnh ${alt}`"
      class="fixed inset-0 z-[60] flex items-center justify-center bg-night/95 p-4"
      @click.self="emit('close')"
    >
      <!-- Close -->
      <button
        ref="closeBtn"
        type="button"
        @click="emit('close')"
        aria-label="Đóng hộp xem ảnh"
        class="absolute right-4 top-4 rounded-full border border-silver/30 p-2.5 text-silver hover:border-silver hover:text-paper focus-visible:outline focus-visible:outline-2 focus-visible:outline-hopper transition"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-5 w-5" aria-hidden="true">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>

      <!-- Prev -->
      <button
        ref="prevBtn"
        type="button"
        @click="emit('prev')"
        aria-label="Ảnh trước"
        class="absolute left-4 top-1/2 -translate-y-1/2 rounded-full border border-silver/30 p-2.5 text-silver hover:border-silver hover:text-paper focus-visible:outline focus-visible:outline-2 focus-visible:outline-hopper transition"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-6 w-6" aria-hidden="true">
          <polyline points="15 18 9 12 15 6"/>
        </svg>
      </button>

      <!-- Image or placeholder -->
      <template v-if="hasPhotos !== false">
        <NuxtImg
          :src="images[index]"
          :alt="`${alt} - ảnh ${index + 1}`"
          class="max-h-[85vh] max-w-full rounded object-contain motion-safe:transition-opacity motion-safe:duration-200"
        />
      </template>
      <template v-else>
        <div class="max-h-[85vh] max-w-[min(90vw,600px)] w-full">
          <FigurePlaceholder
            :label="alt"
            ratio="4/5"
            :seed="index"
          />
        </div>
      </template>

      <!-- Next -->
      <button
        ref="nextBtn"
        type="button"
        @click="emit('next')"
        aria-label="Ảnh sau"
        class="absolute right-4 top-1/2 -translate-y-1/2 rounded-full border border-silver/30 p-2.5 text-silver hover:border-silver hover:text-paper focus-visible:outline focus-visible:outline-2 focus-visible:outline-hopper transition"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-6 w-6" aria-hidden="true">
          <polyline points="9 18 15 12 9 6"/>
        </svg>
      </button>

      <!-- Counter -->
      <p class="absolute bottom-4 left-1/2 -translate-x-1/2 select-none font-sans text-xs tracking-[0.12em] text-silver/60">
        {{ index + 1 }} / {{ images.length }}
      </p>
    </div>
  </Teleport>
</template>
```

- [ ] **Step 3: Run tests**

```bash
cd /Users/assmin/Documents/Projects/3d-website && npm test
```

Expected: `Tests 8 passed (8)`

- [ ] **Step 4: Commit**

```bash
cd /Users/assmin/Documents/Projects/3d-website && git add components/ProductGallery.vue components/Lightbox.vue && git -c user.name='Claude' -c user.email='noreply@anthropic.com' commit -m "feat: ProductGallery + Lightbox dùng placeholder khi hasPhotos=false"
```

---

### Task 5: Fix hero copy + wire `hasPhotos` in `pages/index.vue`

**Files:**
- Modify: `pages/index.vue`

**Interfaces:**
- Consumes: `FigurePlaceholder` from Task 1; `useAppConfig().shop.hasPhotos` from Task 2

**Current hero copy (lines 20-21):**
```
HERO<br />TOKUSATSU<br />IN FDM.
```
Must become 2 lines: `FIGURE TOKUSATSU` / `IN FDM, SƠN THỦ CÔNG.`

**Current hero subtext:** "Figure sơn tay, chi tiết sắc nét, số lượng giới hạn. Từ Showa đến Heisei."
Must become: "Mô hình Kamen Rider, Ultraman và hơn thế. In 3D FDM rồi sơn tay từng chi tiết, số lượng giới hạn."

- [ ] **Step 1: Replace `pages/index.vue` in full**

```vue
<script setup lang="ts">
const shop = useShop()
const { featured } = useProducts()
const { shop: shopConfig } = useAppConfig()
useSeoMeta({
  title: `${shop.name} - Figure in FDM chủ đề tokusatsu`,
  description: shop.tagline,
})
</script>

<template>
  <!-- HERO: asymmetric split, dark night, compound-eye watermark -->
  <section class="relative mx-auto grid max-w-content items-center gap-10 overflow-hidden px-4 pt-16 pb-20 md:grid-cols-2 md:px-8 md:pt-20">
    <!-- Speed-line hairlines (decorative, aria-hidden) -->
    <div class="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <div class="absolute right-0 top-0 h-full w-px bg-hopper/20" style="transform: rotate(-8deg) translateX(40%)"></div>
      <div class="absolute right-0 top-0 h-full w-px bg-hopper/10" style="transform: rotate(-8deg) translateX(45%)"></div>
    </div>

    <div class="relative z-10">
      <p class="mb-2 font-sans text-[10px] uppercase tracking-[0.2em] text-hopper">トクサツ / FDM / PLA+</p>
      <h1 class="font-display text-5xl uppercase leading-[0.95] tracking-tight text-paper md:text-7xl">
        FIGURE TOKUSATSU<br />IN FDM, SƠN THỦ CÔNG.
      </h1>
      <p class="mt-5 max-w-[40ch] font-sans text-sm font-light leading-relaxed text-silver">
        Mô hình Kamen Rider, Ultraman và hơn thế. In 3D FDM rồi sơn tay từng chi tiết, số lượng giới hạn.
      </p>
      <div class="mt-8 flex flex-wrap gap-3">
        <NuxtLink
          to="/san-pham"
          class="inline-flex items-center bg-hopper px-6 py-3 font-sans text-sm font-medium tracking-wide text-night transition hover:bg-hopper-bright active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hopper-bright rounded-sm"
        >XEM BỘ SƯU TẬP</NuxtLink>
        <MessengerButton variant="ghost" label="Nhắn Messenger" />
      </div>
    </div>

    <!-- Hero image panel -->
    <div class="relative overflow-hidden rounded bg-panel border border-paper/10">
      <!-- Compound-eye SVG watermark (decorative, always shown in hero panel) -->
      <svg
        class="pointer-events-none absolute bottom-4 right-4 h-24 w-24 opacity-[0.07]"
        viewBox="0 0 120 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <g fill="#5c8a24">
          <polygon points="60,10 73,17 73,33 60,40 47,33 47,17"/>
          <polygon points="60,42 73,49 73,65 60,72 47,65 47,49"/>
          <polygon points="60,74 73,81 73,97 60,104 47,97 47,81"/>
          <polygon points="28,26 41,33 41,49 28,56 15,49 15,33"/>
          <polygon points="92,26 105,33 105,49 92,56 79,49 79,33"/>
          <polygon points="28,58 41,65 41,81 28,88 15,81 15,65"/>
          <polygon points="92,58 105,65 105,81 92,88 79,81 79,65"/>
        </g>
      </svg>
      <template v-if="shopConfig.hasPhotos">
        <NuxtImg
          src="https://picsum.photos/seed/toku-hero-showa/1200/1400"
          alt="Nhân vật tokusatsu Showa in FDM, sơn thủ công"
          width="1200"
          height="1400"
          preload
          class="aspect-[6/7] w-full object-cover"
        />
      </template>
      <template v-else>
        <FigurePlaceholder
          label="Tokusatsu Showa"
          ratio="6/7"
          seed="hero"
        />
      </template>
    </div>
  </section>

  <!-- FEATURED PRODUCTS -->
  <section class="mx-auto max-w-content px-4 pb-16 md:px-8">
    <SectionHeading
      title="SẢN PHẨM NỔI BẬT"
      subtitle="Những mẫu được yêu thích nhất trong xưởng."
    />
    <div class="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
      <ProductCard v-for="p in featured" :key="p.slug" :product="p" />
    </div>
    <div class="mt-10">
      <NuxtLink
        to="/san-pham"
        class="font-sans text-sm font-medium text-hopper hover:text-hopper-bright hover:underline underline-offset-4 transition"
      >Xem tất cả sản phẩm &rsaquo;</NuxtLink>
    </div>
  </section>

  <!-- ABOUT TEASER: full-width split reversed -->
  <section class="bg-panel py-20">
    <div class="mx-auto grid max-w-content items-center gap-10 px-4 md:grid-cols-5 md:px-8">
      <div class="overflow-hidden rounded md:col-span-2">
        <template v-if="shopConfig.hasPhotos">
          <NuxtImg
            src="https://picsum.photos/seed/toku-workshop-fdm/900/900"
            alt="Xưởng in FDM và sơn thủ công figure tokusatsu"
            width="900"
            height="900"
            loading="lazy"
            class="aspect-square w-full object-cover"
          />
        </template>
        <template v-else>
          <FigurePlaceholder
            label="Xưởng Henshin Studio"
            ratio="1/1"
            seed="workshop"
          />
        </template>
      </div>
      <div class="md:col-span-3">
        <h2 class="font-display text-3xl uppercase tracking-tight text-paper md:text-4xl">
          TỪ FILE 3D ĐẾN FIGURE TRƯNG BÀY
        </h2>
        <p class="mt-4 max-w-[55ch] font-sans text-sm font-light leading-relaxed text-silver">
          Mỗi sản phẩm đi qua in FDM (PLA+), xử lý bề mặt và sơn nhiều lớp bằng tay.
          Số lượng nhỏ để giữ chất lượng từng con.
        </p>
        <NuxtLink
          to="/gioi-thieu"
          class="mt-6 inline-block font-sans text-sm font-medium text-hopper hover:underline underline-offset-4 transition"
        >Tìm hiểu quy trình &rsaquo;</NuxtLink>
      </div>
    </div>
  </section>

  <!-- CTA SECTION -->
  <section class="mx-auto max-w-content px-4 py-24 md:px-8">
    <h2 class="font-display text-3xl uppercase tracking-tight text-paper md:text-4xl">
      TÌM THẤY CON BẠN THÍCH?
    </h2>
    <p class="mt-3 max-w-[45ch] font-sans text-sm font-light text-silver">
      Nhắn shop qua Messenger để hỏi giá, đặt màu sơn hoặc mẫu theo yêu cầu.
    </p>
    <div class="mt-8">
      <MessengerButton label="Nhắn Messenger" />
    </div>
  </section>
</template>
```

- [ ] **Step 2: Run tests**

```bash
cd /Users/assmin/Documents/Projects/3d-website && npm test
```

Expected: `Tests 8 passed (8)`

- [ ] **Step 3: Commit**

```bash
cd /Users/assmin/Documents/Projects/3d-website && git add pages/index.vue && git -c user.name='Claude' -c user.email='noreply@anthropic.com' commit -m "feat: sửa copy hero thật + ảnh hero/teaser dùng placeholder"
```

---

### Task 6: Wire `hasPhotos` in `pages/gioi-thieu.vue`

**Files:**
- Modify: `pages/gioi-thieu.vue`

**Interfaces:**
- Consumes: `FigurePlaceholder` from Task 1; `useAppConfig().shop.hasPhotos` from Task 2

Current file loops over `v-for="n in 3"` rendering `NuxtImg`. Replace with conditional.

- [ ] **Step 1: Replace `pages/gioi-thieu.vue` in full**

```vue
<script setup lang="ts">
const shop = useShop()
const { shop: shopConfig } = useAppConfig()
useSeoMeta({
  title: `Giới thiệu - ${shop.name}`,
  description: 'Câu chuyện xưởng figure in FDM tokusatsu và quy trình làm sản phẩm.',
})
const steps = [
  { t: 'Dựng và tinh chỉnh model', d: 'Chọn lọc và xử lý file 3D, căn chỉnh từng chi tiết trước khi in.' },
  { t: 'In FDM (PLA+) từng phần', d: 'In trên máy FDM, xử lý vân lớp và ráp ghép cẩn thận từng mảnh.' },
  { t: 'Sơn thủ công nhiều lớp', d: 'Lên màu, tô bóng và phủ lớp bảo vệ để figure bền màu khi trưng bày.' },
]
const processImages = [
  { src: 'https://picsum.photos/seed/about-fdm-1/800/600', alt: 'Xưởng in FDM figure tokusatsu - hình 1' },
  { src: 'https://picsum.photos/seed/about-fdm-2/800/600', alt: 'Xưởng in FDM figure tokusatsu - hình 2' },
  { src: 'https://picsum.photos/seed/about-fdm-3/800/600', alt: 'Xưởng in FDM figure tokusatsu - hình 3' },
]
</script>

<template>
  <section class="mx-auto max-w-content px-4 py-16 md:px-8">
    <div class="max-w-[60ch]">
      <h1 class="font-display text-4xl uppercase tracking-tight text-paper md:text-5xl">
        LÀM FIGURE VÌ MÊ TOKUSATSU
      </h1>
      <p class="mt-6 font-sans text-sm font-light leading-relaxed text-silver">
        {{ shop.name }} là xưởng nhỏ chuyên figure in FDM các nhân vật tokusatsu.
        Số lượng giới hạn, tập trung vào độ chi tiết và nước sơn.
      </p>
    </div>

    <div class="mt-12 grid gap-4 md:grid-cols-3">
      <template v-for="(img, i) in processImages" :key="i">
        <template v-if="shopConfig.hasPhotos">
          <NuxtImg
            :src="img.src"
            :alt="img.alt"
            width="800"
            height="600"
            loading="lazy"
            class="aspect-[4/3] w-full rounded object-cover border border-paper/10"
          />
        </template>
        <template v-else>
          <FigurePlaceholder
            :label="img.alt"
            ratio="4/3"
            :seed="i"
          />
        </template>
      </template>
    </div>

    <!-- QUY TRINH section: FDM layer-line texture background -->
    <div class="mt-20">
      <h2 class="font-display text-2xl uppercase tracking-tight text-paper mb-8">QUY TRÌNH</h2>
      <div
        class="grid gap-px overflow-hidden rounded bg-panel border border-paper/10 md:grid-cols-3"
        style="background-image: repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(92,138,36,0.03) 3px, rgba(92,138,36,0.03) 4px);"
      >
        <div v-for="(s, i) in steps" :key="i" class="bg-panel p-8">
          <p class="font-display text-4xl text-hopper">{{ i + 1 }}</p>
          <h3 class="mt-3 font-sans text-base font-semibold text-paper">{{ s.t }}</h3>
          <p class="mt-2 font-sans text-sm font-light leading-relaxed text-silver">{{ s.d }}</p>
        </div>
      </div>
    </div>

    <div class="mt-20 flex flex-col items-start gap-4">
      <p class="font-display text-2xl uppercase text-paper">Muốn mẫu theo yêu cầu?</p>
      <MessengerButton label="Trao đổi với shop" />
    </div>
  </section>
</template>
```

- [ ] **Step 2: Run tests**

```bash
cd /Users/assmin/Documents/Projects/3d-website && npm test
```

Expected: `Tests 8 passed (8)`

- [ ] **Step 3: Commit**

```bash
cd /Users/assmin/Documents/Projects/3d-website && git add pages/gioi-thieu.vue && git -c user.name='Claude' -c user.email='noreply@anthropic.com' commit -m "feat: gioi-thieu dùng FigurePlaceholder cho ảnh quy trình"
```

---

### Task 7: Update `README.md`

**Files:**
- Modify: `README.md`

**Interfaces:** None (documentation only)

- [ ] **Step 1: Append the `hasPhotos` note to README**

The current README ends after the "Đổi link Messenger" section. Add:

```markdown

## Dùng ảnh thật (khi có ảnh sản phẩm)

1. Tạo thư mục `public/products/<slug>/` và đặt ảnh vào đó.
2. Cập nhật frontmatter trong `content/products/<slug>.md`: điền đường dẫn vào `cover` và `images` (ví dụ: `/products/kamen-rider-w/cover.jpg`).
3. Mở `app.config.ts`, đổi `hasPhotos: false` thành `hasPhotos: true`.

Khi `hasPhotos: false` (mặc định), trang hiển thị khung ảnh placeholder on-brand (`FigurePlaceholder`) thay vì ảnh thật.
```

- [ ] **Step 2: Run tests**

```bash
cd /Users/assmin/Documents/Projects/3d-website && npm test
```

Expected: `Tests 8 passed (8)`

- [ ] **Step 3: Commit**

```bash
cd /Users/assmin/Documents/Projects/3d-website && git add README.md && git -c user.name='Claude' -c user.email='noreply@anthropic.com' commit -m "docs: hướng dẫn dùng ảnh thật + flag hasPhotos"
```

---

### Task 8: Verify, generate, grep, and final commit

**Files:** None new — verification only, then squash-free final commit

**Interfaces:** Consumes all previous tasks

- [ ] **Step 1: Run full test suite**

```bash
cd /Users/assmin/Documents/Projects/3d-website && npm test
```

Expected: `Tests 8 passed (8)`

- [ ] **Step 2: Run static site generation**

```bash
cd /Users/assmin/Documents/Projects/3d-website && npm run generate 2>&1 | tail -30
```

Expected: exits 0; output contains routes for `/`, `/san-pham`, `/gioi-thieu`, `/lien-he`, and 5 product slugs (kamen-rider-w-cyclonejoker, kamen-rider-kuuga-mighty, ultraman-tiga-multi, godzilla-1995, zyuranger-tyrannoranger).

- [ ] **Step 3: Grep — no em-dash / en-dash**

```bash
grep -rnE "—|–" /Users/assmin/Documents/Projects/3d-website/pages /Users/assmin/Documents/Projects/3d-website/components /Users/assmin/Documents/Projects/3d-website/layouts /Users/assmin/Documents/Projects/3d-website/app.config.ts /Users/assmin/Documents/Projects/3d-website/content
```

Expected: empty output (no matches).

- [ ] **Step 4: Grep — no rendered picsum when hasPhotos=false**

The `v-if="shopConfig.hasPhotos"` guard ensures picsum URLs only render when the flag is true. Verify that all picsum references are inside the `v-if` block (not at template top-level):

```bash
grep -rn "picsum" /Users/assmin/Documents/Projects/3d-website/pages /Users/assmin/Documents/Projects/3d-website/components
```

Expected: all matches are inside `<template v-if="shopConfig.hasPhotos">` blocks (i.e., lines preceded by that guard). The content `.md` files may still reference picsum in frontmatter — that is fine (they're not rendered directly).

- [ ] **Step 5: Write `.superpowers/sdd/polish-report.md`**

Create `/Users/assmin/Documents/Projects/3d-website/.superpowers/sdd/polish-report.md` with:

```markdown
# Polish Report — Showa Hopper

## FigurePlaceholder Design
- File: `components/FigurePlaceholder.vue`
- Background: `bg-panel2` + CSS `radial-gradient` halftone (10px grid, 8% hopper tint) + diagonal speed-line hairlines (25% silver, 29px repeat)
- Motif: 7-hexagon compound-eye SVG at 40% frame size, opacity 0.18, hopper fill (#5c8a24)
- Position varies by `seed` (hash → translate ±9px, rotate ±15°)
- Caption: Oswald 9px uppercase tracked "ẢNH FIGURE" + optional label (silver/40)
- Props: `label?`, `ratio?` (default "4/5"), `seed?` (string|number)

## hasPhotos Flag Wiring
- `app.config.ts`: `shop.hasPhotos = false`
- `components/ProductCard.vue`: `v-if="shop.hasPhotos"` → NuxtImg, else → FigurePlaceholder (ratio 4/5, seed = product.slug)
- `components/ProductGallery.vue`: main image + each thumbnail wrapped in flag guard
- `components/Lightbox.vue`: new `hasPhotos?` prop; image block conditionally renders FigurePlaceholder per index
- `pages/index.vue`: hero (ratio 6/7, seed "hero") + about-teaser (ratio 1/1, seed "workshop") behind flag
- `pages/gioi-thieu.vue`: 3 process images (ratio 4/3, seed = index) behind flag

## Hero Copy Change
Before: "HERO / TOKUSATSU / IN FDM." (3 lines, "HERO" reads as stray word)
After: "FIGURE TOKUSATSU / IN FDM, SƠN THỦ CÔNG." (2 clean lines)
Katakana label added: "トクサツ / FDM / PLA+"
Subtext: "Mô hình Kamen Rider, Ultraman và hơn thế. In 3D FDM rồi sơn tay từng chi tiết, số lượng giới hạn."

## Other Copy Fixed
- No other placeholder/literal-sounding copy found. All pages had proper Vietnamese already.

## Build / Test / Generate Results
[To be filled after Task 8 execution]

## Grep Results
[To be filled after Task 8 execution]

## Concerns
- `FigurePlaceholder` uses inline `style` for `backgroundImage` (Tailwind purge can't JIT arbitrary gradient strings); this is intentional and correct.
- `seed` hashing uses `Math.imul` (available in all modern browsers and Node 10+); no polyfill needed for SSG.
- `Lightbox` `hasPhotos` prop defaults to `undefined` (falsy); updated guard uses `hasPhotos !== false` to keep existing call-sites that don't pass the prop rendering real images.
```

- [ ] **Step 6: Final squash commit**

```bash
cd /Users/assmin/Documents/Projects/3d-website && git add -A && git -c user.name='Claude' -c user.email='noreply@anthropic.com' commit -m "feat: khung ảnh placeholder on-brand + copy hero thật (Showa Hopper)"
```

---

## Self-Review

### Spec Coverage Check

| Spec Requirement | Task |
|-----------------|------|
| Create `FigurePlaceholder.vue` with halftone + compound-eye + caption | Task 1 |
| `hasPhotos: false` in `app.config.ts` | Task 2 |
| `ProductCard.vue` wired | Task 3 |
| `ProductGallery.vue` wired (main + thumbs) | Task 4 |
| `Lightbox.vue` wired (placeholder per index) | Task 4 |
| `pages/index.vue` hero + teaser wired | Task 5 |
| `pages/index.vue` hero copy fixed | Task 5 |
| `pages/gioi-thieu.vue` 3 process images wired | Task 6 |
| Scan other pages for placeholder copy | Covered in Step 5 report (none found) |
| README update | Task 7 |
| `npm test` 8/8 green | Task 8 |
| `npm run generate` succeeds | Task 8 |
| Grep no em-dashes | Task 8 |
| Grep picsum behind v-if | Task 8 |
| Write polish-report.md | Task 8 |
| Final commit with exact message | Task 8 |

### Placeholder Scan
No TBDs, TODOs, or "similar to" references in this plan. All code blocks are complete.

### Type Consistency
- `FigurePlaceholder` props: `label?: string`, `ratio?: string`, `seed?: string | number` — consistent across all usages.
- `Lightbox` new prop: `hasPhotos?: boolean` — used as `hasPhotos !== false` guard, `has-photos` in kebab-case template attribute.
- `useAppConfig().shop.hasPhotos` — consistent access pattern across all modified files.
