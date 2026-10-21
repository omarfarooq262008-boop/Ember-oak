import * as Sentry from '@sentry/react'
import { useState } from 'react'

import { Seo } from '@/components/seo/Seo'
import { Button } from '@/components/ui/button'
import { isSentryStarted } from '@/lib/sentry/init'

/**
 * Admin-only Sentry smoke test. Non-admins never reach this (AdminGate → 404).
 */
export function SentryTestPage() {
  const [message, setMessage] = useState<string | null>(null)

  return (
    <>
      <Seo title="Sentry test" noindex />

      <div className="section-pad container-eo mx-auto max-w-lg space-y-6">
        <h1 className="text-2xl font-medium">Sentry test</h1>
        <p className="text-sm text-muted">
          Admin-only diagnostics. Sentry is{' '}
          {isSentryStarted() ? 'initialised' : 'not configured (no DSN)'}.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              setMessage(null)
              throw new Error('Sentry frontend test error')
            }}
          >
            Throw frontend error
          </Button>
          <Button
            type="button"
            onClick={() => {
              if (!isSentryStarted()) {
                setMessage('Sentry is not initialised — set VITE_SENTRY_DSN.')
                return
              }
              Sentry.captureMessage('Sentry admin test message')
              setMessage('Test message sent.')
            }}
          >
            Send test message
          </Button>
        </div>
        {message ? (
          <p className="text-sm text-muted" role="status">
            {message}
          </p>
        ) : null}
      </div>
    </>
  )
}
