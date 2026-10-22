# Runbook (solo owner)

What to do when something breaks. No secret values — only names.

## Site is down

1. Check [UptimeRobot](https://uptimerobot.com) — which monitor failed (home, `/status`, or health)?
2. Open the Vercel dashboard → Deployments. If a bad deploy is live, **roll back** (see below).
3. Open `https://your-domain/status` and the health URL:  
   `https://abjzzbqnhutzklvwgftu.supabase.co/functions/v1/health`
4. Supabase Dashboard → Project — is the database **paused** (free tier inactivity)? Resume it, wait a minute, recheck health.
5. Sentry → Issues for frontend errors after a deploy.
6. If DNS/domain: Vercel → Domains; confirm SSL is valid.

## Orders fail (checkout errors)

1. Browser Network tab → failed call to `create-order` or `validate-discount` — note status and JSON error.
2. Supabase → Edge Functions → Logs for `create-order` / `validate-discount`.
3. Admin → Events (or `app_events`) for checkout / rate-limit / stock errors.
4. Confirm stock on the variant; low stock or inactive product blocks checkout.
5. Confirm `PAYMENT_PROVIDER` and webhook secrets are set (see rotation list).
6. If rate-limited, wait or inspect `rate_limits`; abuse can trip per-IP limits.

## Emails stop

1. Resend dashboard → API status, domain verification, bounce/complaint.
2. Confirm Edge secrets: `RESEND_API_KEY`, `EMAIL_FROM`, `APP_URL`.
3. Admin → Events → filter email failures; retry failed outbox rows if the UI offers Retry.
4. Table `email_outbox` — rows stuck in `pending` / `failed`.
5. Function logs: `send-order-email`.
6. Contact-form notify uses `STORE_NOTIFY_EMAIL` — confirm that inbox.

## Database is paused

Free projects pause after inactivity.

1. Supabase Dashboard → open the project → **Restore / Resume**.
2. Wait until API and DB show healthy.
3. Hit health again; place a tiny smoke-test browse (not necessarily a paid order).
4. Consider upgrading if you need always-on (see [SCALING.md](./SCALING.md)).

## Payment stuck (paid in provider / pending in app)

1. Admin → Orders → open the order — status and payment row.
2. Edge logs: `payment-webhook`, `mock-sign-payment`.
3. Confirm `PAYMENT_WEBHOOK_SECRET` (or `MOCK_WEBHOOK_SECRET`) matches what the provider sends.
4. If webhook never arrived, replay from the provider dashboard or complete via admin tools if you have a documented manual path.
5. Do not double-charge — reconcile with the payment provider’s transaction id before retrying.

## Roll back a bad deploy (Vercel)

1. Vercel → Project → **Deployments**.
2. Find the last known-good Production deployment.
3. … menu → **Promote to Production** (or Redeploy that commit).
4. Confirm home, shop, and a product page load.
5. If the bad deploy included env var changes, restore previous env values and redeploy again.
6. Optionally revert the git commit on `main` and push so history matches production.

---

## Rotate secrets (names only — never commit values)

After rotating, redeploy Edge Functions if secrets changed there, and redeploy Vercel if `VITE_*` changed.

### Vercel (Project → Settings → Environment Variables)

| Name | Rotate when |
|------|-------------|
| `VITE_SUPABASE_URL` | New Supabase project / URL change |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Anon key rotated in Supabase |
| `VITE_SITE_URL` | Domain change |
| `VITE_APP_URL` | Public URL used in emails/links |
| `VITE_SENTRY_DSN` | New Sentry project or DSN rotate |

### GitHub Actions (Settings → Secrets and variables → Actions)

| Name | Rotate when |
|------|-------------|
| `DATABASE_URL` | DB password rotate or new project (used by weekly backup) |
| `TEST_DATABASE_URL` | Test DB password rotate (db-tests workflow only) |

### Supabase Edge Function secrets

| Name | Rotate when |
|------|-------------|
| `RESEND_API_KEY` | Compromised or Resend key regenerate |
| `EMAIL_FROM` | New verified sender |
| `APP_URL` | Domain change |
| `STORE_NOTIFY_EMAIL` | Ops inbox change |
| `PAYMENT_PROVIDER` | Switching mock ↔ real provider |
| `PAYMENT_WEBHOOK_SECRET` | Provider webhook secret rotate |
| `MOCK_WEBHOOK_SECRET` | Mock HMAC rotate |

Platform-managed (confirm after project restore; rotate via Supabase API settings):  
`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY` / `SUPABASE_PUBLISHABLE_KEY`.

### Supabase Dashboard

- **Database password** — Settings → Database; then update GitHub `DATABASE_URL`.
- **JWT / API keys** — Settings → API; update Vercel `VITE_SUPABASE_PUBLISHABLE_KEY` and any local `.env`.
- **Service role** — never put in `VITE_*` or the browser; only Edge / server.

### Sentry / UptimeRobot / Resend

- Sentry: Project Settings → Client Keys (DSN) → rotate → update `VITE_SENTRY_DSN`.
- UptimeRobot: account password / API key in their UI (not stored in this repo).
- Resend: API Keys → create new → set `RESEND_API_KEY` → delete old key.
