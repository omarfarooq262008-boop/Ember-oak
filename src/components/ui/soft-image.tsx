import { useEffect, useState, type ImgHTMLAttributes } from 'react'

import { cn } from '@/lib/utils'

/** Neutral branded placeholder — keeps aspect ratio via CSS on the parent. */
export const IMAGE_PLACEHOLDER = '/images/placeholder.svg'

type SoftImageProps = ImgHTMLAttributes<HTMLImageElement> & {
  /** Extra class on the wrapper when using fill layout */
  wrapperClassName?: string
}

/**
 * Image with load fade-in and graceful fallback if the URL fails.
 * Keeps alt text; swaps to a local placeholder on error (no layout jump).
 */
export function SoftImage({
  className,
  wrapperClassName,
  alt = '',
  onLoad,
  onError,
  src,
  loading = 'lazy',
  ...props
}: SoftImageProps) {
  const [loaded, setLoaded] = useState(false)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    setLoaded(false)
    setFailed(false)
  }, [src])

  const resolvedSrc = failed || !src ? IMAGE_PLACEHOLDER : src

  return (
    <span className={cn('relative block size-full overflow-hidden', wrapperClassName)}>
      {!loaded && !failed ? (
        <span
          className="absolute inset-0 animate-pulse bg-border/60"
          aria-hidden
        />
      ) : null}
      <img
        {...props}
        src={resolvedSrc}
        alt={alt}
        loading={loading}
        className={cn(
          'size-full object-cover transition-opacity duration-500 ease-out',
          loaded ? 'opacity-100' : 'opacity-0',
          className,
        )}
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
    </span>
  )
}
