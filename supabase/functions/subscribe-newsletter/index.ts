/**
 * subscribe-newsletter — rate-limited newsletter signup with honeypot + min fill time.
 * Secrets only from Deno.env.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import { z } from 'https://deno.land/x/zod@v3.23.8/mod.ts'
import { corsHeaders, json } from '../_shared/cors.ts'
import {
  enforceRateLimit,
  getClientIp,
  rateLimitResponse,
} from '../_shared/rateLimit.ts'
import { MIN_FORM_TIME_MS } from '../_shared/rateLimitConfig.ts'

const BodySchema = z.object({
  email: z.string().email().max(254),
  source: z.string().max(64).optional().nullable(),
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
  if (raw && typeof raw === 'object' && (raw as { website?: string }).website) {
    return json({ ok: true })
  }

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
    return json({ error: 'Enter a valid email address.' }, 400)
  }

  const ip = getClientIp(req)
  const limited = await enforceRateLimit(admin, 'subscribe-newsletter', ip)
  if (!limited.allowed) {
    return rateLimitResponse(limited.retryAfterSeconds)
  }

  const email = parsed.data.email.trim().toLowerCase()
  const { error } = await admin.from('newsletter_subscribers').upsert(
    {
      email,
      source: parsed.data.source?.trim() || 'website',
    },
    { onConflict: 'email', ignoreDuplicates: true },
  )

  if (error) {
    return json({ error: 'Could not subscribe right now.' }, 500)
  }

  return json({ ok: true })
})
