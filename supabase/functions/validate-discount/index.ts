/**
 * validate-discount — returns only valid/invalid + amount off.
 * Never returns the list of codes or code metadata beyond the submitted code.
 * Uses service role; discount_codes has no anon/authenticated read.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import { z } from 'https://deno.land/x/zod@v3.23.8/mod.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
}

const BodySchema = z.object({
  code: z.string().min(1).max(64),
  subtotal: z.number().min(0).max(10_000_000),
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
    return json({ valid: false, message: 'Method not allowed' }, 405)
  }

  const parsed = BodySchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return json({ valid: false, message: 'Invalid request.' }, 400)
  }

  const { code, subtotal } = parsed.data
  const normalized = code.trim().toUpperCase()

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const limitId = `validate-discount:${ip}`
  const { data: rl } = await admin
    .from('rate_limits')
    .select('*')
    .eq('id', limitId)
    .maybeSingle()
  if (
    rl &&
    rl.count >= 30 &&
    Date.now() - new Date(rl.window_start).getTime() < 60_000
  ) {
    return json({ valid: false, message: 'Too many requests.' }, 429)
  }
  if (!rl || Date.now() - new Date(rl.window_start).getTime() >= 60_000) {
    await admin.from('rate_limits').upsert({
      id: limitId,
      count: 1,
      window_start: new Date().toISOString(),
    })
  } else {
    await admin
      .from('rate_limits')
      .update({ count: rl.count + 1 })
      .eq('id', limitId)
  }

  const { data: dc } = await admin
    .from('discount_codes')
    .select('code, type, value, min_spend, max_uses, used_count, starts_at, ends_at, is_active')
    .eq('code', normalized)
    .eq('is_active', true)
    .maybeSingle()

  if (!dc) {
    return json({ valid: false, message: 'This code is not valid.' })
  }

  const now = Date.now()
  if (dc.starts_at && new Date(dc.starts_at).getTime() > now) {
    return json({ valid: false, message: 'This code is not active yet.' })
  }
  if (dc.ends_at && new Date(dc.ends_at).getTime() < now) {
    return json({ valid: false, message: 'This code has expired.' })
  }
  if (dc.max_uses != null && dc.used_count >= dc.max_uses) {
    return json({ valid: false, message: 'This code has reached its usage limit.' })
  }
  if (dc.min_spend != null && subtotal < Number(dc.min_spend)) {
    return json({
      valid: false,
      message: `Minimum spend is PKR ${Number(dc.min_spend).toLocaleString('en-PK')}.`,
    })
  }

  let discountAmount = 0
  if (dc.type === 'percent') {
    discountAmount = Math.floor((subtotal * Number(dc.value)) / 100)
  } else {
    discountAmount = Math.min(Number(dc.value), subtotal)
  }

  if (discountAmount <= 0) {
    return json({
      valid: false,
      message: 'This code cannot be applied to your cart.',
    })
  }

  // Only echo the submitted code string + amount — never type/value/list
  return json({
    valid: true,
    code: dc.code,
    discountAmount,
  })
})
