import { afterEach, describe, expect, it, vi } from 'vitest'

describe('demo mode flags', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  it('isDemoMode is true only when VITE_DEMO_MODE is "true"', async () => {
    vi.stubEnv('VITE_DEMO_MODE', 'true')
    const { isDemoMode } = await import('./demoMode')
    expect(isDemoMode()).toBe(true)
  })

  it('isDemoMode is false when unset or other values', async () => {
    vi.stubEnv('VITE_DEMO_MODE', '')
    const { isDemoMode } = await import('./demoMode')
    expect(isDemoMode()).toBe(false)
  })

  it('isDemoNoindex defaults off', async () => {
    vi.stubEnv('VITE_DEMO_NOINDEX', '')
    const { isDemoNoindex } = await import('./demoMode')
    expect(isDemoNoindex()).toBe(false)
  })
})
