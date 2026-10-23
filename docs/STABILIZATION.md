# Stabilization (post–prelaunch audit)

Portfolio demo: https://ember-oak-beige.vercel.app  
Supabase: `abjzzbqnhutzklvwgftu`

## 1. Commits since `4ef2961` (scaling backups docs)

| Commit | Summary | Files (high level) | Regression risk |
|--------|---------|--------------------|-----------------|
| `4ef2961` | scaling backups docs | backup.yml, docs/*, SoftImage/Hero/ProductCard, admin pagination, indexes migration, config.toml | Indexes/pagination: empty lists must not crash (handled). Backup workflow only CI. |
| `bd75e36` | fix backup workflow | `.github/workflows/backup.yml` | Low — CI only. |
| `70bf6f7` | backup: use pg_dump 17 | backup.yml | Low — CI only. |
| `b08b55e` | **prelaunch audit** | `vercel.json` CSP Report-Only, store config consolidation, Microdata SEO, PLACEHOLDERS/LAUNCH docs, MockCheckout, InstagramStrip, ProductPage, config.toml | **CSP Report-Only** → browser console “violations” looking like errors. Config consolidation → wrong URLs if env missing. |
| `7f086eb` | fix mock checkout gate | health `paymentProvider`, paymentProvider.ts, create-order, MockCheckout, .env.example | **Demo gate / health**: if health rate-limits or misreports provider, mock checkout 404s. |
| `8e37421` | demo mode | `VITE_DEMO_MODE`, DemoBanner, AboutDemoPage, paymentProvider tests | Needs `VITE_DEMO_MODE=true` on Vercel or mock page hidden. |
| `b6c036b` | scroll to top | ScrollToTop, scrollNavigation | Low — path-only scroll; query-only shop filters OK. |
| `0d1c9f6` | motion / selects / layout | Shop/Account/Contact/Checkout selects, AnimatedOutlet, VariantSelector, CSS | Low UX; Select `required` replaced with validation where needed. |

### Likely causes of “random errors” after prelaunch

1. **CSP Report-Only** console noise (fixed: removed for demo — see `docs/CSP_ENFORCING.md`).
2. **Mock checkout gate** depending on health + later demo mode (fixed with `VITE_DEMO_MODE`).
3. **Pending migrations** `20260322000001` / `000002` not on remote until this pass (indexes / app_events) — applied.
4. **Stale `payments_select_own` RLS** on remote (buyers could read payments; SQL test failed) — fixed in `20260323000001`.

## 2. Build health

| Check | Result |
|-------|--------|
| TypeScript (`tsc -b`) | Pass |
| Vitest (108 tests) | Pass |
| Vite production build | Pass |
| oxlint | Exit 0; remaining warnings are React Compiler style (`set-state-in-effect`, `only-export-components`) — not runtime failures. Fixed purity (Footer year, checkout idempotency init), ShopPage memo deps, ConfirmDialog description nesting. |

## 3. Config (`vercel.json`)

- Schema: `$schema` openapi.vercel.sh; only supported keys (`cleanUrls`, `headers`, `rewrites`).
- SPA rewrite: `/((?!assets/|.*\\..*).*)` → `/index.html` covers `/shop`, `/product/:slug`, `/admin`, `/mock-checkout`, `/payment/*`, `/about-demo`, `/status`.
- **CSP:** Report-Only **removed** for the demo (console spam). Documented in `docs/CSP_ENFORCING.md`. Other security headers kept.

## 4. Env (names only)

### Vite / Vercel

- `VITE_SUPABASE_URL` (required)
- `VITE_SUPABASE_PUBLISHABLE_KEY` (required)
- `VITE_SITE_URL` (required for SEO)
- `VITE_APP_URL` (optional)
- `VITE_SENTRY_DSN` (optional)
- `VITE_DEMO_MODE` (set `true` for portfolio mock checkout)
- `VITE_DEMO_NOINDEX` (optional)
- `VITE_VERCEL_GIT_COMMIT_SHA` / `VITE_VERCEL_ENV` (optional; often injected at build)

### Supabase Edge secrets

- `APP_URL`, `EMAIL_FROM`, `PAYMENT_PROVIDER`, `PAYMENT_WEBHOOK_SECRET`, `RESEND_API_KEY`, `STORE_NOTIFY_EMAIL`
- Platform: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`, (+ JWKS / DB URL / key bundles)
- Optional alias: `MOCK_WEBHOOK_SECRET`

`.env.example` updated. `scripts/check-setup.ps1` lists secrets and reports missing **names**.

## 5. Deploy functions

`scripts/deploy-functions.ps1` deploys every `supabase/functions/*/index.ts` with `--use-api`, and `--no-verify-jwt` for guest/webhook/mock/health/admin-refund/send-order-email per `config.toml`. Stops on first error.

**Ran successfully** — 10 functions deployed.

## 6. Database

- Pending migrations applied: `20260322000001`, `20260322000002`, `20260323000001`.
- `notify pgrst, 'reload schema'` executed.
- SQL tests (rollback):

| File | Result |
|------|--------|
| `rls_tests.sql` | **PASS** (aligned settings allowlist; fixed top-level `raise notice`) |
| `order_tests.sql` | **PASS** |
| `admin_rls.sql` | **PASS** |
| `payments_and_emails.sql` | **PASS** |

### Function privileges (linked)

| Function | anon EXECUTE | authenticated EXECUTE |
|----------|--------------|------------------------|
| `create_order_atomic` | no | no |
| `cancel_order_restore_stock` | no | no |
| `apply_payment_webhook` | no | no |
| `require_admin` | no | no |
| `handle_new_user` | no | no |
| `admin_*` RPCs | no | yes (must call `require_admin` internally) |

Fix applied: dropped lingering `payments_select_own`.

## 7. Known issues — confirmed

| Issue | Status |
|-------|--------|
| Scroll to top on navigation | Present (`ScrollToTop` / path-keyed) |
| Discount Apply at checkout (no nested form) | Present (`DiscountCodeField` is a `div` + `type="button"`) |
| Dialog nesting warnings | ConfirmDialog uses `DialogDescription` (no invalid `asChild` div) |
| Health GET + HEAD | Supported in `health/index.ts` |
| Demo mode + mock checkout | `VITE_DEMO_MODE` + health `paymentProvider` |
| Admin cancel / ship / refund | `AdminOrderDetailPage` ConfirmDialogs |
| Contact form notification | `submit-contact` + `STORE_NOTIFY_EMAIL` |

## 8. Robustness

- Global `Sentry.ErrorBoundary` + `AppErrorFallback` in `main.tsx`
- `NotFoundPage` on `*`
- Catalog pages: skeletons + `CatalogError` retry; empty arrays defaulted (`?? []`)
- Empty product/search results show empty states, not crashes

## 9. You must still set (if not already on Vercel)

Confirm in the Vercel project env:

1. **`VITE_DEMO_MODE=true`** — required for `/mock-checkout` in production builds  
2. **`VITE_SUPABASE_URL`** / **`VITE_SUPABASE_PUBLISHABLE_KEY`**  
3. **`VITE_SITE_URL`** (= `https://ember-oak-beige.vercel.app` or your custom domain)  
4. Optional: **`VITE_SENTRY_DSN`**, **`VITE_APP_URL`**, **`VITE_DEMO_NOINDEX`**

Supabase secrets were verified present via `scripts/check-setup.ps1` (names only). Ensure **`PAYMENT_PROVIDER=mock`** and **`APP_URL`** match the live storefront origin.
