/**
 * track-order — lookup by order number + email, or secure tracking token.
 * Returns only safe public fields. Secrets only from Deno.env.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import { z } from 'https://deno.land/x/zod@v3.23.8/mod.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
}

const BodySchema = z.union([
  z.object({
    token: z.string().min(16).max(128),
  }),
  z.object({
    orderNumber: z.string().min(3).max(40),
    email: z.string().email().max(254),
  }),
])

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

const SAFE_ORDER_SELECT = `
  order_number,
  status,
  payment_method,
  subtotal,
  discount,
  delivery_fee,
  total,
  discount_code,
  shipping_name,
  shipping_city,
  shipping_province,
  created_at,
  order_items (
    product_name,
    variant_label,
    sku,
    unit_price,
    quantity,
    line_total
  )
`

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

  const parsed = BodySchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return json({ error: 'Invalid request.' }, 400)
  }

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const limitId = `track-order:${ip}`
  const { data: rl } = await admin.from('rate_limits').select('*').eq('id', limitId).maybeSingle()
  if (rl && rl.count >= 20 && Date.now() - new Date(rl.window_start).getTime() < 60_000) {
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

  let query = admin.from('orders').select(SAFE_ORDER_SELECT)

  if ('token' in parsed.data) {
    query = query.eq('tracking_token', parsed.data.token.trim())
  } else {
    query = query
      .eq('order_number', parsed.data.orderNumber.trim().toUpperCase())
      .eq('email', parsed.data.email.trim().toLowerCase())
  }

  const { data: order, error } = await query.maybeSingle()

  if (error) {
    console.error(error)
    return json({ error: 'Could not look up order.' }, 500)
  }
  if (!order) {
    return json({ error: 'No order found.' }, 404)
  }

  return json({ order })
})
