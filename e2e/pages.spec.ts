import { test, expect } from '@playwright/test'
import {
  attachIssueCollectors,
  formatIssues,
  recordCheck,
  saveFailureShot,
  viewportLabel,
} from './helpers/harness'
import { dismissNoise } from './helpers/storefront'

type PageDef = {
  id: string
  path: string
  expectText?: RegExp
  expect404?: boolean
}

const pages: PageDef[] = [
  { id: 'home', path: '/', expectText: /ember|shop|fragrance/i },
  { id: 'shop', path: '/shop', expectText: /shop|product|filter|category/i },
  {
    id: 'shop-filter-sort',
    path: '/shop?sort=price-asc&inStock=1',
    expectText: /shop|product|sort|filter/i,
  },
  {
    id: 'search-typo',
    path: '/search?q=candlle',
    expectText: /search|no products|match|result/i,
  },
  { id: 'cart', path: '/cart', expectText: /cart|empty|checkout/i },
  { id: 'checkout', path: '/checkout', expectText: /checkout|cart|delivery|contact/i },
  { id: 'contact', path: '/contact', expectText: /contact/i },
  { id: 'about-demo', path: '/about-demo', expectText: /demo|portfolio|ember/i },
  { id: 'status', path: '/status', expectText: /status|health|ok|degraded/i },
  { id: 'shipping', path: '/shipping', expectText: /shipping|delivery/i },
  { id: 'returns', path: '/returns', expectText: /return/i },
  { id: 'faq', path: '/faq', expectText: /faq|question/i },
  { id: 'privacy', path: '/privacy', expectText: /privacy/i },
  { id: 'terms', path: '/terms', expectText: /terms/i },
  { id: 'track-order', path: '/track-order', expectText: /track/i },
  {
    id: '404',
    path: '/this-page-does-not-exist-qa-404',
    expect404: true,
  },
  { id: 'admin-logged-out', path: '/admin', expect404: true },
  { id: 'sentry-test-logged-out', path: '/sentry-test', expect404: true },
]

test.describe('Live page health', () => {
  for (const def of pages) {
    test(`${def.id} ${def.path}`, async ({ page }, testInfo) => {
      const vp = viewportLabel(testInfo.project.name)
      const checkId = `page-${def.id}-${vp}`
      const collectors = attachIssueCollectors(page)

      try {
        const res = await page.goto(def.path, { waitUntil: 'domcontentloaded' })
        await dismissNoise(page)
        await page.waitForTimeout(800)
        await collectors.measureOverflow()

        if (def.expect404) {
          await expect(page.getByText('404')).toBeVisible({ timeout: 20_000 })
          await expect(
            page.getByRole('heading', { name: /wandered off|not found/i }),
          ).toBeVisible()
        } else if (def.expectText) {
          await expect(page.locator('body')).toContainText(def.expectText)
        }

        // Document response for HTML navigations (SPA may be 200 always)
        if (res && res.status() >= 400 && !def.expect404) {
          throw new Error(`navigation status ${res.status()}`)
        }

        const issueText = formatIssues(collectors.issues)
        // Soft: warn-only console warnings don't fail unless paired with errors/overflow/network
        const hard =
          collectors.issues.consoleErrors.length > 0 ||
          collectors.issues.failedRequests.length > 0 ||
          collectors.issues.overflowX

        if (hard) {
          const shot = await saveFailureShot(page, checkId)
          recordCheck({
            id: checkId,
            name: `Page ${def.path}`,
            viewport: vp,
            status: 'FAIL',
            error: issueText,
            screenshot: shot,
          })
          expect(hard, issueText).toBe(false)
        } else {
          recordCheck({
            id: checkId,
            name: `Page ${def.path}`,
            viewport: vp,
            status: 'PASS',
            error: issueText,
          })
        }
      } catch (err) {
        const shot = await saveFailureShot(page, checkId)
        const message = err instanceof Error ? err.message : String(err)
        const issueText = formatIssues(collectors.issues)
        recordCheck({
          id: checkId,
          name: `Page ${def.path}`,
          viewport: vp,
          status: 'FAIL',
          error: [message, issueText].filter(Boolean).join('; '),
          screenshot: shot,
        })
        throw err
      } finally {
        collectors.detach()
      }
    })
  }

  test('product page from shop', async ({ page }, testInfo) => {
    const vp = viewportLabel(testInfo.project.name)
    const checkId = `page-product-${vp}`
    const collectors = attachIssueCollectors(page)
    try {
      await page.goto('/shop')
      await dismissNoise(page)
      const link = page.locator('a[href^="/product/"]').first()
      await expect(link).toBeVisible({ timeout: 30_000 })
      await link.click()
      await page.waitForURL(/\/product\//)
      await page.waitForTimeout(800)
      await collectors.measureOverflow()
      await expect(page.getByRole('button', { name: /add to cart/i }).first()).toBeVisible()

      const issueText = formatIssues(collectors.issues)
      const hard =
        collectors.issues.consoleErrors.length > 0 ||
        collectors.issues.failedRequests.length > 0 ||
        collectors.issues.overflowX
      if (hard) {
        const shot = await saveFailureShot(page, checkId)
        recordCheck({
          id: checkId,
          name: 'Page product detail',
          viewport: vp,
          status: 'FAIL',
          error: issueText,
          screenshot: shot,
        })
        expect(hard, issueText).toBe(false)
      } else {
        recordCheck({
          id: checkId,
          name: 'Page product detail',
          viewport: vp,
          status: 'PASS',
        })
      }
    } catch (err) {
      const shot = await saveFailureShot(page, checkId)
      recordCheck({
        id: checkId,
        name: 'Page product detail',
        viewport: vp,
        status: 'FAIL',
        error: err instanceof Error ? err.message : String(err),
        screenshot: shot,
      })
      throw err
    } finally {
      collectors.detach()
    }
  })
})
