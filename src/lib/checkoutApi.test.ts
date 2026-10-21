import { afterEach, describe, expect, it, vi } from 'vitest'

import { RATE_LIMIT_UI_MESSAGE } from './rateLimit'

const invoke = vi.fn()

vi.mock('@/lib/supabase', () => ({
  isSupabaseConfigured: true,
  supabase: {
    functions: {
      invoke: (...args: unknown[]) => invoke(...args),
    },
  },
}))

describe('checkoutApi 429 handling', () => {
  afterEach(() => {
    invoke.mockReset()
  })

  it('createOrderRemote shows the rate-limit message from a 429 response', async () => {
    const { createOrderRemote } = await import('./checkoutApi')
    invoke.mockResolvedValue({
      data: null,
      error: {
        message: 'Edge Function returned a non-2xx status code',
        context: new Response(
          JSON.stringify({ error: RATE_LIMIT_UI_MESSAGE }),
          {
            status: 429,
            headers: {
              'Content-Type': 'application/json',
              'Retry-After': '120',
            },
          },
        ),
      },
    })

    const result = await createOrderRemote({
      email: 'a@b.co',
      phone: '03001234567',
      paymentMethod: 'cod',
      shipping: {
        name: 'Test User',
        phone: '03001234567',
        address: 'Street 1',
        city: 'Karachi',
        province: 'Sindh',
      },
      items: [{ variantId: '00000000-0000-4000-8000-000000000001', quantity: 1 }],
      idempotencyKey: 'idem-test-key-1',
    })

    expect(result).toEqual({
      ok: false,
      message: RATE_LIMIT_UI_MESSAGE,
      status: 429,
    })
  })

  it('submitContactRemote surfaces 429 body errors for the UI', async () => {
    const { submitContactRemote } = await import('./checkoutApi')
    invoke.mockResolvedValue({
      data: null,
      error: {
        context: new Response(
          JSON.stringify({ error: RATE_LIMIT_UI_MESSAGE }),
          { status: 429, headers: { 'Retry-After': '3600' } },
        ),
      },
    })

    const result = await submitContactRemote({
      name: 'Ada',
      email: 'ada@example.com',
      message: 'Hello there, I need help with an order.',
      formStartedAt: Date.now() - 5000,
    })

    expect(result).toEqual({
      ok: false,
      message: RATE_LIMIT_UI_MESSAGE,
    })
  })

  it('subscribeNewsletterRemote surfaces 429 body errors for the UI', async () => {
    const { subscribeNewsletterRemote } = await import('./checkoutApi')
    invoke.mockResolvedValue({
      data: null,
      error: {
        context: new Response(
          JSON.stringify({ error: RATE_LIMIT_UI_MESSAGE }),
          { status: 429 },
        ),
      },
    })

    const result = await subscribeNewsletterRemote({
      email: 'ada@example.com',
      formStartedAt: Date.now() - 5000,
    })

    expect(result).toEqual({
      ok: false,
      message: RATE_LIMIT_UI_MESSAGE,
    })
  })
})
