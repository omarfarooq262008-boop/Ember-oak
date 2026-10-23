#!/usr/bin/env node
/**
 * Convert public/images/*.jpg|png into responsive WebP (+ compressed JPG fallbacks)
 * and a 1200×630 OG JPEG. Target ~150–300 KB per primary WebP where possible.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const imagesDir = path.join(root, 'public', 'images')
const WIDTHS = [480, 800, 1200, 1920]

const kb = (n) => `${(n / 1024).toFixed(1)} KB`

async function writeWebp(pipeline, outPath, quality) {
  await pipeline.webp({ quality, effort: 6 }).toFile(outPath)
  return fs.statSync(outPath).size
}

async function optimizeOne(file) {
  const abs = path.join(imagesDir, file)
  const base = file.replace(/\.(jpe?g|png)$/i, '')
  const input = sharp(abs).rotate()
  const meta = await input.metadata()
  const srcW = meta.width || 1920

  const sizes = []
  for (const w of WIDTHS) {
    if (w > srcW + 80 && w !== WIDTHS[0]) continue
    const out = path.join(imagesDir, `${base}-${w}.webp`)
    let quality = w >= 1200 ? 78 : w >= 800 ? 80 : 82
    let size = await writeWebp(
      sharp(abs).rotate().resize({ width: Math.min(w, srcW), withoutEnlargement: true }),
      out,
      quality,
    )
    // Nudge quality down if oversized (except tiny IG crops)
    while (size > 320 * 1024 && quality > 55) {
      quality -= 6
      size = await writeWebp(
        sharp(abs).rotate().resize({ width: Math.min(w, srcW), withoutEnlargement: true }),
        out,
        quality,
      )
    }
    sizes.push({ w, size, quality, out: path.basename(out) })
  }

  // Default single webp (1200 or native)
  const defaultW = Math.min(1200, srcW)
  const defaultOut = path.join(imagesDir, `${base}.webp`)
  let dq = 78
  let dsize = await writeWebp(
    sharp(abs).rotate().resize({ width: defaultW, withoutEnlargement: true }),
    defaultOut,
    dq,
  )
  while (dsize > 300 * 1024 && dq > 55) {
    dq -= 6
    dsize = await writeWebp(
      sharp(abs).rotate().resize({ width: defaultW, withoutEnlargement: true }),
      defaultOut,
      dq,
    )
  }
  sizes.push({ w: defaultW, size: dsize, quality: dq, out: path.basename(defaultOut) })

  // Recompress JPG fallback in place (keep extension for seed URLs)
  const jpgOut = abs
  if (/\.jpe?g$/i.test(file)) {
    const tmp = abs + '.tmp.jpg'
    await sharp(abs)
      .rotate()
      .resize({ width: Math.min(1600, srcW), withoutEnlargement: true })
      .jpeg({ quality: 82, mozjpeg: true })
      .toFile(tmp)
    fs.renameSync(tmp, jpgOut)
  }

  console.log(`${file} → ${sizes.map((s) => `${s.out} ${kb(s.size)}`).join(', ')}`)
}

async function writeOg() {
  const hero = path.join(imagesDir, 'hero.jpg')
  const ogJpg = path.join(root, 'public', 'og-default.jpg')
  const ogImagesJpg = path.join(imagesDir, 'og-default.jpg')
  if (!fs.existsSync(hero)) {
    console.warn('No hero.jpg — skip OG')
    return
  }
  const pipeline = () =>
    sharp(hero)
      .rotate()
      .resize(1200, 630, { fit: 'cover', position: 'centre' })
      .jpeg({ quality: 80, mozjpeg: true })

  await pipeline().toFile(ogJpg)
  await pipeline().toFile(ogImagesJpg)
  await sharp(hero)
    .rotate()
    .resize(1200, 630, { fit: 'cover', position: 'centre' })
    .webp({ quality: 78, effort: 6 })
    .toFile(path.join(imagesDir, 'og-default.webp'))

  console.log(
    `og-default.jpg ${kb(fs.statSync(ogJpg).size)}, images/og-default.webp ${kb(fs.statSync(path.join(imagesDir, 'og-default.webp')).size)}`,
  )
}

async function main() {
  const files = fs
    .readdirSync(imagesDir)
    .filter((f) => /\.(jpe?g|png)$/i.test(f) && !f.includes('.tmp.'))
  console.log(`Optimizing ${files.length} raster image(s) in public/images…`)
  for (const file of files) {
    await optimizeOne(file)
  }
  await writeOg()
  console.log('Done.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
