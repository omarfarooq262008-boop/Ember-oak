# Launch checklist

Pre-launch status for a solo owner. See also [PLACEHOLDERS.md](./PLACEHOLDERS.md), [CSP_ENFORCING.md](./CSP_ENFORCING.md), [RUNBOOK.md](./RUNBOOK.md).

## What’s done

- [x] Storefront + admin on Vite/React; catalog/checkout via Supabase
- [x] Edge Functions for order, discount, contact, newsletter, track, payments, health, refund, email
- [x] Rate limits on Edge Functions; honeypots + min fill time on contact and newsletter
- [x] Admin routes and `/sentry-test` behind `AdminGate` + `noindex`
- [x] `/mock-checkout` `noindex`; production build returns 404 unless `VITE_PAYMENT_PROVIDER=mock`
- [x] Mock card flow refused server-side when `PAYMENT_PROVIDER` ≠ `mock`
- [x] CSP **Report-Only** (product structured data is Microdata — no inline JSON-LD script)
- [x] Sentry client init (optional DSN); PII scrubbing
- [x] Health function + `/status`; monitoring notes in [MONITORING.md](./MONITORING.md)
- [x] Indexes migration `20260322000002_indexes.sql`; list pagination
- [x] Weekly DB backup workflow (needs `DATABASE_URL` secret verified)
- [x] robots.txt / sitemap.xml generated from `VITE_SITE_URL`; canonical via `Seo` `url`
- [x] No service role / secrets in `VITE_*` (only URL, publishable key, site URL, Sentry DSN, optional payment provider mirror)

## What’s blocked (must finish before real money)

| Blocker | Action |
|---------|--------|
| **Domain** | Point custom domain on Vercel; set `VITE_SITE_URL` / `VITE_APP_URL` / Edge `APP_URL` |
| **Resend** | Verify sending domain; set `RESEND_API_KEY`, `EMAIL_FROM`, `STORE_NOTIFY_EMAIL` |
| **Real payment provider** | Implement provider in `_shared/payments.ts`; set `PAYMENT_PROVIDER` + webhook secret; clear `VITE_PAYMENT_PROVIDER=mock` |
| **Legal review** | Replace drafts in Privacy/Terms; set `store.legal.needsLegalReview` to `false`; real company name |
| **Placeholders** | Replace everything in [PLACEHOLDERS.md](./PLACEHOLDERS.md) (`store.ts` + Admin contact settings) |
| **CSP enforce** | After clean Report-Only period, follow [CSP_ENFORCING.md](./CSP_ENFORCING.md) |
| **Backups verified** | Manual backup run + download artifact; offline copy of `product-images` |

## Edge Functions — JWT setting

All listed in `supabase/config.toml` with **`verify_jwt = false`** (auth done inside the function where needed):

| Function | verify_jwt | Notes |
|----------|------------|--------|
| `create-order` | false | Optional user JWT; rate-limited |
| `validate-discount` | false | Rate-limited |
| `submit-contact` | false | Honeypot + min time + rate limit |
| `subscribe-newsletter` | false | Honeypot + min time + rate limit |
| `track-order` | false | Rate-limited |
| `payment-webhook` | false | Signature auth |
| `mock-sign-payment` | false | Mock-only + rate limit |
| `health` | false | Public GET/HEAD/POST |
| `admin-refund` | false | Requires admin Bearer |
| `send-order-email` | false | Admin or service role Bearer |

## Forms — rate limits & honeypots

| Form | Rate limit | Honeypot / min fill time |
|------|------------|---------------------------|
| Contact | Yes | Yes (`website` + `formStartedAt`) |
| Newsletter (footer + home) | Yes | Yes |
| Checkout / create-order | Yes | No honeypot (rely on rate limit + idempotency) |
| Track order | Yes | No honeypot |
| Discount validate | Yes | N/A |
| Mock sign payment | Yes | N/A |

## Manual test script

Run on **desktop and phone**. Use a test inbox. Prefer a staging project if possible.

### Catalog & account

1. Home → shop → filter/sort → product → add to cart → cart drawer + cart page  
2. Search finds a known product  
3. Sign up / log in; save address; wishlist toggle  

### Orders — payment methods

4. **COD** — checkout COD → confirmation → email → Admin order shows awaiting fulfilment  
5. **Bank transfer** — checkout bank → confirmation shows **your** bank details (not placeholders) → mark paid in Admin  
6. **Card mock success** — only if `PAYMENT_PROVIDER=mock` and `VITE_PAYMENT_PROVIDER=mock`: pay → mock checkout → Paid → confirmation → email  
7. **Card mock failure** — Fail / Cancel on mock page → order stays pending/failed; customer can retry or contact  

### Discounts & tracking

8. Apply valid code (`WELCOME10` etc. if still seeded) and an invalid code  
9. Track order with order number + email; wrong email fails softly  

### Admin

10. Create/edit product + upload image; adjust inventory; approve/reject review  
11. Change order status (packed → shipped with tracking); confirm shipped email  
12. **Cancel** an unpaid/open order; confirm stock behaviour  
13. **Refund** a paid mock/card order via admin refund; confirm email; stock not auto-restored on refund  

### Safety net

14. `/status` healthy; UptimeRobot green  
15. Production: `/mock-checkout` is 404 when not mock; `/admin` and `/sentry-test` require admin  
16. View source / DevTools: no service role key; CSP Report-Only present  

## After launch day

- [ ] Enforce CSP per [CSP_ENFORCING.md](./CSP_ENFORCING.md)  
- [ ] Dependabot PRs monthly  
- [ ] Confirm weekly backup artifact appears in GitHub Actions  
