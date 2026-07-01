# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Ichigo Studio — a Vietnamese-language static showcase site for 3D-printed (FDM) accessories and display stands for DX toys (Kamen Rider / tokusatsu). It is a catalog only: no cart, no checkout. All buying intent funnels to Messenger.

Stack: Nuxt 3 (SSG via `nuxt generate`) + `@nuxt/content` v3 + `@nuxt/image` + Tailwind v3. Content is authored in Markdown, not a CMS or database.

## Commands

This project uses **yarn** (Yarn Classic 1.x) as its package manager — use `yarn`, not `npm`. The lockfile is `yarn.lock`.

```bash
yarn               # install dependencies
yarn dev           # dev server at http://localhost:3000
yarn test          # vitest run (unit tests in tests/)
yarn generate      # static build -> .output/public (this is the production build)
yarn preview       # preview the generated site
yarn vitest run tests/products.test.ts   # run a single test file
```

There is no lint/format script configured.

## Architecture

**Content-driven products.** Each product is one Markdown file in `content/products/<slug>.md`. Frontmatter is validated by a Zod schema in `content.config.ts` (`title`, `slug`, `series`, `material`, `priceRef`, `images`, `cover` required; `featured`, `order` have defaults). The Markdown body is the product description. Adding a `.md` file is the only step needed to add a product — routes are generated from the directory at build time.

**Static prerender wiring.** `nuxt.config.ts` reads `content/products/` at config-eval time with `readdirSync` to build the list of `/san-pham/<slug>` routes, then passes them to `nitro.prerender.routes` alongside `crawlLinks: true`. If product pages are missing from the static build, this is where to look.

**Data flow.** Pages never query content inline for lists — they go through the `useProducts()` composable (`composables/useProducts.ts`), which loads all products via `queryCollection('products').all()` inside `useAsyncData`, then derives `featured` / `seriesList` / `related` / `getBySlug`. The pure list logic (`sortByOrder`, `getFeatured`, `getSeriesList`, `filterBySeries`, `getRelated`) lives in `utils/products.ts` and is unit-tested in isolation — keep new filtering/sorting logic there as pure functions, not in components. The detail page `pages/san-pham/[slug].vue` queries a single product directly by slug.

**Shop config is centralized.** `app.config.ts` (`shop` object) holds all shop identity: `name`, `tagline`, `messengerUrl`, `facebookUrl`, `area`, `responseTime`, and the global `hasPhotos` flag. Access it only via `useShop()`. Messenger links are normalized through `buildMessengerHref()` in `utils/messenger.ts` (adds `https://` if missing).

**Photo placeholder mode.** When `shop.hasPhotos` is `false`, components render the on-brand `FigurePlaceholder` instead of real images (used by `ProductCard`, `ProductGallery`, `Lightbox`, and the home/intro pages). This lets the site ship before product photos exist. Real photos go in `public/products/<slug>/`, referenced from the `cover`/`images` frontmatter; then flip `hasPhotos: true`.

**Layout.** Single `layouts/default.vue` wraps every page with `AppHeader`, `AppFooter`, a `FloatingContact` Messenger button, and a fixed film-grain overlay (disabled under `prefers-reduced-motion` / `prefers-reduced-transparency`).

## Routing & language conventions

- Routes and slugs are Vietnamese, unaccented kebab-case: `/san-pham` (products), `/san-pham/[slug]`, `/gioi-thieu` (about), `/lien-he` (contact).
- All user-facing copy is **Vietnamese with full diacritics** — preserve them exactly when editing. Do not strip accents or substitute ASCII.
- Per the brand voice (`docs/brand/README.md`): no em-dashes (—) in copy — use commas or periods. Sparse katakana accents are intentional.

## Design system (do not improvise)

Brand tokens are defined in `tailwind.config.ts` and documented in `docs/brand/README.md` (full board: `docs/brand/ichigo-studio-brand.html`). Use the Tailwind tokens, not raw hex:

- Colors: `night` (bg), `panel`/`panel2` (surfaces), `hopper`/`hopper.bright` (primary web accent — the WCAG-AA-safe lightened logo green), `ichigo` (deep logo green for large fills), `silver`, `paper`.
- Fonts: `font-display` = Anton (poster headings, uppercase), `font-sans` = Oswald (body/labels). Both self-hosted from `assets/fonts/` with VI+Latin subsets in `assets/css/main.css`. Never introduce Inter or any serif.
- The site is dark-mode-only (`htmlAttrs: { class: 'dark' }`, `darkMode: 'class'`).

## Notes

- The toys shown in product imagery are genuine items used for illustration only and are **not included** — product copy must keep this disclaimer.
- `.data/`, `.nuxt/`, `.output/`, `dist` (symlink to `.output/public`) are generated/gitignored.
- `@nuxt/content` v3 uses a SQLite store (`better-sqlite3`) at build time; `image.domains` allows `picsum.photos` for placeholder covers.
