/**
 * Public payment-provider flag from the health Edge Function.
 * Mirrors Supabase secret PAYMENT_PROVIDER without exposing secrets to VITE_*.
 */

export type PaymentProviderName = 'mock' | 'safepay' | 'payfast' | 'xpay'

export type MockCheckoutAccess = 'loading' | 'checkout' | 'notfound'

export function isMockPaymentProvider(
  name: string | null | undefined,
): boolean {
  return (name ?? '').trim().toLowerCase() === 'mock'
}

/**
 * Gate for /mock-checkout: only show the page when the server says provider is mock.
 * Real protection remains on mock-sign-payment (refuses unless PAYMENT_PROVIDER=mock).
 */
export function resolveMockCheckoutAccess(opts: {
  loading: boolean
  provider: string | null | undefined
  /** Failed to learn provider — fail closed (404), never open mock UI. */
  error?: boolean
}): MockCheckoutAccess {
  if (opts.loading) return 'loading'
  if (opts.error) return 'notfound'
  return isMockPaymentProvider(opts.provider) ? 'checkout' : 'notfound'
}

export async function fetchPaymentProviderName(): Promise<{
  provider: PaymentProviderName | null
  error: boolean
}> {
  const base = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.replace(
    /\/$/,
    '',
  )
  if (!base) return { provider: null, error: true }

  try {
    const res = await fetch(`${base}/functions/v1/health`, { method: 'GET' })
    const body = (await res.json().catch(() => null)) as {
      paymentProvider?: string
    } | null
    if (!res.ok) return { provider: null, error: true }
    const raw = (body?.paymentProvider ?? '').trim().toLowerCase()
    if (raw === 'mock' || raw === 'safepay' || raw === 'payfast' || raw === 'xpay') {
      return { provider: raw, error: false }
    }
    return { provider: null, error: true }
  } catch {
    return { provider: null, error: true }
  }
}
