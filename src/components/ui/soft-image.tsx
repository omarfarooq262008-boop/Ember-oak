import { useEffect, useState, type ImgHTMLAttributes } from 'react'

import { responsiveLocalImage } from '@/lib/responsiveImage'
import { cn } from '@/lib/utils'

/** Neutral branded placeholder — keeps aspect ratio via CSS on the parent. */
export const IMAGE_PLACEHOLDER = '/images/placeholder.svg'

type SoftImageProps = ImgHTMLAttributes<HTMLImageElement> & {
  /** Extra class on the wrapper when using fill layout */
  wrapperClassName?: string
  /** `sizes` for responsive local `/images/*` WebP srcset */
  sizes?: string
}

/**
 * Image with load fade-in and graceful fallback if the URL fails.
 * Local `/images/*` assets get a WebP `<picture>` srcset when available.
 */
export function SoftImage({
  className,
  wrapperClassName,
  alt = '',
  onLoad,
  onError,
  src,
  loading = 'lazy',
  sizes,
  ...props
}: SoftImageProps) {
  const [loaded, setLoaded] = useState(false)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    setLoaded(false)
    setFailed(false)
  }, [src])

  const responsive = !failed ? responsiveLocalImage(src, sizes) : null
  const resolvedSrc =
    failed || !src
      ? IMAGE_PLACEHOLDER
      : (responsive?.fallbackSrc ?? src)

  // Eager / LCP images must not start at opacity-0 — that delays Largest Contentful Paint.
  const isEager = loading === 'eager'
  const imgClassName = cn(
    'size-full object-cover transition-opacity duration-200 ease-out',
    isEager || loaded ? 'opacity-100' : 'opacity-0',
    className,
  )

  const img = (
    <img
      {...props}
      src={resolvedSrc}
      alt={alt}
      loading={loading}
      sizes={responsive?.sizes ?? sizes}
      srcSet={undefined}
      className={imgClassName}
      onLoad={(e) => {
        setLoaded(true)
        onLoad?.(e)
      }}
      onError={(e) => {
        if (!failed && resolvedSrc !== IMAGE_PLACEHOLDER) {
          setFailed(true)
          setLoaded(true)
        }
        onError?.(e)
      }}
    />
  )

  return (
    <span className={cn('relative block size-full overflow-hidden', wrapperClassName)}>
      {!loaded && !failed && !isEager ? (
        <span
          className="absolute inset-0 animate-pulse bg-border/60"
          aria-hidden
        />
      ) : null}
      {responsive?.webpSrcSet && !failed ? (
        <picture>
          <source
            type="image/webp"
            srcSet={responsive.webpSrcSet}
            sizes={responsive.sizes ?? sizes}
          />
          {img}
        </picture>
      ) : (
        img
      )}
    </span>
  )
}
