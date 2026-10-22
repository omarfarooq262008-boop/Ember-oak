import { describe, expect, it } from 'vitest'

import {
  isMockPaymentProvider,
  resolveMockCheckoutAccess,
} from './paymentProvider'

describe('mock checkout gate', () => {
  it('renders checkout when VITE_DEMO_MODE is true (demoMode)', () => {
    expect(
      resolveMockCheckoutAccess({
        loading: false,
        provider: null,
        error: true,
        demoMode: true,
      }),
    ).toBe('checkout')
    expect(
      resolveMockCheckoutAccess({
        loading: true,
        provider: 'safepay',
        demoMode: true,
      }),
    ).toBe('checkout')
  })

  it('shows the 404 page when demoMode is off and provider is not mock', () => {
    expect(
      resolveMockCheckoutAccess({
        loading: false,
        provider: 'safepay',
        demoMode: false,
      }),
    ).toBe('notfound')
    expect(
      resolveMockCheckoutAccess({
        loading: false,
        provider: null,
        error: true,
        demoMode: false,
      }),
    ).toBe('notfound')
  })

  it('allows /mock-checkout when the server reports mock (non-demo)', () => {
    expect(
      resolveMockCheckoutAccess({
        loading: false,
        provider: 'mock',
        demoMode: false,
      }),
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

  it('stays on loading until the server flag arrives (non-demo)', () => {
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
