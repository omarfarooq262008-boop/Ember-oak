# QA Report — Ember & Oak live demo

Target: https://ember-oak-beige.vercel.app
Generated: 2026-10-23T19:47:38.640Z

Summary: **48 PASS**, **0 FAIL**, **5 MANUAL**, **0 SKIP** (53 checks)

## Checks

| Check | Viewport | Status | Error / notes | Screenshot |
|---|---|---|---|---|
| Admin cancel order | n/a | **MANUAL** |  |  |
| Admin create product | n/a | **MANUAL** |  |  |
| Admin login | n/a | **MANUAL** | Set TEST_ADMIN_EMAIL and TEST_ADMIN_PASSWORD in .env.test to automate |  |
| Admin refund order | n/a | **MANUAL** |  |  |
| Admin ship order | n/a | **MANUAL** |  |  |
| Bank transfer checkout | desktop | **PASS** |  |  |
| Card mock payment failure | desktop | **PASS** |  |  |
| Card mock payment success | desktop | **PASS** |  |  |
| Cart quantity and discount codes | desktop | **PASS** |  |  |
| COD checkout → confirmation | desktop | **PASS** |  |  |
| Contact form submit | desktop | **PASS** |  |  |
| Newsletter signup | desktop | **PASS** |  |  |
| Newsletter signup | mobile | **PASS** |  |  |
| Scroll to top on product open | desktop | **PASS** |  |  |
| Order tracking by number + email | desktop | **PASS** |  |  |
| Page /this-page-does-not-exist-qa-404 | desktop | **PASS** |  |  |
| Page /this-page-does-not-exist-qa-404 | mobile | **PASS** |  |  |
| Page /about-demo | desktop | **PASS** |  |  |
| Page /about-demo | mobile | **PASS** |  |  |
| Page /admin | desktop | **PASS** |  |  |
| Page /admin | mobile | **PASS** |  |  |
| Page /cart | desktop | **PASS** |  |  |
| Page /cart | mobile | **PASS** |  |  |
| Page /checkout | desktop | **PASS** |  |  |
| Page /checkout | mobile | **PASS** |  |  |
| Page /contact | desktop | **PASS** |  |  |
| Page /contact | mobile | **PASS** |  |  |
| Page /faq | desktop | **PASS** |  |  |
| Page /faq | mobile | **PASS** |  |  |
| Page / | desktop | **PASS** |  |  |
| Page / | mobile | **PASS** |  |  |
| Page /privacy | desktop | **PASS** |  |  |
| Page /privacy | mobile | **PASS** |  |  |
| Page product detail | desktop | **PASS** |  |  |
| Page product detail | mobile | **PASS** |  |  |
| Page /returns | desktop | **PASS** |  |  |
| Page /returns | mobile | **PASS** |  |  |
| Page /search?q=candlle | desktop | **PASS** |  |  |
| Page /search?q=candlle | mobile | **PASS** |  |  |
| Page /sentry-test | desktop | **PASS** |  |  |
| Page /sentry-test | mobile | **PASS** |  |  |
| Page /shipping | desktop | **PASS** |  |  |
| Page /shipping | mobile | **PASS** |  |  |
| Page /shop | desktop | **PASS** |  |  |
| Page /shop?sort=price-asc&inStock=1 | desktop | **PASS** |  |  |
| Page /shop?sort=price-asc&inStock=1 | mobile | **PASS** |  |  |
| Page /shop | mobile | **PASS** |  |  |
| Page /status | desktop | **PASS** |  |  |
| Page /status | mobile | **PASS** |  |  |
| Page /terms | desktop | **PASS** |  |  |
| Page /terms | mobile | **PASS** |  |  |
| Page /track-order | desktop | **PASS** |  |  |
| Page /track-order | mobile | **PASS** |  |  |

## Orders created (delete afterward)

- `EO-C654D4120515475B86A542B7D2B958EE`
- `EO-0C4C491EAA2F4818A5697B84D5CE9E45`
- `EO-8FEFBEE4CFB241B3B78F8B2395704CF3`
- `EO-A67AC6912D6D457EB3016FB5068D8346`
- `EO-F6B57A014A774DF8A3CC4BF72DDAB7E2`
- `EO-DA7A434D75D348A59D109590B3F3A1FA`
- `EO-87A2D5408B7A42D79EFEDD9471FB0F2F`
- `EO-3602BCFB82314040B8395F2B632A5D7B`
- `EO-8B3E32D72A014CCBB27395FBB9B0A05D`
- `EO-2308846E052C4B6FB49DB6047F9CBABA`
- `EO-EB676473ED824E84BD3B792628ECEB51`
- `EO-B942A1F4D7AE4636ACCCEABA0EC22487`

## Lighthouse (mobile)

| URL | Performance | Accessibility | Best Practices | SEO |
|---|---:|---:|---:|---:|
| https://ember-oak-beige.vercel.app/ | 75 | 97 | 100 | 100 |
| https://ember-oak-beige.vercel.app/shop | 62 | 95 | 100 | 100 |
| https://ember-oak-beige.vercel.app/product/reed-diffuser-amber | 57 | 95 | 100 | 100 |

## Admin

Admin flows listed as **MANUAL** — set `TEST_ADMIN_EMAIL` and `TEST_ADMIN_PASSWORD` in `.env.test` to automate.
