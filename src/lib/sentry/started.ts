/** Tiny flag module — no `@sentry/react` import so the SDK stays out of the first paint. */

let started = false

export function isSentryStarted(): boolean {
  return started
}

export function markSentryStarted(value = true): void {
  started = value
}
