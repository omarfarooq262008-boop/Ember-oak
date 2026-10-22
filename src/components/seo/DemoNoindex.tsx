import { useEffect } from 'react'

import { isDemoNoindex } from '@/lib/demoMode'

/**
 * Optional site-wide robots noindex when VITE_DEMO_NOINDEX=true.
 * Default is off so the portfolio can be shared and indexed.
 */
export function DemoNoindex() {
  useEffect(() => {
    if (!isDemoNoindex()) return
    let el = document.head.querySelector<HTMLMetaElement>('meta[name="robots"]')
    if (!el) {
      el = document.createElement('meta')
      el.setAttribute('name', 'robots')
      document.head.appendChild(el)
    }
    el.setAttribute('content', 'noindex, nofollow')
  }, [])

  return null
}
