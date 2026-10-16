#!/usr/bin/env node
/** One-shot: cache demo photos into public/images/ (Unsplash license). */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const out = path.join(root, 'public', 'images')
fs.mkdirSync(out, { recursive: true })

const jobs = [
  ['candle-warm.jpg', 'photo-1600618528240-fb9fc964b853', 1200, 1500],
  ['candle-lit.jpg', 'photo-1543248939-ff40856f65d4', 1200, 1500],
  ['candle-soft.jpg', 'photo-1572726729207-a78d6feb18d7', 1200, 1500],
  ['candle-dark.jpg', 'photo-1594035910387-fea47794261f', 1200, 1500],
  ['diffuser.jpg', 'photo-1608571423902-eed4a5ad8108', 1200, 1500],
  ['ceramic-studio.jpg', 'photo-1610701596007-11502861dcfa', 1200, 1500],
  ['ceramic-bowl.jpg', 'photo-1578749556568-bc2c40e68b61', 1200, 1500],
  ['vase-column.jpg', 'photo-1581783342308-f792dbdd27c5', 1200, 1500],
  ['throw-texture.jpg', 'photo-1584100936595-c0654b55a2e2', 1200, 1500],
  ['linen-room.jpg', 'photo-1616486338812-3dadae4b4ace', 1200, 1500],
  ['gift-wrap.jpg', 'photo-1549465220-1a8b9238cd48', 1200, 1500],
  ['hero.jpg', 'photo-1600618528240-fb9fc964b853', 1920, 1080],
  ['collection-amber.jpg', 'photo-1600618528240-fb9fc964b853', 1200, 675],
  ['collection-clay.jpg', 'photo-1610701596007-11502861dcfa', 1200, 675],
  ['collection-linen.jpg', 'photo-1616486338812-3dadae4b4ace', 1200, 675],
  ['ig-1.jpg', 'photo-1600618528240-fb9fc964b853', 600, 600],
  ['ig-2.jpg', 'photo-1616486338812-3dadae4b4ace', 600, 600],
  ['ig-3.jpg', 'photo-1578749556568-bc2c40e68b61', 600, 600],
  ['ig-4.jpg', 'photo-1584100936595-c0654b55a2e2', 600, 600],
  ['ig-5.jpg', 'photo-1608571423902-eed4a5ad8108', 600, 600],
  ['ig-6.jpg', 'photo-1549465220-1a8b9238cd48', 600, 600],
]

let failed = 0
for (const [file, id, w, h] of jobs) {
  const url = `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&h=${h}&q=80`
  try {
    const r = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 EmberOak/1.0' },
      signal: AbortSignal.timeout(30000),
    })
    if (!r.ok) {
      console.error('FAIL', file, r.status)
      failed++
      continue
    }
    const buf = Buffer.from(await r.arrayBuffer())
    if (buf.length < 500) {
      console.error('FAIL', file, 'too small', buf.length)
      failed++
      continue
    }
    fs.writeFileSync(path.join(out, file), buf)
    console.log('OK', file, buf.length)
  } catch (e) {
    console.error('FAIL', file, e.message)
    failed++
  }
}

process.exitCode = failed ? 1 : 0
