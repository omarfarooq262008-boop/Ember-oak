/**
 * Pure health-endpoint helpers (mirrors supabase/functions/health behaviour).
 * Unit-tested for GET / HEAD / POST and the degraded 503 case.
 */

export type HealthPayload = {
  status: 'ok' | 'degraded'
  time: string
}

export function isAllowedHealthMethod(method: string): boolean {
  const m = method.toUpperCase()
  return m === 'GET' || m === 'HEAD' || m === 'POST' || m === 'OPTIONS'
}

export function healthPayload(dbOk: boolean, time: string): HealthPayload {
  return {
    status: dbOk ? 'ok' : 'degraded',
    time,
  }
}

export function healthHttpStatus(dbOk: boolean): 200 | 503 {
  return dbOk ? 200 : 503
}

/** HEAD and OPTIONS carry no JSON body; GET/POST return the payload string. */
export function healthResponseBody(
  method: string,
  payload: HealthPayload,
): string | null {
  const m = method.toUpperCase()
  if (m === 'HEAD' || m === 'OPTIONS') return null
  return JSON.stringify(payload)
}

export const HEALTH_CACHE_CONTROL = 'no-store'
