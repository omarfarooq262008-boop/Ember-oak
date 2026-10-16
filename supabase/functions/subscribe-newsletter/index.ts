/**
 * subscribe-newsletter — rate-limited newsletter signup with honeypot.
 * Secrets only from Deno.env.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import { z } from 'https://deno.land/x/zod@v3.23.8/mod.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
}

const BodySchema = z.object({
  email: z.string().email().max(254),
  source: z.string().max(64).optional().nullable(),
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
  if (raw && typeof raw === 'object' && (raw as { website?: string }).website) {
    return json({ ok: true })
  }

  const parsed = BodySchema.safeParse(raw)
  if (!parsed.success) {
    return json({ error: 'Enter a valid email address.' }, 400)
  }

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const limitId = `newsletter:${ip}`
  const { data: rl } = await admin.from('rate_limits').select('*').eq('id', limitId).maybeSingle()
  if (rl && rl.count >= 10 && Date.now() - new Date(rl.window_start).getTime() < 60_000) {
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
