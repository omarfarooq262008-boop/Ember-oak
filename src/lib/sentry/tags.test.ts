import { beforeEach, describe, expect, it, vi } from 'vitest'

const setTag = vi.fn()

vi.mock('@sentry/react', () => ({
  setTag: (...args: unknown[]) => setTag(...args),
}))

vi.mock('@/lib/sentry/started', () => ({
  isSentryStarted: () => true,
}))

describe('sentry tags', () => {
  beforeEach(() => {
    setTag.mockReset()
    vi.resetModules()
  })

  it('sets a path-only route tag without query strings', async () => {
    const { setSentryRouteTag } = await import('./tags')
    setSentryRouteTag('/track-order?token=secret')
    await vi.waitFor(() => {
      expect(setTag).toHaveBeenCalledWith('route', '/track-order')
    })
  })

  it('sets a sanitized order_stage tag', async () => {
    const { setSentryOrderStage } = await import('./tags')
    setSentryOrderStage('placing_order')
    await vi.waitFor(() => {
      expect(setTag).toHaveBeenCalledWith('order_stage', 'placing_order')
    })
  })
})
