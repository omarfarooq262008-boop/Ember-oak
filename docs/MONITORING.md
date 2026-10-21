# Monitoring setup (Ember & Oak)

Click-by-click checklist for uptime, errors, deploys, and Supabase usage.

**URLs you will need**

| What | URL |
|------|-----|
| Store home | `https://emberandoak.pk/` (or your Vercel production URL) |
| Status page | `https://emberandoak.pk/status` |
| Health function | `https://ayxpzhmwmfukskqfgglb.supabase.co/functions/v1/health` |

Alert email: use your ops inbox (for example the address in `STORE_NOTIFY_EMAIL`).

---

## 1. UptimeRobot (every 5 minutes, email alerts)

1. Sign in at [https://uptimerobot.com](https://uptimerobot.com) → **Add New Monitor**.
2. Create **three** HTTP(s) monitors with:
   - **Monitoring Interval:** 5 minutes  
   - **Alert Contacts:** your email (add under **My Settings → Alert Contacts** first if needed)  
   - **Monitor Type:** HTTP(s)

### Monitor A — Site home

1. **Friendly Name:** `Ember & Oak — home`
2. **URL:** `https://emberandoak.pk/`
3. **Keyword** (optional): leave blank, or use a unique phrase from the homepage.
4. Save.

### Monitor B — Status page

1. **Friendly Name:** `Ember & Oak — /status`
2. **URL:** `https://emberandoak.pk/status`
3. Save.  
   The page shows “All systems working” when the health function is OK.

### Monitor C — Health Edge Function

1. **Friendly Name:** `Ember & Oak — health function`
2. **URL:** `https://ayxpzhmwmfukskqfgglb.supabase.co/functions/v1/health`
3. **Monitor Type:** HTTP(s) — method **GET** (HEAD also works; no API key or Authorization header needed).
4. Expect **HTTP 200** and a body like `{"status":"ok","time":"..."}`. Degraded DB returns **503** with `{"status":"degraded","time":"..."}`.
5. Save.

UptimeRobot will email you when any monitor goes down or recovers.

---

## 2. Sentry alert rules

1. Open your project at [https://sentry.io](https://sentry.io) → **Alerts → Create Alert**.

### Rule A — New issue

1. **Alert type:** Issues  
2. **Conditions:** `A new issue is created`  
3. **Actions:** Send email (or Slack) to your ops contact  
4. **Name:** `New issue` → Save

### Rule B — Spike in errors

1. **Alert type:** Metric / Issues (frequency)  
2. **Conditions:** Number of events in an issue is above a threshold (for example **> 20** in **1 hour**) — or use “An issue is seen more than 100 times in 1h” if that UI is available  
3. **Actions:** Email  
4. **Name:** `Error spike` → Save

### Rule C — Any issue in checkout

1. **Alert type:** Issues  
2. **Filter / conditions:**
   - Tag `route` **equals** `/checkout`  
     **OR** tag `order_stage` **is set** (any of `checkout_form`, `placing_order`, `redirecting_to_payment`, `mock_payment`, `order_confirmation`)  
3. **When:** A new issue is created **or** an issue changes state from resolved to unresolved  
4. **Actions:** Email (high priority if available)  
5. **Name:** `Checkout errors` → Save

The app sets lightweight tags `route` and `order_stage` (no personal data). Confirm tags appear on a test event from `/sentry-test` after deploying with `VITE_SENTRY_DSN`.

---

## 3. Vercel deployment failure notifications

1. Open the project in [https://vercel.com](https://vercel.com) → **Settings → Notifications** (or **Integrations → Slack / email** depending on plan).
2. Enable notifications for **Deployment Failed** (and optionally **Deployment Ready** for production only).
3. Add your email (or Slack webhook).
4. Optionally under **Git → Deploy Hooks / Ignored Build Step** leave defaults; failures on `main` should notify you.
5. Trigger a dry run: open **Deployments**, confirm a failed deploy emails you (or use Vercel’s notification test if offered).

---

## 4. Supabase usage alerts

1. Open [https://supabase.com/dashboard](https://supabase.com/dashboard) → project **Ember & Oak** (`ayxpzhmwmfukskqfgglb`).
2. Go to **Organization Settings → Billing** (or **Usage**).
3. Set / confirm spend caps if available for your plan.
4. Go to **Project Settings → Notifications** (or organization **Email notifications**).
5. Enable alerts for:
   - Approaching **database size** / disk limits  
   - Approaching **egress** / bandwidth limits  
   - Approaching **Edge Function** invocations or CPU (if listed)  
6. Ensure the organization owner email is correct so quota warnings arrive before hard limits.

Also bookmark **Reports** / **Edge Functions** logs for spike investigation after a `rate_limit_hit` flood on the admin Events page.

---

## Related in-app surfaces

- Public status: `/status` (noindex)  
- Health probe: Edge Function `health`  
- Ops event log: Admin → **Events** (filters for orders, payment failed, email failed, rate limits, admin actions)  
- Sentry smoke test (admins only): `/sentry-test`
