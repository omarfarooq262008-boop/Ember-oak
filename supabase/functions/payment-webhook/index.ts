/**
 * payment-webhook — verifies provider signature, applies payment idempotently.
 * verify_jwt = false (signature is the auth).
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import { corsHeaders, json } from '../_shared/cors.ts'
import { getPaymentProvider } from '../_shared/payments.ts'
import { sendTransactionalEmail } from '../_shared/email.ts'
import {
  enforceRateLimit,
  getClientIp,
  rateLimitResponse,
} from '../_shared/rateLimit.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405)
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !serviceKey) {
    return json({ error: 'Server misconfigured' }, 500)
  }
  const admin = createClient(supabaseUrl, serviceKey)

  const ip = getClientIp(req)
  const limited = await enforceRateLimit(admin, 'payment-webhook', ip)
  if (!limited.allowed) {
    return rateLimitResponse(limited.retryAfterSeconds)
  }

  const provider = getPaymentProvider()
  const rawBody = await req.text()

  let verified
  try {
    verified = await provider.verifyWebhook(req.headers, rawBody)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'verify failed'
    await admin.from('app_events').insert({
      event_type: 'payment_webhook_rejected',
      payload: { error: msg, provider: provider.name },
    })
    return json({ error: 'Invalid signature or payload' }, 401)
  }

  const { data, error } = await admin.rpc('apply_payment_webhook', {
    p_provider: provider.name,
    p_event_id: verified.eventId,
    p_order_number: verified.orderNumber,
    p_outcome: verified.outcome,
    p_provider_ref: verified.providerRef,
    p_payload: verified.raw,
  })

  if (error) {
    await admin.from('app_events').insert({
      event_type: 'payment_webhook_apply_failed',
      payload: { error: error.message, eventId: verified.eventId },
    })
    return json({ error: error.message }, 400)
  }

  const result = data as {
    idempotent?: boolean
    order_number?: string
    status?: string
    outcome?: string
  }

  // Fire-and-forget emails — never block the webhook response
  if (!result.idempotent) {
    const { data: order } = await admin
      .from('orders')
      .select('email, order_number, shipping_name, total')
      .eq('order_number', verified.orderNumber)
      .maybeSingle()
    if (order?.email) {
      const appUrl = (Deno.env.get('APP_URL') ?? 'http://localhost:5173').replace(
        /\/$/,
        '',
      )
      if (verified.outcome === 'paid') {
        void sendTransactionalEmail(admin, {
          idempotencyKey: `order_confirmation:${verified.orderNumber}`,
          template: 'order_confirmation',
          to: order.email,
          data: {
            orderNumber: order.order_number,
            customerName: order.shipping_name ?? undefined,
            total: `PKR ${Number(order.total).toLocaleString('en-PK')}`,
            paid: true,
          },
        })
      } else if (verified.outcome === 'failed') {
        void sendTransactionalEmail(admin, {
          idempotencyKey: `payment_failed:${verified.orderNumber}:${verified.eventId}`,
          template: 'payment_failed',
          to: order.email,
          data: {
            orderNumber: order.order_number,
            customerName: order.shipping_name ?? undefined,
            retryUrl: `${appUrl}/mock-checkout?order=${encodeURIComponent(order.order_number)}`,
          },
        })
      }
    }
  }

  return json({ ok: true, ...result })
})
