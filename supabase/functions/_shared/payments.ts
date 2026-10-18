/**
 * Provider-agnostic payment layer.
 * Selected by PAYMENT_PROVIDER secret: mock | safepay | payfast | xpay
 *
 * Real Safepay / PayFast / XPay endpoints are NOT invented here —
 * only clearly marked skeletons remain until credentials and docs are wired.
 */

export type PaymentProviderName = 'mock' | 'safepay' | 'payfast' | 'xpay'

export type CheckoutInput = {
  orderId: string
  orderNumber: string
  amount: number
  currency: string
  customerEmail: string
  successUrl: string
  cancelUrl: string
}

export type CheckoutResult = {
  checkoutUrl: string
  provider: PaymentProviderName
  providerSessionId?: string
}

export type WebhookVerification = {
  eventId: string
  orderNumber: string
  outcome: 'paid' | 'failed' | 'cancelled'
  providerRef: string | null
  raw: Record<string, unknown>
}

export type RefundInput = {
  orderNumber: string
  amount: number
  currency: string
  providerRef: string | null
}

export type RefundResult = {
  ok: boolean
  providerRefundRef: string | null
  message?: string
}

export interface PaymentProvider {
  name: PaymentProviderName
  createCheckout(input: CheckoutInput): Promise<CheckoutResult>
  verifyWebhook(
    headers: Headers,
    rawBody: string,
  ): Promise<WebhookVerification>
  refund(input: RefundInput): Promise<RefundResult>
}

function requireEnv(name: string): string {
  const v = Deno.env.get(name)
  if (!v) throw new Error(`Missing secret ${name}`)
  return v
}

export function getPaymentProviderName(): PaymentProviderName {
  const raw = (Deno.env.get('PAYMENT_PROVIDER') ?? 'mock').toLowerCase().trim()
  if (raw === 'safepay' || raw === 'payfast' || raw === 'xpay' || raw === 'mock') {
    return raw
  }
  return 'mock'
}

/** HMAC-SHA256 hex digest */
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

// ---------------------------------------------------------------------------
// Mock provider
// ---------------------------------------------------------------------------
export class MockPaymentProvider implements PaymentProvider {
  name: PaymentProviderName = 'mock'

  async createCheckout(input: CheckoutInput): Promise<CheckoutResult> {
    const appUrl = (Deno.env.get('APP_URL') ?? 'http://localhost:5173').replace(/\/$/, '')
    const params = new URLSearchParams({
      order: input.orderNumber,
      amount: String(input.amount),
      currency: input.currency,
      email: input.customerEmail,
      success: input.successUrl,
      cancel: input.cancelUrl,
    })
    return {
      checkoutUrl: `${appUrl}/mock-checkout?${params.toString()}`,
      provider: 'mock',
      providerSessionId: `mock_${input.orderNumber}`,
    }
  }

  async verifyWebhook(headers: Headers, rawBody: string): Promise<WebhookVerification> {
    const secret = Deno.env.get('PAYMENT_WEBHOOK_SECRET') ?? Deno.env.get('MOCK_WEBHOOK_SECRET')
    if (!secret) throw new Error('Missing PAYMENT_WEBHOOK_SECRET')

    const signature = headers.get('x-payment-signature') ?? ''
    const expected = await hmacSha256Hex(secret, rawBody)
    if (!(await timingSafeEqualHex(signature, expected))) {
      throw new Error('INVALID_SIGNATURE')
    }

    const body = JSON.parse(rawBody) as Record<string, unknown>
    const outcome = String(body.outcome ?? '')
    if (outcome !== 'paid' && outcome !== 'failed' && outcome !== 'cancelled') {
      throw new Error('INVALID_OUTCOME')
    }
    const eventId = String(body.event_id ?? '')
    const orderNumber = String(body.order_number ?? '')
    if (!eventId || !orderNumber) throw new Error('INVALID_PAYLOAD')

    return {
      eventId,
      orderNumber,
      outcome,
      providerRef: body.provider_ref ? String(body.provider_ref) : null,
      raw: body,
    }
  }

  async refund(input: RefundInput): Promise<RefundResult> {
    return {
      ok: true,
      providerRefundRef: `mock_refund_${input.orderNumber}_${Date.now()}`,
      message: 'Mock refund recorded',
    }
  }
}

// ---------------------------------------------------------------------------
// Skeletons — do NOT invent real API endpoints
// ---------------------------------------------------------------------------
export class SafepaySkeletonProvider implements PaymentProvider {
  name: PaymentProviderName = 'safepay'

  async createCheckout(_input: CheckoutInput): Promise<CheckoutResult> {
    // TODO(Safepay): call Safepay checkout session API with SAFEPAY_API_KEY /
    // SAFEPAY_SECRET from Deno.env. Return hosted checkout URL from their response.
    throw new Error(
      'Safepay provider not configured. Set PAYMENT_PROVIDER=mock or implement Safepay API from their docs.',
    )
  }

  async verifyWebhook(_headers: Headers, _rawBody: string): Promise<WebhookVerification> {
    // TODO(Safepay): verify webhook signature per Safepay docs using SAFEPAY_WEBHOOK_SECRET.
    throw new Error('Safepay webhook verification not implemented')
  }

  async refund(_input: RefundInput): Promise<RefundResult> {
    // TODO(Safepay): call Safepay refund endpoint.
    throw new Error('Safepay refund not implemented')
  }
}

export class PayFastSkeletonProvider implements PaymentProvider {
  name: PaymentProviderName = 'payfast'

  async createCheckout(_input: CheckoutInput): Promise<CheckoutResult> {
    // TODO(PayFast): build PayFast process URL / form fields per PayFast merchant docs.
    // Use PAYFAST_MERCHANT_ID, PAYFAST_MERCHANT_KEY, PAYFAST_PASSPHRASE from Deno.env.
    throw new Error(
      'PayFast provider not configured. Set PAYMENT_PROVIDER=mock or implement PayFast from their docs.',
    )
  }

  async verifyWebhook(_headers: Headers, _rawBody: string): Promise<WebhookVerification> {
    // TODO(PayFast): validate ITN signature and server confirmation per PayFast docs.
    throw new Error('PayFast webhook verification not implemented')
  }

  async refund(_input: RefundInput): Promise<RefundResult> {
    // TODO(PayFast): refund via PayFast API if available for your account type.
    throw new Error('PayFast refund not implemented')
  }
}

export class XPaySkeletonProvider implements PaymentProvider {
  name: PaymentProviderName = 'xpay'

  async createCheckout(_input: CheckoutInput): Promise<CheckoutResult> {
    // TODO(XPay): create XPay checkout session with XPAY_API_KEY / XPAY_SECRET.
    throw new Error(
      'XPay provider not configured. Set PAYMENT_PROVIDER=mock or implement XPay from their docs.',
    )
  }

  async verifyWebhook(_headers: Headers, _rawBody: string): Promise<WebhookVerification> {
    // TODO(XPay): verify webhook signature per XPay docs.
    throw new Error('XPay webhook verification not implemented')
  }

  async refund(_input: RefundInput): Promise<RefundResult> {
    // TODO(XPay): call XPay refund endpoint.
    throw new Error('XPay refund not implemented')
  }
}

export function getPaymentProvider(): PaymentProvider {
  const name = getPaymentProviderName()
  switch (name) {
    case 'safepay':
      return new SafepaySkeletonProvider()
    case 'payfast':
      return new PayFastSkeletonProvider()
    case 'xpay':
      return new XPaySkeletonProvider()
    case 'mock':
    default:
      return new MockPaymentProvider()
  }
}

export async function signMockWebhookPayload(
  payload: Record<string, unknown>,
): Promise<{ body: string; signature: string }> {
  if (getPaymentProviderName() !== 'mock') {
    throw new Error('MOCK_PROVIDER_REQUIRED')
  }
  const secret =
    Deno.env.get('PAYMENT_WEBHOOK_SECRET') ?? Deno.env.get('MOCK_WEBHOOK_SECRET')
  if (!secret) throw new Error('Missing PAYMENT_WEBHOOK_SECRET')
  const body = JSON.stringify(payload)
  const signature = await hmacSha256Hex(secret, body)
  return { body, signature }
}

// Silence unused helper warning in skeletons that may call requireEnv later
void requireEnv
