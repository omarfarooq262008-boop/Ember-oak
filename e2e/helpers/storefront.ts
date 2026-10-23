import type { Page } from '@playwright/test'
import { expect } from '@playwright/test'

import { QA, recordOrder } from './harness'

/** Dismiss announcement bar if present so it doesn't skew layout checks. */
export async function dismissNoise(page: Page) {
  const btn = page.getByRole('button', { name: /dismiss|close announcement/i })
  if (await btn.isVisible().catch(() => false)) {
    await btn.click().catch(() => undefined)
  }
}

export async function selectRadixOption(
  page: Page,
  trigger: ReturnType<Page['locator']>,
  optionText: string,
) {
  await trigger.click()
  await page.getByRole('option', { name: optionText, exact: true }).click()
}

export async function addFirstAvailableProduct(page: Page) {
  // Prefer cheaper in-stock items — high-price SKUs often have stock=1 and get depleted mid-suite.
  await page.goto('/shop?inStock=1&sort=price-asc')
  await dismissNoise(page)
  await page.waitForLoadState('networkidle').catch(() => undefined)
  const links = page.locator('a[href^="/product/"]')
  await expect(links.first()).toBeVisible({ timeout: 30_000 })
  const count = Math.min(await links.count(), 10)

  let added = false
  for (let i = 0; i < count; i++) {
    await page.goto('/shop?inStock=1&sort=price-asc')
    await page.waitForTimeout(400)
    const fresh = page.locator('a[href^="/product/"]')
    await fresh.nth(i).click()
    await page.waitForURL(/\/product\//)
    await dismissNoise(page)

    // Select first available option in each attribute group if present
    const optionGroups = page.locator('[role="group"]')
    const groups = await optionGroups.count()
    for (let g = 0; g < groups; g++) {
      const btn = optionGroups.nth(g).locator('button:not([disabled])').first()
      if (await btn.isVisible().catch(() => false)) {
        const pressed = await btn.getAttribute('aria-pressed')
        if (pressed !== 'true') await btn.click()
      }
    }

    const add = page.getByRole('button', { name: /add to cart/i }).first()
    await expect(add).toBeVisible({ timeout: 20_000 })
    const enabled = await add.isEnabled().catch(() => false)
    if (!enabled) continue
    await add.click()
    await page.waitForTimeout(600)
    added = true
    break
  }
  if (!added) throw new Error('No in-stock product with enabled Add to cart found')

  await page.goto('/cart')
  await expect(page.getByRole('heading', { name: /your cart/i })).toBeVisible({
    timeout: 20_000,
  })
  await expect(page.getByText(/cart is empty/i)).toHaveCount(0)
}

export async function ensureCartOverMin(page: Page, minPkr = 3000) {
  await page.goto('/cart')
  await dismissNoise(page)
  await expect(page.getByRole('heading', { name: /your cart/i })).toBeVisible()
  if (await page.getByText(/cart is empty/i).isVisible().catch(() => false)) {
    throw new Error('Cart is empty — cannot reach minimum for discount')
  }

  for (let i = 0; i < 10; i++) {
    const body = await page.locator('body').innerText()
    const amounts = [...body.matchAll(/PKR\s*([\d,]+)/g)].map((m) =>
      Number(m[1].replace(/,/g, '')),
    )
    // Prefer the "Subtotal" line when present
    const subtotalMatch = body.match(/Subtotal\s*PKR\s*([\d,]+)/i)
    const subtotal = subtotalMatch
      ? Number(subtotalMatch[1].replace(/,/g, ''))
      : Math.max(0, ...amounts)
    if (subtotal >= minPkr) {
      await page.goto('/cart')
      return
    }
    const inc = page.getByRole('button', { name: /increase quantity/i }).first()
    if (await inc.isEnabled().catch(() => false)) {
      await inc.click()
      await page.waitForTimeout(350)
      continue
    }
    // Add another in-stock product
    await page.goto('/shop?inStock=1&sort=price-desc')
    await page.waitForTimeout(500)
    const links = page.locator('a[href^="/product/"]')
    const count = await links.count()
    if (count === 0) break
    await links.nth(Math.min(i, count - 1)).click()
    await page.waitForURL(/\/product\//)
    const add = page.getByRole('button', { name: /add to cart/i }).first()
    await expect(add).toBeEnabled({ timeout: 30_000 })
    await add.click()
    await page.goto('/cart')
  }
  await page.goto('/cart')
}

export async function applyDiscount(page: Page, code: string) {
  await page.goto('/cart')
  await dismissNoise(page)
  await expect(page.getByText(/cart is empty/i)).toHaveCount(0)
  const input = page
    .getByLabel(/discount code/i)
    .or(page.getByPlaceholder(/enter code/i))
    .first()
  await expect(input).toBeVisible({ timeout: 20_000 })
  await input.fill(code)
  await page.getByRole('button', { name: /^apply$/i }).first().click()
}

export async function fillCheckoutBasics(page: Page) {
  await page.goto('/checkout')
  await dismissNoise(page)
  await page.getByLabel(/^email$/i).fill(QA.email)
  await page.getByLabel(/^phone$/i).fill(QA.phone)
  await page.getByLabel(/full name/i).fill(QA.name)
  await page.getByLabel(/street address/i).fill(QA.address)
  await selectRadixOption(page, page.locator('#province'), QA.province)
  await selectRadixOption(page, page.locator('#city'), QA.city)
  const postal = page.getByLabel(/postal/i)
  if (await postal.isVisible().catch(() => false)) {
    await postal.fill(QA.postal)
  }
}

export async function choosePayment(page: Page, method: 'cod' | 'bank_transfer' | 'card') {
  const label =
    method === 'cod'
      ? /cash on delivery/i
      : method === 'bank_transfer'
        ? /bank transfer/i
        : /card payment/i
  await page.getByRole('radio', { name: label }).check({ force: true }).catch(async () => {
    await page.locator(`input[type="radio"][value="${method}"]`).check({ force: true })
  })
}

export async function placeOrder(page: Page) {
  const btn = page.getByRole('button', { name: /place order|pay|complete order/i }).first()
  await btn.click()
}

export async function captureOrderNumber(page: Page): Promise<string | null> {
  await page.waitForURL(/order-confirmation|mock-checkout|\/checkout/, { timeout: 60_000 })
  const url = page.url()
  const fromPath = url.match(/order-confirmation\/([^/?#]+)/)
  if (fromPath?.[1]) {
    const num = decodeURIComponent(fromPath[1])
    recordOrder(num)
    return num
  }
  const body = await page.locator('body').innerText()
  const m = body.match(/\bEO-[A-Z0-9-]+\b/i)
  if (m) {
    recordOrder(m[0])
    return m[0]
  }
  const q = new URL(url).searchParams.get('order')
  if (q) {
    recordOrder(q)
    return q
  }
  return null
}

export async function fillCardFieldsIfPresent(page: Page) {
  const cardName = page.locator('#card-name')
  if (!(await cardName.isVisible().catch(() => false))) return
  await cardName.fill(QA.name)
  await page.locator('#card-number').fill('4242424242424242')
  await page.locator('#card-expiry').fill('12/30')
  await page.locator('#card-cvc').fill('123')
}
