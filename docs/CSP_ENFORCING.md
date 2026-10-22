# Enforcing Content-Security-Policy

Report-Only stays on until you are ready. Product pages no longer use an inline `application/ld+json` script (schema.org Microdata instead), so `script-src 'self'` is viable.

## One-line switch

In `vercel.json`, rename the header key:

```text
Content-Security-Policy-Report-Only  →  Content-Security-Policy
```

Redeploy Vercel after the change.

## Enforcing header value (copy into `value`)

```text
default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; upgrade-insecure-requests; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: blob: https://abjzzbqnhutzklvwgftu.supabase.co; connect-src 'self' https://abjzzbqnhutzklvwgftu.supabase.co wss://abjzzbqnhutzklvwgftu.supabase.co https://*.ingest.sentry.io https://*.sentry.io; frame-src 'none'
```

Compared to Report-Only today: same allowlists, plus `upgrade-insecure-requests`. Supabase host is the current project (`abjzzbqnhutzklvwgftu`). Sentry ingest hosts stay allowed on `connect-src`.

## Before you switch

1. Deploy with Report-Only for a few days and check browser console / CSP reports for blocked scripts, images, or XHR.
2. Confirm product pages, checkout, admin image upload, and Sentry still work.
3. If you change Supabase project ref, update both `img-src` and `connect-src` hosts in Report-Only and in this enforcing string.
