import { useEffect, useState } from 'react'

export function useScrollShrink(threshold = 24): boolean {
  const [shrunk, setShrunk] = useState(false)

  useEffect(() => {
    const onScroll = () => {
      setShrunk(window.scrollY > threshold)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [threshold])

  return shrunk
}
