/**
 * send-order-email — transactional mail for status changes / outbox retry.
 * Authenticated admin OR service role. Failures return JSON but never throw
 * into order-transition callers (UI treats invoke as fire-and-forget).
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import { z } from 'https://deno.land/x/zod@v3.23.8/mod.ts'
import { corsHeaders, json } from '../_shared/cors.ts'
import {
  sendTransactionalEmail,
  type EmailTemplateId,
} from '../_shared/email.ts'

const BodySchema = z.object({
  orderId: z.string().uuid().optional(),
  orderNumber: z.string().min(4).max(64).optional(),
  outboxId: z.string().uuid().optional(),
  template: z
    .enum([
      'order_confirmation',
      'payment_received',
      'payment_failed',
      'order_shipped',
      'order_cancelled',
      'order_refunded',
      'contact_notification',
    ])
    .optional(),
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
  if (!supabaseUrl || !serviceKey) {
    return json({ error: 'Server misconfigured' }, 500)
  }
  const admin = createClient(supabaseUrl, serviceKey)

  const authHeader = req.headers.get('Authorization') ?? ''
  let isAllowed = false
  if (authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7)
    if (token === serviceKey) {
      isAllowed = true
    } else if (anonKey) {
      const userClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
      })
      const { data: userData } = await userClient.auth.getUser()
      if (userData.user) {
        const { data: profile } = await admin
          .from('profiles')
          .select('is_admin')
          .eq('id', userData.user.id)
          .maybeSingle()
        isAllowed = Boolean(profile?.is_admin)
      }
    }
  }
  if (!isAllowed) {
    return json({ error: 'Forbidden' }, 403)
  }

  const raw = await req.json().catch(() => null)
  const parsed = BodySchema.safeParse(raw)
  if (!parsed.success) {
    return json({ error: 'Invalid input' }, 400)
  }

  // Retry path: resend from email_outbox by id
  if (parsed.data.outboxId) {
    const { data: row, error } = await admin
      .from('email_outbox')
      .select('*')
      .eq('id', parsed.data.outboxId)
      .maybeSingle()
    if (error || !row) {
      return json({ error: 'Outbox row not found' }, 404)
    }
    if (row.status === 'sent') {
      return json({ ok: true, skipped: true })
    }
    const result = await sendTransactionalEmail(admin, {
      idempotencyKey: row.idempotency_key,
      template: row.template as EmailTemplateId,
      to: row.to_email,
      data: (row.payload ?? {}) as Parameters<typeof sendTransactionalEmail>[1]['data'],
    })
    return json({ ok: result.ok, skipped: result.skipped ?? false, error: result.error })
  }

  if (!parsed.data.template) {
    return json({ error: 'template or outboxId required' }, 400)
  }

  let q = admin
    .from('orders')
    .select(
      'id, order_number, email, shipping_name, total, tracking_number, payment_reference, status',
    )
  if (parsed.data.orderId) q = q.eq('id', parsed.data.orderId)
  else if (parsed.data.orderNumber) q = q.eq('order_number', parsed.data.orderNumber)
  else return json({ error: 'orderId or orderNumber required' }, 400)

  const { data: order, error } = await q.maybeSingle()
  if (error || !order?.email) {
    return json({ error: 'Order not found' }, 404)
  }

  const template = parsed.data.template as EmailTemplateId
  const appUrl = (Deno.env.get('APP_URL') ?? 'http://localhost:5173').replace(/\/$/, '')
  const result = await sendTransactionalEmail(admin, {
    idempotencyKey: `${template}:${order.order_number}`,
    template,
    to: order.email,
    data: {
      orderNumber: order.order_number,
      customerName: order.shipping_name ?? undefined,
      total: `PKR ${Number(order.total).toLocaleString('en-PK')}`,
      trackingNumber: order.tracking_number ?? undefined,
      paymentReference: order.payment_reference ?? undefined,
      paid: template === 'order_confirmation' && order.status !== 'pending_payment',
      retryUrl: `${appUrl}/mock-checkout?order=${encodeURIComponent(order.order_number)}`,
    },
  })

  // Always 200 so callers are not blocked by email failures
  return json({ ok: result.ok, skipped: result.skipped ?? false, error: result.error })
})
