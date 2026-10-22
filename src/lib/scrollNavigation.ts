export type NavigationType = 'POP' | 'PUSH' | 'REPLACE'

export type ScrollNavDecision =
  | { action: 'none' }
  | { action: 'top' }
  | { action: 'hash'; hash: string }
  | { action: 'restore'; y: number }

/**
 * Decide scroll behavior when the location changes.
 * - Query-only changes: pathname unchanged → none (caller should not re-run).
 * - Back/forward (POP): restore saved Y when available, else none.
 * - New pathname (PUSH/REPLACE): top, or hash target if present.
 */
export function decideScrollOnNavigation(opts: {
  pathnameChanged: boolean
  hash: string
  navigationType: NavigationType
  savedY?: number
}): ScrollNavDecision {
  if (!opts.pathnameChanged) {
    if (opts.hash) return { action: 'hash', hash: opts.hash }
    return { action: 'none' }
  }

  if (opts.navigationType === 'POP') {
    if (typeof opts.savedY === 'number') {
      return { action: 'restore', y: opts.savedY }
    }
    return { action: 'none' }
  }

  if (opts.hash) return { action: 'hash', hash: opts.hash }
  return { action: 'top' }
}

export function unlockBodyScroll(): void {
  const body = document.body
  const html = document.documentElement
  body.style.removeProperty('overflow')
  body.style.removeProperty('padding-right')
  body.style.removeProperty('pointer-events')
  html.style.removeProperty('overflow')
  body.removeAttribute('data-scroll-locked')
  // Radix remove-scroll leftover classes
  body.classList.remove('overflow-hidden')
}

export function applyScrollDecision(decision: ScrollNavDecision): void {
  if (decision.action === 'none') return
  if (decision.action === 'top') {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
    return
  }
  if (decision.action === 'restore') {
    window.scrollTo({ top: decision.y, left: 0, behavior: 'instant' })
    return
  }
  const id = decodeURIComponent(decision.hash.replace(/^#/, ''))
  if (!id) {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
    return
  }
  const el =
    document.getElementById(id) ??
    document.querySelector(`[name="${CSS.escape(id)}"]`)
  if (el) {
    el.scrollIntoView({ behavior: 'instant', block: 'start' })
  } else {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
  }
}
