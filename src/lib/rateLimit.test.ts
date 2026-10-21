import { describe, expect, it } from 'vitest'

import {
  evaluateRateLimit,
  parseFunctionsInvokeError,
  RATE_LIMIT_UI_MESSAGE,
} from './rateLimit'

const rule = { limit: 3, windowSeconds: 60 }

describe('evaluateRateLimit', () => {
  it('allows the first request and starts a window', () => {
    const now = 1_000_000
    const decision = evaluateRateLimit(null, rule, now)
    expect(decision.allowed).toBe(true)
    if (decision.allowed) {
      expect(decision.next).toEqual({ count: 1, windowStartMs: now })
    }
  })

  it('allows requests under the limit', () => {
    const now = 1_000_000
    const d1 = evaluateRateLimit({ count: 1, windowStartMs: now }, rule, now + 1000)
    expect(d1.allowed).toBe(true)
    if (d1.allowed) expect(d1.next.count).toBe(2)

    const d2 = evaluateRateLimit(d1.next, rule, now + 2000)
    expect(d2.allowed).toBe(true)
    if (d2.allowed) expect(d2.next.count).toBe(3)
  })

  it('blocks when the limit is reached and reports Retry-After', () => {
    const windowStart = 1_000_000
    const now = windowStart + 10_000
    const decision = evaluateRateLimit(
      { count: 3, windowStartMs: windowStart },
      rule,
      now,
    )
    expect(decision.allowed).toBe(false)
    if (!decision.allowed) {
      expect(decision.retryAfterSeconds).toBe(50)
      expect(decision.next.count).toBe(3)
    }
  })

  it('resets the window after it expires', () => {
    const windowStart = 1_000_000
    const now = windowStart + 60_000
    const decision = evaluateRateLimit(
      { count: 3, windowStartMs: windowStart },
      rule,
      now,
    )
    expect(decision.allowed).toBe(true)
    if (decision.allowed) {
      expect(decision.next).toEqual({ count: 1, windowStartMs: now })
    }
  })
})

describe('parseFunctionsInvokeError', () => {
  it('surfaces the Edge Function error body and Retry-After on 429', async () => {
    const response = new Response(
      JSON.stringify({ error: RATE_LIMIT_UI_MESSAGE }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': '42',
        },
      },
    )
    const parsed = await parseFunctionsInvokeError(
      { context: response, message: 'Edge Function returned a non-2xx status code' },
      'fallback',
    )
    expect(parsed).toEqual({
      message: RATE_LIMIT_UI_MESSAGE,
      status: 429,
      retryAfter: 42,
    })
  })

  it('falls back to the friendly rate-limit copy when the 429 body is empty', async () => {
    const response = new Response('{}', {
      status: 429,
      headers: { 'Content-Type': 'application/json', 'Retry-After': '5' },
    })
    const parsed = await parseFunctionsInvokeError(
      { context: response },
      'fallback',
    )
    expect(parsed.message).toBe(RATE_LIMIT_UI_MESSAGE)
    expect(parsed.status).toBe(429)
    expect(parsed.retryAfter).toBe(5)
  })

  it('uses the provided fallback for non-429 failures', async () => {
    const response = new Response(JSON.stringify({ error: 'Nope' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
    const parsed = await parseFunctionsInvokeError(
      { context: response, message: 'invoke failed' },
      'Could not place order.',
    )
    expect(parsed).toEqual({
      message: 'Nope',
      status: 400,
      retryAfter: undefined,
    })
  })
})
