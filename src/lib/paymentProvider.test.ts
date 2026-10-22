import { describe, expect, it } from 'vitest'

import {
  isMockPaymentProvider,
  resolveMockCheckoutAccess,
} from './paymentProvider'

describe('mock checkout gate', () => {
  it('allows /mock-checkout when the server reports mock', () => {
    expect(
      resolveMockCheckoutAccess({ loading: false, provider: 'mock' }),
    ).toBe('checkout')
    expect(isMockPaymentProvider('mock')).toBe(true)
    expect(isMockPaymentProvider('MOCK')).toBe(true)
  })

  it('shows the 404 path when the provider is not mock', () => {
    expect(
      resolveMockCheckoutAccess({ loading: false, provider: 'safepay' }),
    ).toBe('notfound')
    expect(
      resolveMockCheckoutAccess({ loading: false, provider: 'payfast' }),
    ).toBe('notfound')
    expect(
      resolveMockCheckoutAccess({ loading: false, provider: 'xpay' }),
    ).toBe('notfound')
    expect(isMockPaymentProvider('safepay')).toBe(false)
  })

  it('stays on loading until the server flag arrives', () => {
    expect(
      resolveMockCheckoutAccess({ loading: true, provider: null }),
    ).toBe('loading')
  })

  it('fails closed (404) when the provider flag cannot be fetched', () => {
    expect(
      resolveMockCheckoutAccess({
        loading: false,
        provider: null,
        error: true,
      }),
    ).toBe('notfound')
  })
})
