import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))

function run(cmd, args, opts = {}) {
  console.log(`\n> ${cmd} ${args.join(' ')}`)
  const res = spawnSync(cmd, args, {
    cwd: root,
    stdio: 'inherit',
    shell: true,
    ...opts,
  })
  return res.status ?? 1
}

// Reset per-run check ledger (keep orders accumulating within a session if present)
for (const f of ['docs/qa-checks.json', 'docs/qa-results.json']) {
  const p = path.join(root, f)
  if (fs.existsSync(p)) fs.unlinkSync(p)
}
fs.mkdirSync(path.join(root, 'docs/qa-screenshots'), { recursive: true })
if (!fs.existsSync(path.join(root, 'docs/qa-orders.json'))) {
  fs.writeFileSync(path.join(root, 'docs/qa-orders.json'), '[]')
}

// Path with spaces breaks `npx playwright`; invoke the CLI via node.
const e2e = run('node', [
  'node_modules/@playwright/test/cli.js',
  'test',
])
const lh = run('node', ['scripts/lighthouse-qa.mjs'])
run('node', ['scripts/write-qa-report.mjs'])

process.exit(e2e !== 0 || lh !== 0 ? 1 : 0)
