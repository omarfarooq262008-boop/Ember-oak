/** Widths produced by `scripts/optimize-images.mjs` for local `/images/*` assets. */
const WIDTHS = [480, 800, 1200, 1920] as const

export type ResponsiveLocalImage = {
  /** JPG/PNG/SVG/remote fallback used as `<img src>` */
  fallbackSrc: string
  webpSrcSet?: string
  sizes?: string
}

/**
 * Build a WebP srcset for project-hosted images under `/images/`.
 * Remote URLs and SVGs are returned as plain fallbacks (no srcset).
 */
export function responsiveLocalImage(
  src: string | undefined,
  sizes?: string,
): ResponsiveLocalImage | null {
  if (!src) return null
  if (!src.startsWith('/images/') || src.endsWith('.svg')) {
    return { fallbackSrc: src, sizes }
  }

  const base = src.replace(/\.(jpe?g|png|webp)$/i, '')
  const webpSrcSet = WIDTHS.map((w) => `${base}-${w}.webp ${w}w`).join(', ')

  return {
    fallbackSrc: src.replace(/\.webp$/i, '.jpg'),
    webpSrcSet,
    sizes,
  }
}

/** Hero / LCP preload hints for `index.html` and runtime. */
export const HERO_IMAGE = {
  jpg: '/images/hero.jpg',
  webp: '/images/hero-1200.webp',
  srcSet:
    '/images/hero-480.webp 480w, /images/hero-800.webp 800w, /images/hero-1200.webp 1200w, /images/hero-1920.webp 1920w',
  sizes: '100vw',
  width: 1920,
  height: 1080,
} as const
