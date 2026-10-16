import { useState, type ImgHTMLAttributes } from 'react'

import { cn } from '@/lib/utils'

const PLACEHOLDER =
  'data:image/svg+xml,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1000" viewBox="0 0 800 1000">
      <rect fill="#E7E0D8" width="800" height="1000"/>
      <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle"
        fill="#78716C" font-family="system-ui,sans-serif" font-size="28">Ember &amp; Oak</text>
    </svg>`,
  )

type SoftImageProps = ImgHTMLAttributes<HTMLImageElement> & {
  /** Extra class on the wrapper when using fill layout */
  wrapperClassName?: string
}

/**
 * Image with load fade-in and graceful fallback if the URL fails.
 */
export function SoftImage({
  className,
  wrapperClassName,
  alt = '',
  onLoad,
  onError,
  src,
  ...props
}: SoftImageProps) {
  const [loaded, setLoaded] = useState(false)
  const [failed, setFailed] = useState(false)
  const resolvedSrc = failed || !src ? PLACEHOLDER : src

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
          if (!failed) {
            setFailed(true)
            setLoaded(true)
          }
          onError?.(e)
        }}
      />
    </span>
  )
}
