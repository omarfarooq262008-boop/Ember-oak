# Content-Security-Policy (demo)

## Current demo posture

The portfolio deploy at `https://ember-oak-beige.vercel.app` **does not send a CSP header** (neither enforcing nor Report-Only).

**Why:** After the prelaunch audit, Report-Only CSP still logged browser console noise (Sentry ingest host variants, Vite chunk loads on preview, occasional third-party font timing). For a mock-payment demo, that noise looked like “random errors.” Removing CSP for the demo stops the spam without blocking checkout or Supabase.

Other security headers remain in `vercel.json`: `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `X-Frame-Options`, `Strict-Transport-Security`.

SPA routes (`/shop`, `/product/:slug`, `/admin`, `/mock-checkout`, `/payment/*`, `/about-demo`, `/status`, etc.) are covered by the catch-all rewrite to `/index.html` (paths without a file extension).

## Re-enable Report-Only (staging)

Add this header object under the `"/(.*)"` headers array in `vercel.json`:

```json
{
  "key": "Content-Security-Policy-Report-Only",
  "value": "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: blob: https://abjzzbqnhutzklvwgftu.supabase.co; connect-src 'self' https://abjzzbqnhutzklvwgftu.supabase.co wss://abjzzbqnhutzklvwgftu.supabase.co https://*.ingest.sentry.io https://*.sentry.io; frame-src 'none'"
}
```

Watch the console for a few days. Fix real violations before enforcing.

## Enforcing header (production cutover)

Rename the key to `Content-Security-Policy` and prefer this value (adds `upgrade-insecure-requests`):

```text
default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; upgrade-insecure-requests; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: blob: https://abjzzbqnhutzklvwgftu.supabase.co; connect-src 'self' https://abjzzbqnhutzklvwgftu.supabase.co wss://abjzzbqnhutzklvwgftu.supabase.co https://*.ingest.sentry.io https://*.sentry.io; frame-src 'none'
```

## Before you switch on a real storefront

1. Deploy with Report-Only and clear console CSP noise.
2. Confirm product pages, checkout, admin image upload, and Sentry.
3. If the Supabase project ref changes, update `img-src` and `connect-src`.
