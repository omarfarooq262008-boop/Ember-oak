# Ember & Oak

Premium home fragrance and homeware storefront for Pakistan — React, TypeScript, Tailwind CSS v4, shadcn-style UI, and Supabase.

## Quick start

```bash
npm install
cp .env.example .env   # optional — works offline with local catalog
npm run dev
```

Without Supabase env vars the app runs on the **local demo catalog** (`src/data/catalog.ts`): 5 categories, 3 collections, 24 products, 3 discount codes (`WELCOME10`, `EMBER500`, `FREESHIP`). Cart, checkout, contact, and newsletter persist in `localStorage`.

## Store configuration

Edit **one file**: [`src/config/store.ts`](src/config/store.ts) — name, delivery rules, payments, support contacts, announcement, “why us” points, SEO.

Design tokens are documented in [`src/config/design.md`](src/config/design.md).

## Supabase setup

1. Create a project (or use the linked one).
2. Run SQL in order:
   - `supabase/migrations/20260316000001_init_schema.sql`
   - `supabase/seed.sql`
3. Set secrets for Edge Functions (Dashboard → Edge Functions → Secrets):
   - `SUPABASE_SERVICE_ROLE_KEY` (auto-provided in hosted functions)
   - Never put the service role key in `VITE_*` vars.
4. Deploy `supabase/functions/create-order`.
5. Frontend `.env`:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
```

### Security model

- RLS on every table; public reads only active catalog + approved reviews.
- Customers read only their own orders / addresses / wishlists.
- `is_admin` on `profiles` cannot be self-escalated.
- Orders are **not** inserted from the browser — use `create-order` (Zod validation, server-side price recompute, atomic stock decrement, discount validation, idempotency key, rate limit).
- Card payments stay `pending_payment` until a verified provider webhook marks them paid (mock provider for now).
- Security headers (CSP Report-Only, HSTS, frame deny, etc.) live in [`vercel.json`](vercel.json). When adding a real payment provider, allow their checkout origin in CSP `form-action` and `connect-src` (and `frame-src` if they use an iframe checkout). When switching the header from `Content-Security-Policy-Report-Only` to enforcing `Content-Security-Policy`, add `upgrade-insecure-requests` back (browsers ignore that directive in report-only mode).

## Scripts

| Command             | Description                     |
|---------------------|---------------------------------|
| `npm run dev`       | Vite dev server                 |
| `npm run lint`      | Code linting with oxlint        |
| `npm run typecheck` | Type check without emitting     |
| `npm test`          | Run Vitest test suite           |
| `npm run build`     | SEO generation + tsc + vite     |
| `npm run preview`   | Preview production build        |

## Deployment and checks

### Automated CI pipeline
Every push and pull request targeting `main` automatically runs `.github/workflows/ci.yml`:
1. **Dependency installation:** `npm ci` with cached npm dependencies.
2. **Linting:** `npm run lint` (oxlint).
3. **TypeScript validation:** `npm run typecheck` (`tsc -b`).
4. **Unit tests:** `npm test` (`vitest run`).
5. **Production build:** `npm run build` (with placeholder environment variables to verify bundling passes without secrets).

Any failure halts the pipeline and blocks the deployment.

### Running checks locally
To verify your work before pushing to GitHub:
```bash
npm run lint         # Fast code linting
npm run typecheck    # Strict TypeScript checks
npm test             # Run all unit tests
npm run build        # Test production build bundle
```

### Database testing workflow
`.github/workflows/db-tests.yml` provides a manual test suite (`workflow_dispatch` only) for SQL test files in `supabase/tests/`. It requires the `TEST_DATABASE_URL` secret and safety guards guarantee it will never execute against production databases.

## Project structure

```
src/
  config/        store.ts + design tokens doc
  components/    ui, layout, home, product, cart, search, seo
  contexts/      cart + wishlist
  data/          local catalog seed
  hooks/
  lib/           catalog queries, format, supabase, orders, pakistan
  pages/
supabase/
  migrations/    schema + RLS
  seed.sql
  functions/     create-order
```

## Demo discount codes

- `WELCOME10` — 10% off, min PKR 3,000
- `EMBER500` — PKR 500 off, min PKR 5,000
- `FREESHIP` — PKR 250 off (covers flat delivery)

## Legal

Static legal pages are drafts marked for legal review in `store.legal`. Replace support placeholders and bank details before launch.
