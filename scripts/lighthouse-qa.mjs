import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { launch as launchChrome } from 'chrome-launcher'
import lighthouse from 'lighthouse'
import { chromium } from 'playwright'

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const base = process.env.QA_BASE_URL ?? 'https://ember-oak-beige.vercel.app'
const outFile = path.join(root, 'docs/qa-lighthouse.json')

async function discoverProductPath() {
  const browser = await chromium.launch({ headless: true })
  try {
    const page = await browser.newPage()
    await page.goto(`${base}/shop`, { waitUntil: 'domcontentloaded', timeout: 60_000 })
    const href = await page.locator('a[href^="/product/"]').first().getAttribute('href')
    return href || '/shop'
  } catch {
    return '/shop'
  } finally {
    await browser.close()
  }
}

async function runOne(url) {
  const chrome = await launchChrome({
    chromeFlags: ['--headless', '--no-sandbox', '--disable-gpu'],
  })
  try {
    const result = await lighthouse(url, {
      port: chrome.port,
      output: 'json',
      logLevel: 'error',
      onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
      formFactor: 'mobile',
      screenEmulation: {
        mobile: true,
        width: 390,
        height: 844,
        deviceScaleFactor: 2,
        disabled: false,
      },
    })
    const cats = result.lhr.categories
    return {
      url,
      performance: Math.round((cats.performance?.score ?? 0) * 100),
      accessibility: Math.round((cats.accessibility?.score ?? 0) * 100),
      bestPractices: Math.round((cats['best-practices']?.score ?? 0) * 100),
      seo: Math.round((cats.seo?.score ?? 0) * 100),
    }
  } finally {
    await chrome.kill()
  }
}

async function main() {
  const productPath = await discoverProductPath()
  const urls = [`${base}/`, `${base}/shop`, `${base}${productPath}`]
  const scores = []
  for (const url of urls) {
    console.log(`Lighthouse (mobile): ${url}`)
    scores.push(await runOne(url))
  }
  fs.mkdirSync(path.dirname(outFile), { recursive: true })
  fs.writeFileSync(outFile, JSON.stringify(scores, null, 2))
  console.log(`Wrote ${outFile}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
