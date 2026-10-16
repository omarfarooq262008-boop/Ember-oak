#!/usr/bin/env node
/**
 * Scans demo data for image URLs and reports HTTP status for each.
 * Sources: supabase/seed.sql, src/data/catalog.ts, src/config/store.ts,
 * src/config/media.ts (hero, collection, category, product, OG images).
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

const IMAGE_EXT = /\.(?:svg|png|jpe?g|webp|gif)(?:\?|$)/i
const UNSPLASH = /images\.unsplash\.com/i

const sources = [
  'supabase/seed.sql',
  'src/data/catalog.ts',
  'src/config/store.ts',
  'src/config/media.ts',
]

/** @type {Map<string, Set<string>>} */
const urlToUsages = new Map()

function addUsage(url, where) {
  let cleaned = url.replace(/[),.;]+$/, '').trim()
  if (!cleaned) return
  // Skip template literals / interpolation leftovers
  if (cleaned.includes('${') || cleaned.includes('`')) return
  addRaw(cleaned, where)
}

function addRaw(url, where) {
  if (!urlToUsages.has(url)) urlToUsages.set(url, new Set())
  urlToUsages.get(url).add(where)
}

function isImageUrl(url) {
  if (url.startsWith('/')) return IMAGE_EXT.test(url) || url.includes('/images/')
  if (UNSPLASH.test(url)) return true
  return IMAGE_EXT.test(url)
}

function extractFromFile(relPath) {
  const abs = path.join(root, relPath)
  if (!fs.existsSync(abs)) {
    console.warn(`Missing source: ${relPath}`)
    return
  }
  const text = fs.readFileSync(abs, 'utf8')
  const lines = text.split(/\r?\n/)

  lines.forEach((line, i) => {
    const loc = `${relPath}:${i + 1}`
    for (const m of line.matchAll(/https?:\/\/[^\s"'`)\]}>]+/g)) {
      if (isImageUrl(m[0])) addUsage(m[0], loc)
    }
    for (const m of line.matchAll(
      /['"`](\/(?:images\/[^'"`]+|og-[^'"`]+)\.(?:svg|png|jpe?g|webp|gif))['"`]/gi,
    )) {
      addUsage(m[1], loc)
    }
    for (const m of line.matchAll(/defaultOgImage:\s*['"`]([^'"`]+)['"`]/g)) {
      addUsage(m[1], loc)
    }
  })

  // catalog helper: img('file.jpg') → /images/file.jpg
  if (relPath.endsWith('catalog.ts')) {
    const imgHelper = /img\(\s*['"`]([^'"`]+)['"`]\s*\)/g
    let m
    while ((m = imgHelper.exec(text))) {
      const file = m[1]
      const url = file.startsWith('/') ? file : `/images/${file}`
      const line = text.slice(0, m.index).split(/\r?\n/).length
      addRaw(url, `${relPath}:${line}`)
    }
  }
}

for (const src of sources) extractFromFile(src)

async function checkUrl(url) {
  if (url.startsWith('/')) {
    const filePath = path.join(root, 'public', url.replace(/^\//, ''))
    if (fs.existsSync(filePath)) {
      const size = fs.statSync(filePath).size
      return { status: 200, note: `local ${size}B` }
    }
    return { status: 404, note: 'missing local file' }
  }

  try {
    const get = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      signal: AbortSignal.timeout(20000),
      headers: {
        'User-Agent': 'EmberOak-ImageCheck/1.0',
        Range: 'bytes=0-1023',
      },
    })
    const ct = get.headers.get('content-type') || ''
    const okType = ct.startsWith('image/') || get.status === 206
    if (get.status >= 200 && get.status < 300 && !okType && ct) {
      return { status: get.status, note: `bad type ${ct}` }
    }
    return { status: get.status, note: ct.slice(0, 16) || 'GET' }
  } catch (err) {
    return { status: 0, note: String(err?.cause?.code || err?.message || err) }
  }
}

const urls = [...urlToUsages.keys()].sort()
console.log(`Checking ${urls.length} unique image URL(s)…\n`)

const rows = []
for (const url of urls) {
  const result = await checkUrl(url)
  const usages = [...urlToUsages.get(url)].join('; ')
  rows.push({
    url: url.length > 72 ? url.slice(0, 69) + '…' : url,
    fullUrl: url,
    status: result.status,
    note: result.note,
    used: usages.length > 60 ? usages.slice(0, 57) + '…' : usages,
  })
}

const col = (s, n) => String(s).padEnd(n).slice(0, n)
console.log(
  `${col('STATUS', 8)} ${col('NOTE', 18)} ${col('URL', 74)} USED IN`,
)
console.log('-'.repeat(140))
for (const r of rows) {
  console.log(
    `${col(r.status, 8)} ${col(r.note, 18)} ${col(r.url, 74)} ${r.used}`,
  )
}

const failures = rows.filter((r) => !(r.status === 200 || r.status === 206))
console.log('\n' + '='.repeat(60))
console.log(`OK: ${rows.length - failures.length}  FAIL: ${failures.length}`)
if (failures.length) {
  console.log('\nFailures:')
  for (const f of failures) {
    console.log(`  [${f.status}] ${f.fullUrl}`)
    console.log(
      `         ${f.note} · ${[...urlToUsages.get(f.fullUrl)].join(', ')}`,
    )
  }
  process.exitCode = 1
}
