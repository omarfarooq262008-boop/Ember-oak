/**
 * submit-contact — rate-limited contact form with honeypot + minimum fill time.
 * Secrets only from Deno.env. Email failures never block the response.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import { z } from 'https://deno.land/x/zod@v3.23.8/mod.ts'
import { corsHeaders, json } from '../_shared/cors.ts'
import { sendTransactionalEmail } from '../_shared/email.ts'
import {
  enforceRateLimit,
  getClientIp,
  rateLimitResponse,
} from '../_shared/rateLimit.ts'
import { MIN_FORM_TIME_MS } from '../_shared/rateLimitConfig.ts'

const BodySchema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email().max(254),
  phone: z.string().max(20).optional().nullable(),
  orderNumber: z.string().max(40).optional().nullable(),
  message: z.string().min(10).max(2000),
  /** Honeypot — must be empty */
  website: z.string().max(0).optional().nullable(),
  /** Client form open timestamp (ms). Bots that submit instantly are dropped. */
  formStartedAt: z.number().int().positive().optional().nullable(),
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
  if (!supabaseUrl || !serviceKey) {
    return json({ error: 'Server misconfigured' }, 500)
  }
  const admin = createClient(supabaseUrl, serviceKey)

  const raw = await req.json().catch(() => null)
  // Silent success for bots that fill honeypot
  if (raw && typeof raw === 'object' && (raw as { website?: string }).website) {
    return json({ ok: true })
  }

  // Silent success for instant submits (missing or too-fast formStartedAt)
  if (raw && typeof raw === 'object') {
    const started = (raw as { formStartedAt?: unknown }).formStartedAt
    if (
      typeof started !== 'number' ||
      !Number.isFinite(started) ||
      Date.now() - started < MIN_FORM_TIME_MS
    ) {
      return json({ ok: true })
    }
  }

  const parsed = BodySchema.safeParse(raw)
  if (!parsed.success) {
    return json({ error: 'Invalid input' }, 400)
  }

  const ip = getClientIp(req)
  const limited = await enforceRateLimit(admin, 'submit-contact', ip)
  if (!limited.allowed) {
    return rateLimitResponse(limited.retryAfterSeconds)
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

  // Contact notifications go only to STORE_NOTIFY_EMAIL (never guess from EMAIL_FROM).
  const notifyTo = (Deno.env.get('STORE_NOTIFY_EMAIL') ?? '').trim()
  if (!notifyTo || !notifyTo.includes('@')) {
    await admin.from('app_events').insert({
      event_type: 'email_send_failed',
      payload: {
        template: 'contact_notification',
        error:
          'STORE_NOTIFY_EMAIL secret is missing or invalid — contact message saved but no email was sent',
        contactMessageId: inserted?.id ?? null,
      },
      ip,
    })
  } else if (inserted?.id) {
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
