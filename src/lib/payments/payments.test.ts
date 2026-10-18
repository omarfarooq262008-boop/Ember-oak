import { describe, expect, it } from 'vitest'

import {
  applyStockReleaseOnce,
  applyWebhookEventIdempotent,
  assertMockProviderAllowed,
  hmacSha256Hex,
  verifyMockWebhookSignature,
} from './hmac'

describe('mock webhook signature', () => {
  it('accepts a valid HMAC signature', async () => {
    const secret = 'test-webhook-secret'
    const body = JSON.stringify({
      event_id: 'evt_1',
      order_number: 'EO-ABC',
      outcome: 'paid',
    })
    const sig = await hmacSha256Hex(secret, body)
    expect(await verifyMockWebhookSignature(secret, body, sig)).toBe(true)
  })

  it('rejects a forged webhook signature', async () => {
    const secret = 'test-webhook-secret'
    const body = JSON.stringify({
      event_id: 'evt_1',
      order_number: 'EO-ABC',
      outcome: 'paid',
    })
    const forged = await hmacSha256Hex('wrong-secret', body)
    expect(await verifyMockWebhookSignature(secret, body, forged)).toBe(false)
    expect(await verifyMockWebhookSignature(secret, body, 'deadbeef')).toBe(false)
  })
})

describe('mock provider gate', () => {
  it('refuses mock signing when PAYMENT_PROVIDER is not mock', () => {
    expect(() => assertMockProviderAllowed('safepay')).toThrow('MOCK_PROVIDER_REQUIRED')
    expect(() => assertMockProviderAllowed('payfast')).toThrow('MOCK_PROVIDER_REQUIRED')
    expect(() => assertMockProviderAllowed('xpay')).toThrow('MOCK_PROVIDER_REQUIRED')
  })

  it('allows mock when provider is mock or unset', () => {
    expect(() => assertMockProviderAllowed('mock')).not.toThrow()
    expect(() => assertMockProviderAllowed(undefined)).not.toThrow()
  })
})

describe('webhook idempotency', () => {
  it('ignores duplicate event ids', () => {
    const seen = new Set<string>()
    let paid = false
    const first = applyWebhookEventIdempotent(seen, 'evt_1', () => {
      paid = true
    })
    expect(first).toEqual({ applied: true, idempotent: false })
    expect(paid).toBe(true)

    paid = false
    const second = applyWebhookEventIdempotent(seen, 'evt_1', () => {
      paid = true
    })
    expect(second).toEqual({ applied: false, idempotent: true })
    expect(paid).toBe(false)
  })
})

describe('abandoned stock release once', () => {
  it('releases stock exactly once after due time', () => {
    const due = '2026-01-01T00:00:00.000Z'
    const now = '2026-01-01T00:31:00.000Z'
    const first = applyStockReleaseOnce({
      status: 'pending_payment',
      stockReleasedAt: null,
      paymentDueAt: due,
      now,
    })
    expect(first.released).toBe(true)
    expect(first.status).toBe('cancelled')
    expect(first.stockReleasedAt).toBe(now)

    const second = applyStockReleaseOnce({
      status: first.status,
      stockReleasedAt: first.stockReleasedAt,
      paymentDueAt: due,
      now: '2026-01-01T01:00:00.000Z',
    })
    expect(second.released).toBe(false)
    expect(second.stockReleasedAt).toBe(now)
  })

  it('does not release before due or when already paid path', () => {
    expect(
      applyStockReleaseOnce({
        status: 'pending_payment',
        stockReleasedAt: null,
        paymentDueAt: '2026-01-01T01:00:00.000Z',
        now: '2026-01-01T00:30:00.000Z',
      }).released,
    ).toBe(false)

    expect(
      applyStockReleaseOnce({
        status: 'awaiting_fulfilment',
        stockReleasedAt: null,
        paymentDueAt: '2026-01-01T00:00:00.000Z',
        now: '2026-01-01T01:00:00.000Z',
      }).released,
    ).toBe(false)
  })
})
