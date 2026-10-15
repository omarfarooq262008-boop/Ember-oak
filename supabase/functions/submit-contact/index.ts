/**
 * submit-contact — rate-limited contact form persistence.
 * Service role only; never expose in VITE_* vars.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import { z } from 'https://deno.land/x/zod@v3.23.8/mod.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
}

const BodySchema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email(),
  phone: z.string().max(20).optional().nullable(),
  message: z.string().min(10).max(2000),
})

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  const parsed = BodySchema.safeParse(await req.json())
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: 'Invalid input' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const limitId = `contact:${ip}`
  const { data: rl } = await admin.from('rate_limits').select('*').eq('id', limitId).maybeSingle()
  if (rl && rl.count >= 5 && Date.now() - new Date(rl.window_start).getTime() < 60_000) {
    return new Response(JSON.stringify({ error: 'Too many requests' }), {
      status: 429,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
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

  const { error } = await admin.from('contact_messages').insert({
    name: parsed.data.name,
    email: parsed.data.email,
    phone: parsed.data.phone ?? null,
    message: parsed.data.message,
  })

  if (error) {
    return new Response(JSON.stringify({ error: 'Could not save message' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
