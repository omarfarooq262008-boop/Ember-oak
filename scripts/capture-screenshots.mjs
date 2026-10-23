#!/usr/bin/env node
/**
 * Capture portfolio screenshots into docs/screenshots via Playwright.
 * Uses QA_BASE_URL (default: live Vercel demo) or a local preview URL.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const outDir = path.join(root, 'docs', 'screenshots')
const base = (process.env.QA_BASE_URL ?? 'https://ember-oak-beige.vercel.app').replace(
  /\/+$/,
  '',
)

const shots = [
  { name: 'home', path: '/' },
  { name: 'shop', path: '/shop' },
  { name: 'product', path: null }, // discovered
  { name: 'cart', path: '/cart' },
  { name: 'checkout', path: '/checkout' },
  { name: 'mock-checkout', path: '/mock-checkout' },
]

async function main() {
  fs.mkdirSync(outDir, { recursive: true })
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 1,
  })

  try {
    await page.goto(`${base}/shop`, { waitUntil: 'networkidle', timeout: 90_000 })
    const productHref =
      (await page.locator('a[href^="/product/"]').first().getAttribute('href')) ||
      '/shop'

    for (const shot of shots) {
      const rel = shot.name === 'product' ? productHref : shot.path
      const url = `${base}${rel}`
      console.log(`Screenshot ${shot.name}: ${url}`)
      await page.goto(url, { waitUntil: 'networkidle', timeout: 90_000 })
      await page.waitForTimeout(800)

      if (shot.name === 'cart' || shot.name === 'checkout') {
        // Best-effort: add first product so cart/checkout aren't empty
        try {
          await page.goto(`${base}${productHref}`, {
            waitUntil: 'domcontentloaded',
            timeout: 60_000,
          })
          const add = page.getByRole('button', { name: /add to cart/i }).first()
          if (await add.isVisible({ timeout: 5000 }).catch(() => false)) {
            await add.click()
            await page.waitForTimeout(500)
          }
          await page.goto(url, { waitUntil: 'networkidle', timeout: 90_000 })
          await page.waitForTimeout(600)
        } catch {
          /* empty cart still ok for portfolio */
        }
      }

      const file = path.join(outDir, `${shot.name}.png`)
      await page.screenshot({ path: file, fullPage: false })
      console.log(`  → ${path.relative(root, file)}`)
    }
  } finally {
    await browser.close()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
