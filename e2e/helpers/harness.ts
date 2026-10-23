import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { ConsoleMessage, Page, Request, Response } from '@playwright/test'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '../..')
export const SCREENSHOT_DIR = path.join(root, 'docs/qa-screenshots')
export const ORDERS_FILE = path.join(root, 'docs/qa-orders.json')
export const CHECKS_FILE = path.join(root, 'docs/qa-checks.json')

export type CheckResult = {
  id: string
  name: string
  viewport: 'desktop' | 'mobile' | 'n/a'
  status: 'PASS' | 'FAIL' | 'SKIP' | 'MANUAL'
  error?: string
  screenshot?: string
}

export type PageIssues = {
  consoleErrors: string[]
  consoleWarnings: string[]
  failedRequests: string[]
  overflowX: boolean
  scrollWidth: number
  clientWidth: number
}

const noisyConsole = [
  /Download the React DevTools/i,
  /\[vite\]/i,
  /Third-party cookie/i,
  /ResizeObserver loop/i,
]

export function attachIssueCollectors(page: Page) {
  const issues: PageIssues = {
    consoleErrors: [],
    consoleWarnings: [],
    failedRequests: [],
    overflowX: false,
    scrollWidth: 0,
    clientWidth: 0,
  }

  const onConsole = (msg: ConsoleMessage) => {
    const text = msg.text()
    if (noisyConsole.some((re) => re.test(text))) return
    if (msg.type() === 'error') issues.consoleErrors.push(text)
    if (msg.type() === 'warning') issues.consoleWarnings.push(text)
  }

  const onRequestFailed = (req: Request) => {
    const failure = req.failure()?.errorText ?? 'failed'
    // Ignore aborted navigations / cancelled
    if (/ERR_ABORTED|net::ERR_ABORTED/i.test(failure)) return
    issues.failedRequests.push(`${req.method()} ${req.url()} → ${failure}`)
  }

  const onResponse = (res: Response) => {
    const status = res.status()
    if (status < 400) return
    const url = res.url()
    // Favicon / optional assets
    if (/\.(ico|map)(\?|$)/i.test(url)) return
    issues.failedRequests.push(`${res.request().method()} ${url} → ${status}`)
  }

  page.on('console', onConsole)
  page.on('requestfailed', onRequestFailed)
  page.on('response', onResponse)

  return {
    issues,
    async measureOverflow() {
      const dims = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }))
      issues.scrollWidth = dims.scrollWidth
      issues.clientWidth = dims.clientWidth
      issues.overflowX = dims.scrollWidth > dims.clientWidth + 1
      return issues
    },
    detach() {
      page.off('console', onConsole)
      page.off('requestfailed', onRequestFailed)
      page.off('response', onResponse)
    },
  }
}

export function formatIssues(issues: PageIssues): string | undefined {
  const parts: string[] = []
  if (issues.consoleErrors.length)
    parts.push(`console errors: ${issues.consoleErrors.join(' | ')}`)
  if (issues.consoleWarnings.length)
    parts.push(`console warnings: ${issues.consoleWarnings.join(' | ')}`)
  if (issues.failedRequests.length)
    parts.push(`failed network: ${issues.failedRequests.join(' | ')}`)
  if (issues.overflowX)
    parts.push(
      `horizontal overflow: scrollWidth=${issues.scrollWidth} clientWidth=${issues.clientWidth}`,
    )
  return parts.length ? parts.join('; ') : undefined
}

export async function saveFailureShot(
  page: Page,
  id: string,
): Promise<string | undefined> {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true })
  const file = path.join(SCREENSHOT_DIR, `${id}.png`)
  try {
    await page.screenshot({ path: file, fullPage: true })
    return path.relative(root, file).replace(/\\/g, '/')
  } catch {
    return undefined
  }
}

export function recordCheck(check: CheckResult) {
  fs.mkdirSync(path.dirname(CHECKS_FILE), { recursive: true })
  let existing: CheckResult[] = []
  if (fs.existsSync(CHECKS_FILE)) {
    try {
      existing = JSON.parse(fs.readFileSync(CHECKS_FILE, 'utf8')) as CheckResult[]
    } catch {
      existing = []
    }
  }
  existing = existing.filter((c) => c.id !== check.id)
  existing.push(check)
  fs.writeFileSync(CHECKS_FILE, JSON.stringify(existing, null, 2))
}

export function recordOrder(orderNumber: string) {
  fs.mkdirSync(path.dirname(ORDERS_FILE), { recursive: true })
  let orders: string[] = []
  if (fs.existsSync(ORDERS_FILE)) {
    try {
      orders = JSON.parse(fs.readFileSync(ORDERS_FILE, 'utf8')) as string[]
    } catch {
      orders = []
    }
  }
  if (!orders.includes(orderNumber)) orders.push(orderNumber)
  fs.writeFileSync(ORDERS_FILE, JSON.stringify(orders, null, 2))
}

export function viewportLabel(projectName: string): 'desktop' | 'mobile' {
  return projectName.includes('mobile') ? 'mobile' : 'desktop'
}

export const QA = {
  name: 'QA Test',
  email: 'qa-test@example.com',
  phone: '+92 300 1112233',
  address: '12 Test Lane, Clifton',
  province: 'Sindh',
  city: 'Karachi',
  postal: '75600',
}
