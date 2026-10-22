# Scaling notes (free tier first)

What will hurt first on free plans, how you’ll notice, and what to upgrade in what order.

## Limits that hit first

| Service | Typical free-tier pressure | Warning signs |
|---------|----------------------------|---------------|
| **Supabase database size** | Small disk quota; pauses on inactivity | Dashboard storage warnings; project paused; slow queries; backup dump grows fast |
| **Supabase Storage** | Limited GB for `product-images` | Upload failures; dashboard storage near cap |
| **Supabase Auth emails** | Cap on built-in auth emails (signup/reset) | Users never get reset/confirm mail; Auth logs show send errors |
| **Edge Function calls** | Monthly invocation / CPU limits | 429s from functions; checkout/health intermittent; dashboard usage red |
| **Vercel bandwidth** | Soft/hard bandwidth on Hobby | Slow assets; Vercel usage email; 402/blocked bandwidth |

Also watch: Resend free monthly sends, Sentry event quota, UptimeRobot monitor count (you’re fine with a few monitors).

## What we already did in the app

- Indexes on hot filter/join/sort columns — migration `supabase/migrations/20260322000002_indexes.sql`.
- Paginated lists: shop, search, admin products/orders/inventory/messages/events/reviews, account order history, product reviews (capped).
- Images: lazy-load below the fold, width/height on main surfaces, WebP compression on admin upload (`compressProductImage`).

## Supabase image transformations

**Would they help?** Yes for bandwidth and LCP: serve resized WebP/AVIF at card (~600px) vs full gallery (~1200px) without storing multiple files.

**Does Free support them?** Image transformations are a **Pro** (paid) Storage feature on Supabase, not available on Free. Stay on client compression + correct `width`/`height`/`loading` until you upgrade Storage/Pro; then switch `SoftImage` URLs to the transform query params / render endpoint.

## Upgrade order (when something actually hurts)

1. **Supabase Pro (or at least unpause / larger DB)** — if the DB pauses or disk fills, the whole store dies. Do this first.
2. **Storage headroom (same Pro bill often)** — when product photos won’t upload.
3. **Resend paid** — when order/contact volume exceeds free email sends.
4. **Vercel Pro** — when bandwidth or build minutes block launches (after fixing oversized images).
5. **Edge Function quota / compute** — if invocations spike with traffic; cache more on the client and keep lists paginated before buying compute.
6. **Sentry team plan** — only if you need longer retention / more events; optional for a solo store.

Prefer fixing waste (huge images, unbounded queries, chatty polling) before paying. Indexes + pagination + compression are the cheap wins.
