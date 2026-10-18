/**
 * mock-sign-payment — signs a mock payment event server-side and applies it.
 * Refuses unless PAYMENT_PROVIDER=mock. Browser never holds the webhook secret.
 * verify_jwt = false (rate-limited; mock-only).
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import { z } from 'https://deno.land/x/zod@v3.23.8/mod.ts'
import { corsHeaders, json } from '../_shared/cors.ts'
import {
  getPaymentProviderName,
  signMockWebhookPayload,
} from '../_shared/payments.ts'
import { sendTransactionalEmail } from '../_shared/email.ts'

const BodySchema = z.object({
  orderNumber: z.string().min(4).max(64),
  outcome: z.enum(['paid', 'failed', 'cancelled']),
})

async function rateLimit(
  admin: ReturnType<typeof createClient>,
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<boolean> {
  const id = `mock-sign:${key}`
  const { data } = await admin.from('rate_limits').select('*').eq('id', id).maybeSingle()
  const now = Date.now()
  if (!data) {
    await admin.from('rate_limits').insert({
      id,
      count: 1,
      window_start: new Date().toISOString(),
    })
    return true
  }
  const start = new Date(data.window_start).getTime()
  if (now - start > windowSeconds * 1000) {
    await admin
      .from('rate_limits')
      .update({ count: 1, window_start: new Date().toISOString() })
      .eq('id', id)
    return true
  }
  if (data.count >= limit) return false
  await admin.from('rate_limits').update({ count: data.count + 1 }).eq('id', id)
  return true
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405)
  }

  if (getPaymentProviderName() !== 'mock') {
    return json(
      { error: 'Mock checkout is disabled. PAYMENT_PROVIDER is not mock.' },
      403,
    )
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !serviceKey) {
    return json({ error: 'Server misconfigured' }, 500)
  }
  const admin = createClient(supabaseUrl, serviceKey)

  const raw = await req.json().catch(() => null)
  const parsed = BodySchema.safeParse(raw)
  if (!parsed.success) {
    return json({ error: 'Invalid input' }, 400)
  }
  const { orderNumber, outcome } = parsed.data

  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('cf-connecting-ip') ??
    'unknown'
  const allowed = await rateLimit(admin, `${ip}:${orderNumber}`, 20, 60)
  if (!allowed) {
    return json({ error: 'Too many requests' }, 429)
  }

  const { data: order } = await admin
    .from('orders')
    .select('id, order_number, email, shipping_name, status, payment_method')
    .eq('order_number', orderNumber)
    .maybeSingle()

  if (!order) {
    return json({ error: 'Order not found' }, 404)
  }
  if (order.payment_method !== 'card') {
    return json({ error: 'Order is not a card checkout' }, 400)
  }

  const eventId = `mock_${orderNumber}_${outcome}_${crypto.randomUUID()}`
  const payload = {
    event_id: eventId,
    order_number: orderNumber,
    outcome,
    provider_ref: `mock_ref_${eventId}`,
  }

  let signed
  try {
    signed = await signMockWebhookPayload(payload)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'sign failed'
    return json({ error: msg }, msg === 'MOCK_PROVIDER_REQUIRED' ? 403 : 500)
  }

  // Apply via the same RPC the webhook uses (signature verified for audit trail)
  const expectedProvider = 'mock'
  // Re-verify with MockPaymentProvider path: call apply directly after sign proof
  const { data, error } = await admin.rpc('apply_payment_webhook', {
    p_provider: expectedProvider,
    p_event_id: eventId,
    p_order_number: orderNumber,
    p_outcome: outcome,
    p_provider_ref: payload.provider_ref,
    p_payload: { ...payload, signature: signed.signature },
  })

  if (error) {
    return json({ error: error.message }, 400)
  }

  const result = data as { idempotent?: boolean; status?: string }

  const appUrl = (Deno.env.get('APP_URL') ?? 'http://localhost:5173').replace(/\/$/, '')

  if (!result.idempotent && order.email) {
    if (outcome === 'paid') {
      void sendTransactionalEmail(admin, {
        idempotencyKey: `order_confirmation:${orderNumber}`,
        template: 'order_confirmation',
        to: order.email,
        data: {
          orderNumber,
          customerName: order.shipping_name ?? undefined,
          paid: true,
        },
      })
    } else if (outcome === 'failed') {
      void sendTransactionalEmail(admin, {
        idempotencyKey: `payment_failed:${orderNumber}:${eventId}`,
        template: 'payment_failed',
        to: order.email,
        data: {
          orderNumber,
          customerName: order.shipping_name ?? undefined,
          retryUrl: `${appUrl}/mock-checkout?order=${encodeURIComponent(orderNumber)}`,
        },
      })
    }
  }

  const redirectUrl =
    outcome === 'paid'
      ? `${appUrl}/order-confirmation/${encodeURIComponent(orderNumber)}?paid=1`
      : `${appUrl}/checkout?payment=${outcome}`

  return json({
    ok: true,
    outcome,
    status: result.status,
    redirectUrl,
    // signature returned only for debugging/tests — never a secret
    signedEventId: eventId,
  })
})
