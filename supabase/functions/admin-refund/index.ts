/**
 * admin-refund — calls provider.refund(), then admin_refund_order RPC.
 * Stock is NOT restored here (only on cancel).
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import { z } from 'https://deno.land/x/zod@v3.23.8/mod.ts'
import { corsHeaders, json } from '../_shared/cors.ts'
import { getPaymentProvider } from '../_shared/payments.ts'
import { sendTransactionalEmail } from '../_shared/email.ts'

const BodySchema = z.object({
  orderId: z.string().uuid(),
})

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405)
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? Deno.env.get('SUPABASE_PUBLISHABLE_KEY')
  if (!supabaseUrl || !serviceKey || !anonKey) {
    return json({ error: 'Server misconfigured' }, 500)
  }

  const authHeader = req.headers.get('Authorization') ?? ''
  if (!authHeader.startsWith('Bearer ')) {
    return json({ error: 'Unauthorized' }, 401)
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  })
  const admin = createClient(supabaseUrl, serviceKey)

  const { data: userData } = await userClient.auth.getUser()
  if (!userData.user) {
    return json({ error: 'Unauthorized' }, 401)
  }
  const { data: profile } = await admin
    .from('profiles')
    .select('is_admin')
    .eq('id', userData.user.id)
    .maybeSingle()
  if (!profile?.is_admin) {
    return json({ error: 'Forbidden' }, 403)
  }

  const raw = await req.json().catch(() => null)
  const parsed = BodySchema.safeParse(raw)
  if (!parsed.success) {
    return json({ error: 'Invalid input' }, 400)
  }

  const { data: order, error: orderErr } = await admin
    .from('orders')
    .select('id, order_number, email, shipping_name, total, status, payment_method')
    .eq('id', parsed.data.orderId)
    .maybeSingle()

  if (orderErr || !order) {
    return json({ error: 'Order not found' }, 404)
  }

  const { data: payment } = await admin
    .from('payments')
    .select('provider_ref, status, amount')
    .eq('order_id', order.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  let providerRefundRef: string | null = null
  if (order.payment_method === 'card' && payment?.status === 'paid') {
    try {
      const provider = getPaymentProvider()
      const refund = await provider.refund({
        orderNumber: order.order_number,
        amount: Number(payment.amount ?? order.total),
        currency: 'PKR',
        providerRef: payment.provider_ref ?? null,
      })
      if (!refund.ok) {
        return json({ error: refund.message ?? 'Provider refund failed' }, 502)
      }
      providerRefundRef = refund.providerRefundRef
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'refund failed'
      await admin.from('app_events').insert({
        event_type: 'refund_provider_failed',
        payload: { orderNumber: order.order_number, error: msg },
      })
      return json({ error: msg }, 502)
    }
  }

  // Run RPC as the authenticated admin (RLS / require_admin)
  const { data: rpcData, error: rpcErr } = await userClient.rpc('admin_refund_order', {
    p_order_id: order.id,
    p_provider_refund_ref: providerRefundRef,
  })

  if (rpcErr) {
    return json({ error: rpcErr.message }, 400)
  }

  if (order.email) {
    void sendTransactionalEmail(admin, {
      idempotencyKey: `order_refunded:${order.order_number}`,
      template: 'order_refunded',
      to: order.email,
      data: {
        orderNumber: order.order_number,
        customerName: order.shipping_name ?? undefined,
      },
    })
  }

  return json({ ok: true, result: rpcData })
})
