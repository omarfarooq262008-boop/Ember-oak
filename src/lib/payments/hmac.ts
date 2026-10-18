/** Browser/Node-portable HMAC helpers mirroring edge payments.ts */

export async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message))
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

export async function timingSafeEqualHex(a: string, b: string): Promise<boolean> {
  if (a.length !== b.length) return false
  const ae = new TextEncoder().encode(a)
  const be = new TextEncoder().encode(b)
  let out = 0
  for (let i = 0; i < ae.length; i++) out |= ae[i]! ^ be[i]!
  return out === 0
}

export async function verifyMockWebhookSignature(
  secret: string,
  rawBody: string,
  signature: string,
): Promise<boolean> {
  const expected = await hmacSha256Hex(secret, rawBody)
  return timingSafeEqualHex(signature, expected)
}

export function assertMockProviderAllowed(provider: string | undefined): void {
  if ((provider ?? 'mock').toLowerCase().trim() !== 'mock') {
    throw new Error('MOCK_PROVIDER_REQUIRED')
  }
}

/** Pure model of stock-release-once semantics used by release_abandoned_pending_payments */
export function applyStockReleaseOnce(order: {
  status: string
  stockReleasedAt: string | null
  paymentDueAt: string
  now: string
}): { released: boolean; stockReleasedAt: string | null; status: string } {
  if (order.status !== 'pending_payment') {
    return {
      released: false,
      stockReleasedAt: order.stockReleasedAt,
      status: order.status,
    }
  }
  if (order.stockReleasedAt) {
    return {
      released: false,
      stockReleasedAt: order.stockReleasedAt,
      status: order.status,
    }
  }
  if (new Date(order.paymentDueAt) >= new Date(order.now)) {
    return {
      released: false,
      stockReleasedAt: null,
      status: order.status,
    }
  }
  return {
    released: true,
    stockReleasedAt: order.now,
    status: 'cancelled',
  }
}

/** Pure webhook idempotency: known event ids change nothing */
export function applyWebhookEventIdempotent(
  seenEventIds: Set<string>,
  eventId: string,
  apply: () => void,
): { applied: boolean; idempotent: boolean } {
  if (seenEventIds.has(eventId)) {
    return { applied: false, idempotent: true }
  }
  seenEventIds.add(eventId)
  apply()
  return { applied: true, idempotent: false }
}
