/**
 * create-order — Zod validation + IP rate limit, then create_order_atomic via service role.
 * Never trusts browser prices. Secrets only from Deno.env.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import { z } from 'https://deno.land/x/zod@v3.23.8/mod.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-idempotency-key',
}

const LineSchema = z.object({
  variantId: z.string().uuid(),
  quantity: z.number().int().positive().max(20),
})

const BodySchema = z.object({
  email: z.string().email().max(254),
  phone: z
    .string()
    .min(7)
    .max(20)
    .regex(/^[\d\s+\-()]+$/, 'Invalid phone'),
  paymentMethod: z.enum(['cod', 'bank_transfer', 'card']),
  discountCode: z.string().max(64).optional().nullable(),
  shipping: z.object({
    name: z.string().min(2).max(120),
    phone: z
      .string()
      .min(7)
      .max(20)
      .regex(/^[\d\s+\-()]+$/, 'Invalid phone'),
    address: z.string().min(5).max(300),
    city: z.string().min(2).max(80),
    province: z.string().min(2).max(80),
    postal: z.string().max(20).optional().nullable(),
  }),
  items: z.array(LineSchema).min(1).max(50),
  idempotencyKey: z.string().min(8).max(128),
  userId: z.string().uuid().optional().nullable(),
})

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function mapRpcError(message: string): { status: number; error: string } {
  if (message.includes('INSUFFICIENT_STOCK:')) {
    const parts = message.split('INSUFFICIENT_STOCK:')[1]?.split(':') ?? []
    const sku = parts[0] ?? 'item'
    const left = parts[1] ?? '0'
    return {
      status: 409,
      error: `Only ${left} left for ${sku}, please update your cart`,
    }
  }
  if (message.includes('ITEM_UNAVAILABLE:')) {
    return { status: 400, error: 'One or more items are no longer available.' }
  }
  if (message.includes('INVALID_DISCOUNT') || message.includes('DISCOUNT_')) {
    return { status: 400, error: 'This discount code cannot be applied.' }
  }
  if (message.includes('EMPTY_CART') || message.includes('INVALID_VARIANT')) {
    return { status: 400, error: 'Your cart is invalid. Please refresh and try again.' }
  }
  return { status: 400, error: message || 'Could not create order.' }
}

async function rateLimit(
  admin: ReturnType<typeof createClient>,
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<boolean> {
  const id = `create-order:${key}`
  const { data } = await admin.from('rate_limits').select('*').eq('id', id).maybeSingle()
  const now = Date.now()
  if (!data) {
    await admin.from('rate_limits').insert({
      id,
      count: 1,
      window_start: new Date().toISOString(),
    })
    return true
  }
  const start = new Date(data.window_start).getTime()
  if (now - start > windowSeconds * 1000) {
    await admin
      .from('rate_limits')
      .update({ count: 1, window_start: new Date().toISOString() })
      .eq('id', id)
    return true
  }
  if (data.count >= limit) return false
  await admin.from('rate_limits').update({ count: data.count + 1 }).eq('id', id)
  return true
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

  try {
    const raw = await req.json().catch(() => null)
    const parsed = BodySchema.safeParse(raw)
    if (!parsed.success) {
      return json({ error: 'Invalid input', details: parsed.error.flatten() }, 400)
    }
    const body = parsed.data

    const ip =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
      req.headers.get('cf-connecting-ip') ??
      'unknown'

    const allowed = await rateLimit(admin, `${ip}:${body.email.toLowerCase()}`, 8, 60)
    if (!allowed) {
      return json({ error: 'Too many requests. Please wait a moment.' }, 429)
    }

    // Bind order to logged-in user when a valid JWT is present
    let userId: string | null = null
    const authHeader = req.headers.get('Authorization')
    if (authHeader?.startsWith('Bearer ')) {
      const jwt = authHeader.slice(7)
      const { data: userData } = await admin.auth.getUser(jwt)
      if (userData.user) {
        userId = userData.user.id
      }
    }

    const { data, error } = await admin.rpc('create_order_atomic', {
      p_email: body.email,
      p_phone: body.phone,
      p_payment_method: body.paymentMethod,
      p_shipping_name: body.shipping.name,
      p_shipping_phone: body.shipping.phone,
      p_shipping_address: body.shipping.address,
      p_shipping_city: body.shipping.city,
      p_shipping_province: body.shipping.province,
      p_shipping_postal: body.shipping.postal ?? null,
      p_items: body.items.map((i) => ({
        variant_id: i.variantId,
        quantity: i.quantity,
      })),
      p_idempotency_key: body.idempotencyKey,
      p_discount_code: body.discountCode ?? null,
      p_user_id: userId,
    })

    if (error) {
      const mapped = mapRpcError(error.message ?? '')
      return json({ error: mapped.error }, mapped.status)
    }

    const result = data as {
      order_number: string
      status: string
      total: number
      tracking_token: string
      idempotent?: boolean
    }

    await admin.from('app_events').insert({
      event_type: 'order_created',
      payload: {
        orderNumber: result.order_number,
        total: result.total,
        idempotent: result.idempotent ?? false,
      },
      ip,
    })

    return json({
      orderNumber: result.order_number,
      status: result.status,
      total: result.total,
      trackingToken: result.tracking_token,
      idempotent: result.idempotent ?? false,
    })
  } catch (e) {
    console.error(e)
    return json({ error: 'Unexpected error' }, 500)
  }
})
