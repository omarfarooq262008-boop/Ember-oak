import { useEffect, useLayoutEffect, useRef } from 'react'
import { useLocation, useNavigationType } from 'react-router-dom'

import {
  applyScrollDecision,
  decideScrollOnNavigation,
  unlockBodyScroll,
} from '@/lib/scrollNavigation'

type ScrollToTopProps = {
  /** Called when the pathname changes (close drawers / menus). */
  onPathnameChange?: () => void
}

/**
 * Scrolls to top on pathname changes (instant). Skips query-only updates.
 * Honors #hash targets. On back/forward, restores the saved scroll Y when known.
 * Clears leftover body scroll locks from dialogs/sheets.
 */
export function ScrollToTop({ onPathnameChange }: ScrollToTopProps) {
  const { pathname, hash, key } = useLocation()
  const navigationType = useNavigationType()
  const positions = useRef(new Map<string, number>())
  const prevPathname = useRef(pathname)
  const prevKey = useRef(key)

  useEffect(() => {
    if (!('scrollRestoration' in history)) return
    const previous = history.scrollRestoration
    history.scrollRestoration = 'manual'
    return () => {
      history.scrollRestoration = previous
    }
  }, [])

  useLayoutEffect(() => {
    const pathnameChanged = prevPathname.current !== pathname
    const leavingKey = prevKey.current
    if (leavingKey !== key) {
      positions.current.set(leavingKey, window.scrollY)
    }

    const decision = decideScrollOnNavigation({
      pathnameChanged,
      hash,
      navigationType,
      savedY: positions.current.get(key),
    })

    if (pathnameChanged || Boolean(hash)) {
      applyScrollDecision(decision)
    }

    if (pathnameChanged) {
      onPathnameChange?.()
      unlockBodyScroll()
    }

    prevPathname.current = pathname
    prevKey.current = key
  }, [pathname, hash, key, navigationType, onPathnameChange])

  return null
}
