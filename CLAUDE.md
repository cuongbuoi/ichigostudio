# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Ichigo Studio — a Vietnamese-language showcase site for 3D-printed (FDM) accessories and display stands for DX toys (Kamen Rider / tokusatsu). It started as a catalog and now also has a cart and bank-transfer checkout (see "Cart & checkout"), gated by an API setting so it can be switched off. Messenger remains the path for questions and for products without a price ("Hỏi mua").

Stack: Nuxt 3 (**SSR**) + `@nuxt/image` + Tailwind v3. Products are fetched at runtime from the Ichigo Studio API (`ichigo-studio-api`, the CMS/D1 backend) via its public read endpoints; there is no Markdown/`@nuxt/content` content store anymore.

## Commands

This project uses **yarn** (Yarn Classic 1.x) as its package manager — use `yarn`, not `npm`. The lockfile is `yarn.lock`.

```bash
yarn               # install dependencies
yarn dev           # SSR dev server at http://localhost:3000 (needs the API running for product data)
yarn test          # vitest run (unit tests in tests/)
yarn build         # SSR build (.output/server) — this is the production build
yarn preview       # preview the built server
yarn vitest run tests/products.test.ts   # run a single test file
```

The API base URL is `runtimeConfig.public.apiBase` (env `NUXT_PUBLIC_API_BASE`, default `http://localhost:8787`; see `.env.example`). Run `ichigo-studio-api` (`yarn dev`, port 8787) with seeded/published products to see data locally. The API's `ALLOWED_ORIGINS` must include this store's origin (`http://localhost:3000` in dev) so client-side (SPA-navigation) fetches pass CORS.

There is no lint/format script configured.

## Architecture

**API-driven products (SSR).** Products come from the API's public read endpoints: `GET {apiBase}/public/products` (list — each item has `cover` but NOT an `images[]` array) and `GET {apiBase}/public/products/:slug` (detail — includes `images: {url,sort}[]` and `bodyMd`). Only `published` products are returned. To add/edit a product, use the admin (`ichigo-studio-admin`) — the store reflects it live (SSR, no rebuild).

**Data mapping.** Raw API items are normalized to the `Product`/`ProductMeta` shape by `mapApiProduct()` in `utils/products.ts` (`images:[{url}]→string[]`, `cover = api.cover ?? images[0] ?? ''`, `price:number|null`, `bodyMd`). Price is an integer VND (or `null` = "Liên hệ"); format for display with `formatPrice()` (never show the raw number).

**Data flow.** Lists go through the `useProducts()` composable (`composables/useProducts.ts`), which fetches `/public/products` via `useAsyncData` + `$fetch` (falls back to `[]` on error), maps, and derives `featured` / `seriesList` / `related` / `getBySlug`. The pure list logic (`sortByOrder`, `getFeatured`, `getSeriesList`, `filterBySeries`, `getRelated`) lives in `utils/products.ts` and is unit-tested — keep new filtering/sorting there as pure functions, not in components. The detail page `pages/san-pham/[slug].vue` fetches `/public/products/:slug` (404 via `createError` when missing) and renders `bodyMd` with `markdown-it` (`v-html`, `html` option off — owner-authored content). Note: SSR fetch is server-side (no CORS), but SPA-navigation fetches run in the browser, so the API's CORS `ALLOWED_ORIGINS` must include the store origin.

**Shop config is centralized.** `app.config.ts` (`shop` object) holds all shop identity: `name`, `tagline`, `messengerUrl`, `facebookUrl`, `area`, `responseTime`, and the global `hasPhotos` flag. Access it only via `useShop()`. Messenger links are normalized through `buildMessengerHref()` in `utils/messenger.ts` (adds `https://` if missing).

**Photo placeholder mode (per-product).** Image display is decided per product, not by a global flag: `ProductCard` shows the real image when `product.cover` is set (else the on-brand `FigurePlaceholder`); `ProductGallery`/`Lightbox` show real images when `product.images.length > 0`. Product images are uploaded via the admin to R2 and served by the API at `/media/...` (absolute URLs in `cover`/`images`). (`app.config.ts` may still carry a `hasPhotos` field but it no longer drives product image rendering.)

**Layout.** Single `layouts/default.vue` wraps every page with `AppHeader`, `AppFooter`, a `FloatingContact` Messenger button, and a fixed film-grain overlay (disabled under `prefers-reduced-motion` / `prefers-reduced-transparency`).

## Cart & checkout

Client-side cart + VietQR bank transfer, confirmed by a SePay webhook on the API. The server recomputes all prices from the DB (client prices are ignored). 100% of the goods total is paid online; shipping is paid on delivery, and cart, checkout and payment screens say `Giá chưa bao gồm phí vận chuyển. Phí vận chuyển được thanh toán khi nhận hàng.` and the thank-you screen says `Phí vận chuyển được thanh toán trực tiếp cho đơn vị giao hàng khi bạn nhận hàng.`. Products with `price = null` (or <= 0) cannot be added to the cart.

- Flow: `/gio-hang` (cart) -> `/thanh-toan` (customer form) -> `POST /public/checkout` -> `/thanh-toan/[id]` (QR + bank info, polls until paid, 15 min display window only). Payment code is `ICG` + 8 digits and goes in the transfer content.
- The cart UI only shows when `GET /public/checkout/config` says `enabled` or `testMode` (`composables/useCheckoutConfig.ts`, client-side fetch; any error means hidden).
- Other pages: `/don-hang` (saved orders + order lookup by code and phone), `/dat-thu?key=...` (secret test-order page, lists test products and calls `setTestKey` so the cart appears without reload). Both are `noindex`, and cart/checkout/lookup/test pages are deliberately NOT in `server/routes/sitemap.xml.ts`.
- Storage keys: `ichigo.cart.v1` (localStorage, cart entries), `ichigo.orders.v1` (localStorage, saved `{code, phone}`, max 20), `ichigo.pendingCheckout.v1` (localStorage, `{id, phone}` until the payment is seen as paid), `ichigo.testKey` (sessionStorage, test key).
- API endpoints used: `GET /public/checkout/config`, `POST /public/checkout`, `GET /public/checkout/:id`, `GET /public/checkout/test-products?key=`, `POST /public/orders/lookup` (404 `not_found` for a wrong code or phone, 429 when rate limited).
- Pure cart logic lives in `utils/cart.ts` and `utils/phone.ts` (unit-tested). Composables that register hooks (`useCheckoutConfig`, `useProducts`) must be called at setup time, never inside a watch or onMounted; `useCartProductsLoader()` follows that rule and returns a plain async loader.

## Routing & language conventions

- Routes and slugs are Vietnamese, unaccented kebab-case: `/san-pham` (products), `/san-pham/[slug]`, `/gioi-thieu` (about), `/lien-he` (contact), `/gio-hang`, `/thanh-toan`, `/don-hang`, `/dat-thu`.
- All user-facing copy is **Vietnamese with full diacritics** — preserve them exactly when editing. Do not strip accents or substitute ASCII.
- Per the brand voice (`docs/brand/README.md`): no em-dashes (—) in copy — use commas or periods. Sparse katakana accents are intentional.

## Design system (do not improvise)

Brand tokens are defined in `tailwind.config.ts` and documented in `docs/brand/README.md` (full board: `docs/brand/ichigo-studio-brand.html`). Use the Tailwind tokens, not raw hex:

- Colors: `night` (bg), `panel`/`panel2` (surfaces), `hopper`/`hopper.bright` (primary web accent — the WCAG-AA-safe lightened logo green), `ichigo` (deep logo green for large fills), `silver`, `paper`.
- Fonts: `font-display` = Anton (poster headings, uppercase), `font-sans` = Oswald (body/labels). Both self-hosted from `assets/fonts/` with VI+Latin subsets in `assets/css/main.css`. Never introduce Inter or any serif.
- The site is dark-mode-only (`htmlAttrs: { class: 'dark' }`, `darkMode: 'class'`).

## Notes

- The toys shown in product imagery are genuine items used for illustration only and are **not included** — product copy must keep this disclaimer.
- `.nuxt/`, `.output/` are generated/gitignored. `.env` is gitignored (`.env.example` is tracked).
- `image.domains` (nuxt.config) must list any remote host serving product images (e.g. the API `/media` host / R2 domain) when deploying with `@nuxt/image`.
- Deploy: the store is SSR on a Cloudflare Worker. Nitro preset is `cloudflare_module` (nuxt.config) and `yarn deploy` runs `nuxt build && wrangler deploy`, using `wrangler.jsonc` (serves `.output/server/index.mjs` + `.output/public` assets, sets `NUXT_PUBLIC_API_BASE`, custom domain `ichigostudio.vn`).
