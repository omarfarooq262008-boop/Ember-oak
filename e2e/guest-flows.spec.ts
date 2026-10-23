import { test, expect } from '@playwright/test'
import {
  attachIssueCollectors,
  formatIssues,
  QA,
  recordCheck,
  recordOrder,
  saveFailureShot,
  viewportLabel,
} from './helpers/harness'
import {
  addFirstAvailableProduct,
  applyDiscount,
  captureOrderNumber,
  choosePayment,
  dismissNoise,
  ensureCartOverMin,
  fillCardFieldsIfPresent,
  fillCheckoutBasics,
  placeOrder,
} from './helpers/storefront'

async function passOrFail(
  page: import('@playwright/test').Page,
  checkId: string,
  name: string,
  vp: 'desktop' | 'mobile',
  run: () => Promise<void>,
) {
  const collectors = attachIssueCollectors(page)
  try {
    await run()
    await collectors.measureOverflow()
    const issueText = formatIssues(collectors.issues)
    const hard =
      collectors.issues.consoleErrors.length > 0 ||
      collectors.issues.failedRequests.length > 0 ||
      collectors.issues.overflowX
    if (hard) {
      const shot = await saveFailureShot(page, checkId)
      recordCheck({
        id: checkId,
        name,
        viewport: vp,
        status: 'FAIL',
        error: issueText,
        screenshot: shot,
      })
      expect(hard, issueText).toBe(false)
    } else {
      recordCheck({ id: checkId, name, viewport: vp, status: 'PASS' })
    }
  } catch (err) {
    const shot = await saveFailureShot(page, checkId)
    recordCheck({
      id: checkId,
      name,
      viewport: vp,
      status: 'FAIL',
      error: err instanceof Error ? err.message : String(err),
      screenshot: shot,
    })
    throw err
  } finally {
    collectors.detach()
  }
}

test.describe('Guest flows', () => {
  test('cart quantity + discounts', async ({ page }, testInfo) => {
    const vp = viewportLabel(testInfo.project.name)
    // Only run heavy cart assertions once on desktop to limit order side-effects on mobile dup
    test.skip(vp === 'mobile', 'discount/cart assertions covered on desktop')

    await passOrFail(page, 'flow-cart-discounts', 'Cart quantity and discount codes', vp, async () => {
      await page.goto('/')
      await page.evaluate(() => localStorage.clear())
      await addFirstAvailableProduct(page)

      // Change quantity on the cart page
      const qty = page.locator('#main-content').getByText(/^[0-9]+$/).first()
      const beforeQty = (await qty.textContent())?.trim() ?? '1'
      const inc = page.getByRole('button', { name: /increase quantity/i }).first()
      await expect(inc).toBeEnabled()
      await inc.click()
      await expect(qty).not.toHaveText(beforeQty, { timeout: 10_000 })

      // Build subtotal over WELCOME10 minimum (PKR 3,000)
      await ensureCartOverMin(page, 3000)
      await page.goto('/cart')
      await expect(page.getByText(/cart is empty/i)).toHaveCount(0)
      const beforeUrl = page.url()

      await applyDiscount(page, 'WELCOME10')
      await expect(page.getByText(/WELCOME10/i).first()).toBeVisible({
        timeout: 20_000,
      })
      await expect(page.getByText(/you save|−PKR|-PKR|applied/i).first()).toBeVisible()
      expect(page.url()).toBe(beforeUrl)

      // Remove discount (not line items)
      await page
        .locator('#main-content')
        .getByRole('button', { name: /^remove$/i })
        .first()
        .click()
      await expect(page.getByPlaceholder(/enter code/i)).toBeVisible({
        timeout: 10_000,
      })

      await applyDiscount(page, 'NOTAREALCODE999')
      await expect(
        page
          .locator('#main-content')
          .getByText(
            /invalid|not found|unrecognised|unrecognized|unknown|no longer|doesn’t|doesn't|couldn’t|couldn't/i,
          )
          .first(),
      ).toBeVisible({ timeout: 15_000 })

      // Under-minimum: single line at qty 1 (do not decrease to 0 — that removes the line)
      await page.goto('/')
      await page.evaluate(() => localStorage.clear())
      await addFirstAvailableProduct(page)
      await page.goto('/cart')
      await expect(page.getByText(/cart is empty/i)).toHaveCount(0)
      await applyDiscount(page, 'WELCOME10')
      await expect(
        page.getByText(/minimum|min(imum)? spend|add .+ more|needs a minimum/i),
      ).toBeVisible({ timeout: 15_000 })
    })
  })

  test('scroll to top when opening product from mid-shop', async ({ page }, testInfo) => {
    const vp = viewportLabel(testInfo.project.name)
    test.skip(vp === 'mobile', 'covered on desktop')
    await passOrFail(page, 'flow-scroll-top', 'Scroll to top on product open', vp, async () => {
      await page.goto('/shop')
      await dismissNoise(page)
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
      await page.waitForTimeout(300)
      const mid = await page.evaluate(() => window.scrollY)
      expect(mid).toBeGreaterThan(100)
      const links = page.locator('a[href^="/product/"]')
      const count = await links.count()
      await links.nth(Math.min(4, count - 1)).click()
      await page.waitForURL(/\/product\//)
      await page.waitForTimeout(500)
      const top = await page.evaluate(() => window.scrollY)
      expect(top).toBeLessThan(40)
    })
  })

  test('COD checkout to confirmation', async ({ page }, testInfo) => {
    const vp = viewportLabel(testInfo.project.name)
    test.skip(vp === 'mobile', 'checkout flows on desktop to limit order spam')
    await passOrFail(page, 'flow-cod', 'COD checkout → confirmation', vp, async () => {
      await page.goto('/')
      await page.evaluate(() => localStorage.clear())
      await addFirstAvailableProduct(page)
      await fillCheckoutBasics(page)
      await choosePayment(page, 'cod')
      await placeOrder(page)
      await page.waitForURL(/order-confirmation/, { timeout: 60_000 })
      const order = await captureOrderNumber(page)
      expect(order).toBeTruthy()
      await expect(page.getByText(/thank|confirmed|order/i).first()).toBeVisible()
    })
  })

  test('bank transfer checkout', async ({ page }, testInfo) => {
    const vp = viewportLabel(testInfo.project.name)
    test.skip(vp === 'mobile', 'checkout flows on desktop')
    await passOrFail(page, 'flow-bank', 'Bank transfer checkout', vp, async () => {
      await page.goto('/')
      await page.evaluate(() => localStorage.clear())
      await addFirstAvailableProduct(page)
      await fillCheckoutBasics(page)
      await choosePayment(page, 'bank_transfer')
      await expect(page.getByText(/iban|account|bank/i).first()).toBeVisible()
      await placeOrder(page)
      await page.waitForURL(/order-confirmation/, { timeout: 60_000 })
      const order = await captureOrderNumber(page)
      expect(order).toBeTruthy()
    })
  })

  test('card mock success', async ({ page }, testInfo) => {
    const vp = viewportLabel(testInfo.project.name)
    test.skip(vp === 'mobile', 'checkout flows on desktop')
    await passOrFail(page, 'flow-card-success', 'Card mock payment success', vp, async () => {
      await page.goto('/')
      await page.evaluate(() => localStorage.clear())
      await addFirstAvailableProduct(page)
      await fillCheckoutBasics(page)
      await choosePayment(page, 'card')
      await fillCardFieldsIfPresent(page)
      await placeOrder(page)
      await page.waitForURL(/mock-checkout/, { timeout: 60_000 })
      const order = await captureOrderNumber(page)
      expect(order).toBeTruthy()
      await page.getByRole('button', { name: /pay successfully/i }).click()
      await page.waitForURL(/order-confirmation/, { timeout: 60_000 })
      await expect(page.getByText(/thank|confirmed|paid|order/i).first()).toBeVisible()
    })
  })

  test('card mock failure', async ({ page }, testInfo) => {
    const vp = viewportLabel(testInfo.project.name)
    test.skip(vp === 'mobile', 'checkout flows on desktop')
    await passOrFail(page, 'flow-card-fail', 'Card mock payment failure', vp, async () => {
      await page.goto('/')
      await page.evaluate(() => localStorage.clear())
      await addFirstAvailableProduct(page)
      await fillCheckoutBasics(page)
      await choosePayment(page, 'card')
      await fillCardFieldsIfPresent(page)
      await placeOrder(page)
      // Prefer mock-checkout; surface checkout errors if create-order fails
      try {
        await page.waitForURL(/mock-checkout/, { timeout: 60_000 })
      } catch {
        const alert = page.getByRole('alert')
        if (await alert.isVisible().catch(() => false)) {
          throw new Error(`Checkout error: ${await alert.innerText()}`)
        }
        throw new Error(`Expected mock-checkout, landed on ${page.url()}`)
      }
      await captureOrderNumber(page)
      await page.getByRole('button', { name: /payment fails/i }).click()
      await page.waitForURL(/checkout|payment=failed|payment=/, { timeout: 60_000 })
      await expect(
        page.getByText(/fail|cancelled|try again|payment/i).first(),
      ).toBeVisible({ timeout: 15_000 })
    })
  })

  test('order tracking', async ({ page }, testInfo) => {
    const vp = viewportLabel(testInfo.project.name)
    test.skip(vp === 'mobile', 'tracking on desktop')
    await passOrFail(page, 'flow-track', 'Order tracking by number + email', vp, async () => {
      // Create a fresh COD order to track
      await page.goto('/')
      await page.evaluate(() => localStorage.clear())
      await addFirstAvailableProduct(page)
      await fillCheckoutBasics(page)
      await choosePayment(page, 'cod')
      await placeOrder(page)
      await page.waitForURL(/order-confirmation/, { timeout: 60_000 })
      const order = await captureOrderNumber(page)
      expect(order).toBeTruthy()

      await page.goto('/track-order')
      await page.locator('#order-number').fill(order!)
      await page.locator('#track-email').fill(QA.email)
      await page.getByRole('button', { name: /find order|looking up/i }).click()
      await expect(page.getByText(new RegExp(order!, 'i')).first()).toBeVisible({
        timeout: 20_000,
      })
    })
  })

  test('newsletter signup', async ({ page }, testInfo) => {
    const vp = viewportLabel(testInfo.project.name)
    await passOrFail(page, `flow-newsletter-${vp}`, 'Newsletter signup', vp, async () => {
      await page.goto('/')
      await dismissNoise(page)
      const footer = page.getByRole('contentinfo')
      const email = footer.getByLabel(/email for newsletter/i)
      await email.scrollIntoViewIfNeeded()
      await email.fill(`qa-news-${Date.now()}@example.com`)
      await footer.getByRole('button', { name: /^subscribe$/i }).click()
      await expect(
        footer.getByText(/subscribed|thank|already|success|welcome/i).first(),
      ).toBeVisible({ timeout: 15_000 })
    })
  })

  test('contact form', async ({ page }, testInfo) => {
    const vp = viewportLabel(testInfo.project.name)
    test.skip(vp === 'mobile', 'contact on desktop')
    await passOrFail(page, 'flow-contact', 'Contact form submit', vp, async () => {
      await page.goto('/contact')
      await dismissNoise(page)
      await page.getByLabel(/^name$/i).fill(QA.name)
      await page.getByLabel(/^email$/i).fill(QA.email)
      await page.getByLabel(/phone/i).fill(QA.phone)
      await page.getByLabel(/^message$/i).fill(
        'QA automated contact message for Ember & Oak demo verification.',
      )
      // Honeypot should stay empty; wait past minimum fill time if enforced
      await page.waitForTimeout(2500)
      await page.getByRole('button', { name: /send message/i }).click()
      await expect(
        page.getByText(/sent|reply|thank|1–2|1-2 working/i).first(),
      ).toBeVisible({ timeout: 20_000 })
    })
  })
})
