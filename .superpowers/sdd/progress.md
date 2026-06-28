# Tiến độ: Tokusatsu 3D Shop

Plan: docs/superpowers/plans/2026-06-28-tokusatsu-3d-shop.md
Branch: feat/build-site

## Tasks
- [x] Task 1: Scaffold Nuxt 3 + Tailwind + config
- [x] Task 2: Content schema + sample products + utils (TDD)
- [x] Task 3: Layout + header/footer + messenger + dark mode + useProducts
- [x] Task 4: ProductCard + SeriesFilter + /san-pham
- [x] Task 5: ProductGallery + Lightbox + /san-pham/[slug] + prerender
- [x] Task 6: Home /
- [x] Task 7: About + Contact
- [x] Task 8: Build tĩnh + pre-flight anti-slop + a11y + README

## Log
Task 1: complete (commits 156c111..37566eb, review clean + fix wave 1)
Task 2: complete (commits 37566eb..f283297, review clean)
Task 3: complete (commits f283297..c837c8a, review found stripped-diacritics + missing getBySlug, fixed)
Task 4: complete (commits c837c8a..74765cb, review clean, real content-v3 data verified)
Task 5: complete (commits 74765cb..253f0ad, lightbox/gallery/detail/prerender solid, 22 stripped diacritics fixed; stub gioi-thieu/lien-he created -> Task 7 replaces)
Task 6: complete (commits 253f0ad..5af8432, review clean, hero alt fixed)
Task 7: complete (commits 5af8432..7ced8de, about+contact replace stubs, focus ring + unused import fixed)
Task 8: complete (commits 7ced8de..a460df4, build/generate OK, README, contrast raised to AA)
Redesign requested: pivot museum -> Showa Hopper (Kamen Rider, dark hopper-green). Styleguide: docs/superpowers/specs/2026-06-28-showa-hopper-redesign.md
Task 1 (polish): complete (commits f69f15c..7f45223, review clean after fix wave)
Task 2 (polish): complete (commits 7f45223..2f4c597, review clean)
Task 3 (polish): complete (commits 2f4c597..6f6fc74, review clean)
Task 4 (polish): complete (commits 6f6fc74..2fd0acf, review clean)
Task 5 (polish): complete (commits 2fd0acf..4f7655c, review clean)
Task 6 (polish): complete (commits 4f7655c..5a960c0, review clean)
Task 7 (polish): complete (commits 5a960c0..7ede4e2, review clean)
Task 8 (polish): complete (final commit 42ab90d, tests 8/8, generate 21 routes, greps clean)
Final whole-branch review: APPROVED (f69f15c..42ab90d). Minor findings noted (all non-blocking). Polish pass complete.
Redesign complete: Showa Hopper applied + on-brand FigurePlaceholder frames (hasPhotos flag) + real hero copy. Verified via Chrome headless screenshots (home/collection/detail/about) — coherent toku, no stock-photo slop. tests 8/8, generate OK.
Content fix: shop does NOT paint. Removed all 'sơn thủ công' claims across pages/components/content + app.config; reframed to FDM multi-color (AMS) filament, choose color on order. tests 8/8, screenshots confirm.
Rename Henshin Studio -> Ichigo Studio everywhere (app.config, SEO titles, footer, README). New logo: components/RiderMark.vue = side-profile Kamen Rider Ichigo helmet (hopper-green compound eye) shown in header + footer. tests 8/8, generate OK.
Real product: deleted 5 mockups, added 'Đế trưng bày Capsem - Kamen Rider Zeztz' (FDM display stand, 8 Capsem + 1 Dualmare) with 4 real resized photos in public/. Schema made scale/height optional + added capacity. hasPhotos=true. Verified via screenshots.
