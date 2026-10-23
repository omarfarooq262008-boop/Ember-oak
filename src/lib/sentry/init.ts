import * as Sentry from '@sentry/react'

import { scrubBreadcrumb, scrubEvent } from '@/lib/sentry/scrub'
import { isSentryStarted, markSentryStarted } from '@/lib/sentry/started'

export { isSentryStarted }

/**
 * Initialise Sentry when VITE_SENTRY_DSN is set.
 * Returns false (and does nothing) when the DSN is missing so the app runs normally.
 *
 * Privacy: @sentry/react v11 replaced `sendDefaultPii: false` with `dataCollection`
 * (userInfo/cookies/headers/bodies/query params off). We also scrub events in beforeSend.
 */
export function initSentry(): boolean {
  const dsn = (import.meta.env.VITE_SENTRY_DSN as string | undefined)?.trim()
  if (!dsn) {
    markSentryStarted(false)
    return false
  }

  const release = (
    import.meta.env.VITE_VERCEL_GIT_COMMIT_SHA as string | undefined
  )?.trim()
  const vercelEnv = (
    import.meta.env.VITE_VERCEL_ENV as string | undefined
  )?.trim()
  const environment =
    vercelEnv === 'production' || vercelEnv === 'preview'
      ? vercelEnv
      : import.meta.env.PROD
        ? 'production'
        : 'development'

  Sentry.init({
    dsn,
    // sendDefaultPii: false — expressed via dataCollection in SDK v11+
    dataCollection: {
      userInfo: false,
      cookies: false,
      httpHeaders: false,
      httpBodies: [],
      urlQueryParams: false,
      stackFrameVariables: false,
    },
    environment,
    release: release || undefined,
    tracesSampleRate: 0.1,
    integrations: [Sentry.browserTracingIntegration()],
    beforeSend(event) {
      return scrubEvent(event as unknown as Record<string, unknown>) as unknown as typeof event
    },
    beforeBreadcrumb(breadcrumb) {
      return scrubBreadcrumb(
        breadcrumb as unknown as Record<string, unknown>,
      ) as unknown as typeof breadcrumb
    },
  })

  markSentryStarted(true)
  return true
}
