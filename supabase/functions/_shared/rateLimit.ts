/**
 * Shared IP/user rate limiter for Edge Functions.
 * IP is taken only from the platform-set x-forwarded-for header.
 */
import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import { corsHeaders } from './cors.ts'
import {
  RATE_LIMIT_MESSAGE,
  RATE_LIMITS,
  type RateLimitKey,
} from './rateLimitConfig.ts'

export type RateLimitState = {
  count: number
  windowStartMs: number
}

export type RateLimitRule = {
  limit: number
  windowSeconds: number
}

export type RateLimitDecision =
  | { allowed: true; next: RateLimitState }
  | { allowed: false; retryAfterSeconds: number; next: RateLimitState }

/** Pure window/count decision — unit-tested via the mirrored src/lib helper. */
export function evaluateRateLimit(
  state: RateLimitState | null,
  rule: RateLimitRule,
  nowMs: number = Date.now(),
): RateLimitDecision {
  const windowMs = rule.windowSeconds * 1000
  if (!state || nowMs - state.windowStartMs >= windowMs) {
    return {
      allowed: true,
      next: { count: 1, windowStartMs: nowMs },
    }
  }
  if (state.count >= rule.limit) {
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((state.windowStartMs + windowMs - nowMs) / 1000),
    )
    return { allowed: false, retryAfterSeconds, next: state }
  }
  return {
    allowed: true,
    next: { count: state.count + 1, windowStartMs: state.windowStartMs },
  }
}

/**
 * Client IP from Supabase/Deno's trusted forward chain only.
 * Do not fall back to client-controlled headers (e.g. spoofable custom headers).
 */
export function getClientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for')
  if (!forwarded) return 'unknown'
  const first = forwarded.split(',')[0]?.trim()
  return first || 'unknown'
}

export function rateLimitResponse(
  retryAfterSeconds: number,
  message: string = RATE_LIMIT_MESSAGE,
): Response {
  return new Response(JSON.stringify({ error: message }), {
    status: 429,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
      'Retry-After': String(Math.max(1, Math.ceil(retryAfterSeconds))),
    },
  })
}

export async function enforceRateLimit(
  admin: SupabaseClient,
  key: RateLimitKey,
  subject: string,
): Promise<{ allowed: true } | { allowed: false; retryAfterSeconds: number }> {
  const rule = RATE_LIMITS[key]
  const id = `${key}:${subject}`
  const { data } = await admin.from('rate_limits').select('*').eq('id', id).maybeSingle()
  const nowMs = Date.now()
  const prior: RateLimitState | null = data
    ? {
        count: Number(data.count) || 0,
        windowStartMs: new Date(data.window_start).getTime(),
      }
    : null

  const decision = evaluateRateLimit(prior, rule, nowMs)
  if (!decision.allowed) {
    // Fire-and-forget ops signal — never block the 429 response.
    void admin.from('app_events').insert({
      event_type: 'rate_limit_hit',
      payload: { function: key },
    })
    return { allowed: false, retryAfterSeconds: decision.retryAfterSeconds }
  }

  await admin.from('rate_limits').upsert({
    id,
    count: decision.next.count,
    window_start: new Date(decision.next.windowStartMs).toISOString(),
  })

  return { allowed: true }
}
