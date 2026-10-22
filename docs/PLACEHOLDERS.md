# Placeholder audit

Replace these before real customers see the site. Editable store details live in **`src/config/store.ts`** (phone, WhatsApp, email, address, bank, social). Admin → Settings can override contact/delivery in the database; keep those in sync with `store.ts` after you edit.

UI `placeholder=` attributes on inputs (e.g. “Enter code”) are normal form UX and are **not** listed here.

---

## Must replace — `src/config/store.ts`

| Line (approx) | What | Replace with |
|---------------|------|----------------|
| `payments.bankTransfer.bankName` (~39) | `HBL — Placeholder Bank` | Real bank name |
| `payments.bankTransfer.accountTitle` (~40) | `Ember & Oak (Pvt) Ltd` | Registered account title |
| `payments.bankTransfer.accountNumber` (~41) | `01234567890123` | Real account number |
| `payments.bankTransfer.iban` (~42) | `PK00HABB0000000000000000` | Real IBAN |
| `payments.bankTransfer.instructions` (~43–44) | Demo transfer copy | Your confirmation process |
| `payments.cardNote` (~46) | Mock card demo note | Real provider copy (or remove when live) |
| `support.whatsapp` (~50) | `+92 300 0000000` | Real WhatsApp number |
| `support.whatsappUrl` (~51) | `https://wa.me/923000000000` | Matching `wa.me` link |
| `support.email` (~52) | `hello@emberandoak.pk` | Real inbox (Resend-verified domain) |
| `support.phone` (~53) | `+92 21 0000 0000` | Real phone |
| `support.address.*` (~54–60) | Suite 12 / Clifton Block 5 demo address | Real studio/warehouse address |
| `whyUs[2].detail` (~92–93) | Mentions “mock provider in this demo” | Live payment wording |
| `social.instagram` / `instagramHandle` / `facebook` / `pinterest` (~97–102) | `emberandoak` demo profiles | Real social URLs + handle |
| `seo.siteUrl` fallback (~106) | `https://emberandoak.pk` | Final domain (prefer `VITE_SITE_URL`) |
| `legal.companyName` (~121) | `(placeholder — register your legal entity)` | Registered legal name |
| `legal.needsLegalReview` (~122) | `true` | `false` after lawyer signs off |
| `legal.notice` (~123–124) | Draft / demo legal disclaimer | Remove or replace after review |

---

## Legal pages (draft banners)

| File | Lines | What | Replace with |
|------|-------|------|----------------|
| `src/pages/PrivacyPage.tsx` | ~5–12, ~51, ~113, ~124 | `needsLegalReview` banner; “demo site” wording | Lawyer-approved privacy policy |
| `src/pages/TermsPage.tsx` | ~6–12, ~25, ~41, ~112 | Draft terms + review banner | Lawyer-approved terms |

---

## Domain / SEO fallbacks (`emberandoak.pk`)

| File | Lines | What | Replace with |
|------|-------|------|----------------|
| `vite.config.ts` | ~116 | Fallback site URL | Final domain via env |
| `scripts/generate-seo.mjs` | ~34 | Fallback for robots/sitemap | `VITE_SITE_URL` in CI/Vercel |
| `.env.example` | ~8–11 | Example `emberandoak.pk` | Document your real domain |
| `docs/MONITORING.md` | ~9–10, ~28, ~35 | Monitor URLs | Live domain |
| `docs/LAUNCH_CHECKLIST.md` | domain items | Same | Live domain |

Set **`VITE_SITE_URL`** (and **`VITE_APP_URL`**) on Vercel so robots, sitemap, and canonicals do not rely on the fallback.

---

## Database seed / settings (demo contact)

| File | Lines | What | Replace with |
|------|-------|------|----------------|
| `supabase/migrations/20260316000006_admin_panel.sql` | ~386 | Seed `contact` JSON: `hello@emberandoak.pk`, `+92 21 0000 0000`, `+92 300 0000000` | Update via Admin → Settings (or a follow-up migration) after go-live |
| `supabase/seed.sql` | whole file | Demo catalog copy (24 products, local `/images/…`) | Replace with real products in Admin, or re-seed intentionally |

---

## Demo catalog / images

| File | What | Replace with |
|------|------|----------------|
| `src/data/catalog.ts` | Local **dev fallback** catalog when Supabase URL missing | Not used in production if env is set; keep for local only |
| `src/config/media.ts` | Local `/images/hero.jpg`, `/images/ig-*.jpg` | Real photography in `public/images/` |
| `public/images/*` | Demo assets (originally cached from Unsplash via script) | Own photos; do not hotlink Unsplash in production |
| `scripts/download-images.mjs` | Downloads from `images.unsplash.com` | Dev tooling only — do not use hotlinks in DB |
| `scripts/check-images.mjs` | Flags Unsplash URLs | Run before launch; should report none in live data |
| `supabase/fix_image_urls.sql` | Migrates leftover Unsplash URLs to local paths | Run if any Unsplash URLs remain in DB |

---

## Payments / provider TODOs

| File | Lines | What | Replace with |
|------|-------|------|----------------|
| `supabase/functions/_shared/payments.ts` | ~161–217 | `TODO(Safepay|PayFast|XPay)` stubs | Real provider implementation when leaving mock |
| Edge secret `PAYMENT_PROVIDER` | — | Still `mock` for demo | Real provider name + webhook secret |
| `VITE_PAYMENT_PROVIDER` | `.env.example` | Optional public mirror | Set to `mock` only while mock checkout is intentional; unset/change when live so `/mock-checkout` 404s |

---

## Emails / samples

| File | What | Notes |
|------|------|--------|
| `src/lib/email/templates.ts` | `EMAIL_PREVIEW_SAMPLES`, sample order URLs | Dev preview only (`/email-preview`) |
| `src/pages/EmailPreviewPage.tsx` | Dev email preview UI | Do not link from production nav |
| Footer / Newsletter `placeholder="you@example.com"` | Input hint only | OK to leave or change to a local example |

---

## Tests / CI (leave as-is)

Uses of `example.com`, fake phones, and nil UUIDs in `src/**/*.test.ts`, `supabase/tests/*.sql` are intentional fixtures — not storefront content.

---

## Already consolidated

Phone, WhatsApp, email, address, bank details, and social links for the storefront read from **`src/config/store.ts`** (and optional DB overrides for contact/delivery via Admin Settings). Instagram handle display uses `store.social.instagramHandle`.
