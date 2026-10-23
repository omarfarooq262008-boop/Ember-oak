# Performance (portfolio polish)

Mobile Lighthouse (`formFactor: mobile`, 390×844, simulated throttling) via `npm run lighthouse:qa`.

**Before** scores are from the live demo after QA stabilization ([docs/QA_REPORT.md](./QA_REPORT.md)).  
**After** scores are from a local production preview (`vite build` + `vite preview`) of this polish branch — same Lighthouse config — so CDN/HTTP2 differences vs Vercel are small but not identical.

## Scores

| Page | Before (Perf) | After (Perf) | Δ | A11y | BP | SEO |
|------|---------------|--------------|---|------|----|-----|
| `/` | **75** | **76** | +1 | 97 | 100 | 100 |
| `/shop` | **62** | **68** | +6 | 95 | 100 | 100 |
| Product (`/product/reed-diffuser-amber`) | **57** | **66** | +9 | 95 | 100 | 100 |

Re-run anytime:

```bash
npm run build
npx vite preview --host 127.0.0.1 --port 4173
# other terminal:
QA_BASE_URL=http://127.0.0.1:4173 npm run lighthouse:qa
```

Raw JSON: [qa-lighthouse.json](./qa-lighthouse.json).

## What was hurting (Lighthouse opportunities)

| Opportunity | Fix applied |
|-------------|-------------|
| Oversized images / no modern formats | `scripts/optimize-images.mjs` → responsive WebP (`-480/-800/-1200/-1920`) + compressed JPG; SoftImage `<picture>` srcset + `sizes` |
| LCP image | Hero preload in `index.html` (WebP srcset); `loading="eager"` + `fetchPriority="high"`; no opacity-0 / pulse overlay on eager images; ken-burns delayed 1.5s; product primary image preload on product pages |
| Render-blocking fonts | Removed Google Fonts CSS; self-host Inter/Sora (`@fontsource`, latin weights only, `font-display: swap`) |
| Unused / heavy JS on first load | Deferred Sentry (`requestIdleCallback` + dynamic import); lazy Shop/Product/Cart/Checkout + admin; stop forcing an `admin` manual chunk (it was modulepreloading ~500KB React/shared code on every page); skip modulepreload for supabase/sentry |
| Over-fetching products | Shop stays at `SHOP_PAGE_SIZE` 12; bestsellers 8; newest default 12; related 4 |
| Layout shift | Width/height on SoftImage usages; CLS stayed ~0–0.04 |

## Why not 85+ on all three

Under mobile Lighthouse throttling, **LCP remains ~4.7–5.2s** and **unused JavaScript ~95–100 KiB**, dominated by the React SPA shell (`react` ~241 KB, `router` ~94 KB, app `index` ~155 KB) plus the Supabase client when env is present. That JS must download and parse before the React tree (and thus the LCP image/text) can paint.

Reaching a reliable **85+** on shop/product without changing the stack would need **SSR/streaming** (or a much thinner client), not more image tweaks — images and fonts are already on a solid path. Home is closest; product/shop pay for route chunks + catalog UI (filters/gallery) on top of the same shell.

## Image check

```bash
npm run images:optimize
npm run images:check   # 102 OK / 0 FAIL after polish
```
