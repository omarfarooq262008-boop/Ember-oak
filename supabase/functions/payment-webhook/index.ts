/**
 * payment-webhook — verifies provider signature, applies payment idempotently.
 * verify_jwt = false (signature is the auth).
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import { corsHeaders, json } from '../_shared/cors.ts'
import { getPaymentProvider } from '../_shared/payments.ts'
import { sendTransactionalEmail } from '../_shared/email.ts'

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

  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('cf-connecting-ip') ??
    'unknown'
  const rlId = `payment-webhook:${ip}`
  const { data: rl } = await admin.from('rate_limits').select('*').eq('id', rlId).maybeSingle()
  const now = Date.now()
  if (rl && rl.count >= 60 && now - new Date(rl.window_start).getTime() < 60_000) {
    return json({ error: 'Too many requests' }, 429)
  }
  if (!rl || now - new Date(rl.window_start).getTime() >= 60_000) {
    await admin.from('rate_limits').upsert({
      id: rlId,
      count: 1,
      window_start: new Date().toISOString(),
    })
  } else {
    await admin.from('rate_limits').update({ count: rl.count + 1 }).eq('id', rlId)
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

  // Fire-and-forget email on first successful paid webhook
  if (!result.idempotent && verified.outcome === 'paid') {
    const { data: order } = await admin
      .from('orders')
      .select('email, order_number, shipping_name')
      .eq('order_number', verified.orderNumber)
      .maybeSingle()
    if (order?.email) {
      void sendTransactionalEmail(admin, {
        idempotencyKey: `payment_received:${verified.orderNumber}`,
        template: 'payment_received',
        to: order.email,
        data: {
          orderNumber: order.order_number,
          customerName: order.shipping_name ?? undefined,
        },
      })
    }
  }

  return json({ ok: true, ...result })
})
