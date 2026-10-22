# Restore a database backup into a new Supabase project

Use this when the live database is lost, corrupted, or you need a clean cutover. Storage files (product images) are **not** inside the SQL dump — back those up separately (see below).

## What you need

- A recent `ember-oak-backup-*.sql.gz` from the GitHub Actions **Database Backup** workflow (Actions → artifact download).
- A **new** empty Supabase project (Dashboard → New project).
- The new project’s database connection string (Dashboard → Project Settings → Database → Connection string → URI). Prefer the **direct** connection (port `5432`) for restore, not the pooler, if available.
- Supabase CLI logged in (`supabase login`).
- Access to Vercel project env vars and Edge Function secrets.

Never paste connection strings into chat, commits, or screenshots.

---

## 1. Create the new project

1. In Supabase, create a project and wait until it is healthy.
2. Note the **project ref** (subdomain of `*.supabase.co`).
3. Copy the **anon/publishable** key and **service role** key (Settings → API). Keep the service role server-side only.

---

## 2. Restore the SQL dump

On a trusted machine with `psql` and `gunzip`:

```bash
gunzip -k ember-oak-backup-YYYYMMDDTHHMMSSZ.sql.gz
# Replace with the NEW project URI only — do not print it in logs you share.
psql "$NEW_DATABASE_URL" -v ON_ERROR_STOP=1 -f ember-oak-backup-YYYYMMDDTHHMMSSZ.sql
```

Notes:

- The dump targets `public` (and `auth` when the backup role was allowed). If `auth` restore errors on permissions, restore `public` first, then recreate users via Auth or a follow-up dump that your role can read.
- After restore, re-run any migrations newer than the dump if the app has moved ahead:  
  `supabase db push` (linked to the **new** project) or apply files under `supabase/migrations/` in order.
- Apply indexes if needed: `supabase/migrations/20260322000002_indexes.sql`.

---

## 3. Check the data

In the new project SQL editor (or `psql`):

```sql
select count(*) from public.products;
select count(*) from public.orders;
select count(*) from public.order_items;
select count(*) from public.payments;
select order_number, status, created_at from public.orders order by created_at desc limit 5;
```

Spot-check Admin → Products / Orders after pointing the app (next section). Confirm a known order number and a product slug still resolve.

---

## 4. Point the app at the new project

### Vercel (frontend)

Project → Settings → Environment Variables (Production, and Preview if used):

| Name | What to set |
|------|-------------|
| `VITE_SUPABASE_URL` | `https://<new-ref>.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | New anon/publishable key |
| `VITE_SITE_URL` | Your public site URL (unchanged unless domain changes) |
| `VITE_APP_URL` | Same as site URL if used for email links |
| `VITE_SENTRY_DSN` | Unchanged unless you create a new Sentry project |

Redeploy Production after saving env vars (Deployments → … → Redeploy, or push a commit).

### Local / CLI link

```bash
supabase link --project-ref <new-ref>
```

Update local `.env` the same way as Vercel (never commit `.env`).

### Edge Functions

Redeploy **every** function with the API flag (from repo root, linked to the new project):

```bash
supabase functions deploy create-order --use-api
supabase functions deploy validate-discount --use-api
supabase functions deploy payment-webhook --use-api
supabase functions deploy mock-sign-payment --use-api
supabase functions deploy send-order-email --use-api
supabase functions deploy track-order --use-api
supabase functions deploy submit-contact --use-api
supabase functions deploy subscribe-newsletter --use-api
supabase functions deploy admin-refund --use-api
supabase functions deploy health --use-api
```

### Re-set Edge Function secrets (by name only)

In Dashboard → Edge Functions → Secrets, or CLI `supabase secrets set NAME=...` (values from your password manager — never commit them):

| Secret name | Purpose |
|-------------|---------|
| `RESEND_API_KEY` | Transactional email |
| `EMAIL_FROM` | From address (verified domain) |
| `APP_URL` | Public site URL for links in emails/payments |
| `STORE_NOTIFY_EMAIL` | Inbox for contact / ops alerts |
| `PAYMENT_PROVIDER` | e.g. `mock` until a real provider is live |
| `PAYMENT_WEBHOOK_SECRET` | Webhook HMAC / shared secret |
| `MOCK_WEBHOOK_SECRET` | Fallback for mock provider (if used) |

`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `SUPABASE_ANON_KEY` / `SUPABASE_PUBLISHABLE_KEY` are normally provided by the platform; confirm they match the new project after link/deploy.

### GitHub backup secret

Update Actions secret `DATABASE_URL` to the **new** project’s connection URI so weekly backups continue against production.

### UptimeRobot

Point the health monitor at:  
`https://<new-ref>.supabase.co/functions/v1/health`

---

## 5. Storage: `product-images` (separate from SQL)

SQL dumps do **not** include Storage objects.

**Backup (before disaster):**

```bash
# After supabase link to the LIVE project
mkdir -p backups/product-images
supabase storage cp -r ss://product-images ./backups/product-images
```

Or use the Dashboard → Storage → `product-images` → download, or any S3-compatible sync against the Storage API.

**Restore:**

1. Create a public (or same policy) bucket named `product-images` in the new project.
2. Upload files preserving paths so existing `product_images.url` values still work — or rewrite URLs in `product_images` to the new project host.
3. Re-apply Storage policies from your migrations / Dashboard so public read and admin write match production.

If image URLs embed the old project host, either:

- keep serving from the old bucket until you rewrite rows, or  
- `update product_images set url = replace(url, 'https://old-ref.supabase.co', 'https://new-ref.supabase.co');`

---

## 6. Smoke test after cutover

1. Open the store, browse shop, open a product, add to cart.
2. Place a **test** order (mock payment if still enabled).
3. Confirm email (Resend) and Admin → Orders.
4. Hit `/status` and the health function.
5. Confirm Sentry still receives a test event if you use `/sentry-test`.
