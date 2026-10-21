/**
 * Pure rate-limit window logic (mirrors supabase/functions/_shared/rateLimit.ts).
 * Kept free of Deno/Supabase imports so Vitest can cover allow / block / reset.
 */

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

/** Friendly copy shown when Edge Functions return HTTP 429. */
export const RATE_LIMIT_UI_MESSAGE =
  "You're sending requests too quickly. Please wait a moment and try again."

export type FunctionsInvokeError = {
  context?: Response
  message?: string
}

export type ParsedFunctionsError = {
  message: string
  status?: number
  retryAfter?: number
}

/**
 * Extract a UI-safe message from supabase.functions.invoke failures,
 * preferring the function JSON body and Retry-After on 429.
 */
export async function parseFunctionsInvokeError(
  error: FunctionsInvokeError,
  fallback: string,
): Promise<ParsedFunctionsError> {
  const status = error.context?.status
  let retryAfter: number | undefined
  const ra = error.context?.headers?.get('Retry-After')
  if (ra && /^\d+$/.test(ra.trim())) {
    retryAfter = Number(ra.trim())
  }

  try {
    const body = error.context ? await error.context.json() : null
    if (body && typeof body === 'object') {
      const errMsg = (body as { error?: unknown }).error
      const msg = (body as { message?: unknown }).message
      if (typeof errMsg === 'string' && errMsg.trim()) {
        return { message: errMsg, status, retryAfter }
      }
      if (typeof msg === 'string' && msg.trim() && status === 429) {
        return { message: msg, status, retryAfter }
      }
    }
  } catch {
    /* ignore non-JSON bodies */
  }

  if (status === 429) {
    return { message: RATE_LIMIT_UI_MESSAGE, status, retryAfter }
  }

  return {
    message: (error.message && error.message.trim()) || fallback,
    status,
    retryAfter,
  }
}
