import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const initMock = vi.fn()

vi.mock('@sentry/react', () => ({
  init: (...args: unknown[]) => initMock(...args),
  browserTracingIntegration: () => ({ name: 'BrowserTracing' }),
}))

describe('initSentry', () => {
  beforeEach(() => {
    initMock.mockReset()
    vi.resetModules()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('does not start Sentry when VITE_SENTRY_DSN is missing', async () => {
    vi.stubEnv('VITE_SENTRY_DSN', '')
    const { initSentry, isSentryStarted } = await import('./init')
    expect(initSentry()).toBe(false)
    expect(isSentryStarted()).toBe(false)
    expect(initMock).not.toHaveBeenCalled()
  })

  it('starts Sentry when VITE_SENTRY_DSN is set', async () => {
    vi.stubEnv('VITE_SENTRY_DSN', 'https://examplePublicKey@o0.ingest.sentry.io/0')
    vi.stubEnv('VITE_VERCEL_GIT_COMMIT_SHA', 'abc123')
    vi.stubEnv('VITE_VERCEL_ENV', 'preview')
    const { initSentry, isSentryStarted } = await import('./init')
    expect(initSentry()).toBe(true)
    expect(isSentryStarted()).toBe(true)
    expect(initMock).toHaveBeenCalledTimes(1)
    const options = initMock.mock.calls[0]?.[0] as {
      dsn: string
      tracesSampleRate: number
      release?: string
      environment?: string
      integrations: unknown[]
      dataCollection?: {
        userInfo?: boolean
        cookies?: boolean
        httpHeaders?: boolean
        httpBodies?: unknown[]
        urlQueryParams?: boolean
      }
    }
    expect(options.dsn).toContain('ingest.sentry.io')
    expect(options.dataCollection?.userInfo).toBe(false)
    expect(options.dataCollection?.cookies).toBe(false)
    expect(options.dataCollection?.httpBodies).toEqual([])
    expect(options.dataCollection?.urlQueryParams).toBe(false)
    expect(options.tracesSampleRate).toBe(0.1)
    expect(options.release).toBe('abc123')
    expect(options.environment).toBe('preview')
    expect(options.integrations).toHaveLength(1)
  })
})
