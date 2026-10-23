import { useEffect, useState } from 'react'

/**
 * Sticky-header shrink flag. rAF-throttled; only re-renders when the
 * boolean actually flips (avoids a Header re-render on every scroll frame).
 */
export function useScrollShrink(threshold = 24): boolean {
  const [shrunk, setShrunk] = useState(
    () => typeof window !== 'undefined' && window.scrollY > threshold,
  )

  useEffect(() => {
    let ticking = false
    let last = window.scrollY > threshold

    const update = () => {
      ticking = false
      const next = window.scrollY > threshold
      if (next !== last) {
        last = next
        setShrunk(next)
      }
    }

    const onScroll = () => {
      if (ticking) return
      ticking = true
      requestAnimationFrame(update)
    }

    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [threshold])

  return shrunk
}
