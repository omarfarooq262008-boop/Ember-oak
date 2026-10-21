import * as Sentry from '@sentry/react'

import { isSentryStarted } from '@/lib/sentry/init'

/** Safe route label for Sentry (path only — no query strings / tokens). */
export function setSentryRouteTag(pathname: string): void {
  if (!isSentryStarted()) return
  const route = pathname.split('?')[0] || '/'
  Sentry.setTag('route', route)
}

/**
 * Checkout / payment stage tag — never pass emails, phones, tokens, or codes.
 * Examples: checkout_form | placing_order | redirecting_to_payment | mock_payment | order_confirmation
 */
export function setSentryOrderStage(stage: string | null): void {
  if (!isSentryStarted()) return
  if (!stage) {
    Sentry.setTag('order_stage', '')
    return
  }
  Sentry.setTag('order_stage', stage.replace(/[^a-z0-9_]/gi, '').slice(0, 64) || 'unknown')
}
