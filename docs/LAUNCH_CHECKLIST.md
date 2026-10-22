# Launch checklist

Still-open items before calling the store “live” for real customers. Check boxes as you finish them.

## Domain and email

- [ ] Custom domain on Vercel (`emberandoak.pk` or final domain) with HTTPS
- [ ] `VITE_SITE_URL` / `VITE_APP_URL` match the live domain
- [ ] Resend domain verified (SPF/DKIM); `EMAIL_FROM` uses that domain
- [ ] `STORE_NOTIFY_EMAIL` goes to an inbox you read daily
- [ ] Place a test order and receive the customer email + any admin notify

## Payments

- [ ] Replace mock provider with a real payment provider
- [ ] Set `PAYMENT_PROVIDER` and `PAYMENT_WEBHOOK_SECRET` for production
- [ ] Webhook URL pointed at `payment-webhook` on the live project ref
- [ ] Successful test charge + failed/cancelled path verified
- [ ] Refund path tested (`admin-refund`) on a small amount

## Legal and trust

- [ ] Privacy policy page live and linked in footer
- [ ] Terms / returns / shipping pages live and accurate for Pakistan
- [ ] Contact details match `settings` / store config

## Security

- [ ] CSP currently Report-Only — review reports, then **enforce** when clean
- [ ] No service role key in any `VITE_*` or client bundle
- [ ] Admin accounts limited; strong passwords / MFA on Supabase + Vercel + GitHub
- [ ] Rate limits confirmed on contact, checkout, and auth-sensitive routes

## Data and backups

- [ ] Migration `20260322000002_indexes.sql` applied on production
- [ ] GitHub secret `DATABASE_URL` set; **Database Backup** workflow run once manually and artifact downloaded
- [ ] `product-images` bucket copied to offline/cold storage at least once (see [RESTORE.md](./RESTORE.md))
- [ ] You have walked through [RESTORE.md](./RESTORE.md) enough to trust it (or practiced on a throwaway project)

## Monitoring

- [ ] UptimeRobot monitors: home, `/status`, health function (new project ref)
- [ ] Sentry `VITE_SENTRY_DSN` set on Vercel Production; test event from `/sentry-test`
- [ ] Alert email reaches you for downtime and Sentry issues

## Go-live smoke tests

- [ ] Browse shop / search / product / add to cart on mobile and desktop
- [ ] Guest checkout + logged-in checkout
- [ ] Track order by order number + email
- [ ] Admin: product create with image, inventory adjust, order status change, review approve
- [ ] `/status` shows healthy after deploy

## Optional polish

- [ ] Dependabot PRs reviewed monthly
- [ ] Announcement bar / delivery settings correct for launch week
- [ ] Analytics (if any) with cookie notice if required
