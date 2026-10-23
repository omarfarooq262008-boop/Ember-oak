import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const checksPath = path.join(root, 'docs/qa-checks.json')
const ordersPath = path.join(root, 'docs/qa-orders.json')
const lhPath = path.join(root, 'docs/qa-lighthouse.json')
const outPath = path.join(root, 'docs/QA_REPORT.md')

function loadJson(p, fallback) {
  if (!fs.existsSync(p)) return fallback
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'))
  } catch {
    return fallback
  }
}

const checks = loadJson(checksPath, [])
const orders = loadJson(ordersPath, [])
const lighthouse = loadJson(lhPath, [])

const pass = checks.filter((c) => c.status === 'PASS').length
const fail = checks.filter((c) => c.status === 'FAIL').length
const manual = checks.filter((c) => c.status === 'MANUAL').length
const skip = checks.filter((c) => c.status === 'SKIP').length

const lines = []
lines.push('# QA Report — Ember & Oak live demo')
lines.push('')
lines.push(`Target: https://ember-oak-beige.vercel.app`)
lines.push(`Generated: ${new Date().toISOString()}`)
lines.push('')
lines.push(`Summary: **${pass} PASS**, **${fail} FAIL**, **${manual} MANUAL**, **${skip} SKIP** (${checks.length} checks)`)
lines.push('')
lines.push('## Checks')
lines.push('')
lines.push('| Check | Viewport | Status | Error / notes | Screenshot |')
lines.push('|---|---|---|---|---|')
for (const c of checks.sort((a, b) => a.id.localeCompare(b.id))) {
  const err = (c.error ?? '')
    .replace(/\u001b\[[0-9;]*m/g, '')
    .replace(/\|/g, '\\|')
    .replace(/\n/g, ' ')
    .slice(0, 400)
  const shot = c.screenshot ? `[png](${c.screenshot})` : ''
  lines.push(`| ${c.name.replace(/\|/g, '\\|')} | ${c.viewport} | **${c.status}** | ${err} | ${shot} |`)
}
lines.push('')
lines.push('## Orders created (delete afterward)')
lines.push('')
if (orders.length === 0) lines.push('_None recorded._')
else for (const o of orders) lines.push(`- \`${o}\``)
lines.push('')
lines.push('## Lighthouse (mobile)')
lines.push('')
if (lighthouse.length === 0) {
  lines.push('_No Lighthouse results._')
} else {
  lines.push('| URL | Performance | Accessibility | Best Practices | SEO |')
  lines.push('|---|---:|---:|---:|---:|')
  for (const s of lighthouse) {
    lines.push(
      `| ${s.url} | ${s.performance} | ${s.accessibility} | ${s.bestPractices} | ${s.seo} |`,
    )
  }
}
lines.push('')
lines.push('## Admin')
lines.push('')
lines.push(
  hasAdminNote(checks)
    ? 'Admin automated checks ran (credentials from git-ignored `.env.test`).'
    : 'Admin flows listed as **MANUAL** — set `TEST_ADMIN_EMAIL` and `TEST_ADMIN_PASSWORD` in `.env.test` to automate.',
)
lines.push('')

function hasAdminNote(list) {
  return list.some((c) => c.id.startsWith('admin') && c.status === 'PASS')
}

fs.mkdirSync(path.dirname(outPath), { recursive: true })
fs.writeFileSync(outPath, lines.join('\n'))
console.log(`Wrote ${outPath}`)
