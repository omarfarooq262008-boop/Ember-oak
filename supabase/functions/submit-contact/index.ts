/**
 * submit-contact — rate-limited contact form with honeypot.
 * Secrets only from Deno.env. Email failures never block the response.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import { z } from 'https://deno.land/x/zod@v3.23.8/mod.ts'
import { sendTransactionalEmail } from '../_shared/email.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
}

const BodySchema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email().max(254),
  phone: z.string().max(20).optional().nullable(),
  orderNumber: z.string().max(40).optional().nullable(),
  message: z.string().min(10).max(2000),
  /** Honeypot — must be empty */
  website: z.string().max(0).optional().nullable(),
})

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

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

  const raw = await req.json().catch(() => null)
  // Silent success for bots that fill honeypot
  if (raw && typeof raw === 'object' && (raw as { website?: string }).website) {
    return json({ ok: true })
  }

  const parsed = BodySchema.safeParse(raw)
  if (!parsed.success) {
    return json({ error: 'Invalid input' }, 400)
  }

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const limitId = `contact:${ip}`
  const { data: rl } = await admin.from('rate_limits').select('*').eq('id', limitId).maybeSingle()
  if (rl && rl.count >= 5 && Date.now() - new Date(rl.window_start).getTime() < 60_000) {
    return json({ error: 'Too many requests' }, 429)
  }
  if (!rl || Date.now() - new Date(rl.window_start).getTime() >= 60_000) {
    await admin.from('rate_limits').upsert({
      id: limitId,
      count: 1,
      window_start: new Date().toISOString(),
    })
  } else {
    await admin.from('rate_limits').update({ count: rl.count + 1 }).eq('id', limitId)
  }

  const orderRef = parsed.data.orderNumber?.trim()
  const body = orderRef
    ? `Order number: ${orderRef}\n\n${parsed.data.message.trim()}`
    : parsed.data.message.trim()

  const { data: inserted, error } = await admin
    .from('contact_messages')
    .insert({
      name: parsed.data.name.trim(),
      email: parsed.data.email.trim().toLowerCase(),
      phone: parsed.data.phone?.trim() || null,
      message: body,
    })
    .select('id')
    .maybeSingle()

  if (error) {
    return json({ error: 'Could not save message' }, 500)
  }

  const notifyTo =
    Deno.env.get('STORE_NOTIFY_EMAIL') ??
    Deno.env.get('EMAIL_FROM')?.match(/<([^>]+)>/)?.[1] ??
    null
  if (notifyTo && notifyTo.includes('@') && inserted?.id) {
    void sendTransactionalEmail(admin, {
      idempotencyKey: `contact_notification:${inserted.id}`,
      template: 'contact_notification',
      to: notifyTo,
      data: {
        orderNumber: 'n/a',
        contactName: parsed.data.name.trim(),
        contactMessage: body,
      },
    })
  }

  return json({ ok: true })
})
