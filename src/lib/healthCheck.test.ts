import { describe, expect, it } from 'vitest'

import {
  HEALTH_CACHE_CONTROL,
  healthHttpStatus,
  healthPayload,
  healthResponseBody,
  isAllowedHealthMethod,
} from './healthCheck'

describe('health endpoint contract', () => {
  it('allows GET, HEAD, POST, and OPTIONS', () => {
    expect(isAllowedHealthMethod('GET')).toBe(true)
    expect(isAllowedHealthMethod('HEAD')).toBe(true)
    expect(isAllowedHealthMethod('POST')).toBe(true)
    expect(isAllowedHealthMethod('OPTIONS')).toBe(true)
    expect(isAllowedHealthMethod('PUT')).toBe(false)
    expect(isAllowedHealthMethod('DELETE')).toBe(false)
  })

  it('GET and POST return 200 ok JSON with the same shape', () => {
    const time = '2026-10-22T00:00:00.000Z'
    const payload = healthPayload(true, time)
    expect(payload).toEqual({ status: 'ok', time })
    expect(healthHttpStatus(true)).toBe(200)
    expect(healthResponseBody('GET', payload)).toBe(
      JSON.stringify({ status: 'ok', time }),
    )
    expect(healthResponseBody('POST', payload)).toBe(
      JSON.stringify({ status: 'ok', time }),
    )
  })

  it('HEAD returns the same status as GET but no body', () => {
    const time = '2026-10-22T00:00:00.000Z'
    const ok = healthPayload(true, time)
    expect(healthHttpStatus(true)).toBe(200)
    expect(healthResponseBody('HEAD', ok)).toBeNull()

    const degraded = healthPayload(false, time)
    expect(healthHttpStatus(false)).toBe(503)
    expect(healthResponseBody('HEAD', degraded)).toBeNull()
  })

  it('returns 503 degraded when the database check fails', () => {
    const time = '2026-10-22T00:00:00.000Z'
    const payload = healthPayload(false, time)
    expect(payload).toEqual({ status: 'degraded', time })
    expect(healthHttpStatus(false)).toBe(503)
    expect(healthResponseBody('GET', payload)).toBe(
      JSON.stringify({ status: 'degraded', time }),
    )
    expect(HEALTH_CACHE_CONTROL).toBe('no-store')
  })
})
