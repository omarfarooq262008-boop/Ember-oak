/**
 * create-order — validates input, recomputes prices server-side,
 * decrements stock atomically, enforces idempotency + rate limits.
 * Secrets (service role) live only in Edge Function env — never VITE_*.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import { z } from 'https://deno.land/x/zod@v3.23.8/mod.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-idempotency-key',
}

const FREE_ABOVE = 8000
const FLAT_FEE = 250

const LineSchema = z.object({
  variantId: z.string().uuid(),
  quantity: z.number().int().positive().max(20),
})

const BodySchema = z.object({
  email: z.string().email(),
  phone: z.string().min(7).max(20),
  paymentMethod: z.enum(['cod', 'bank_transfer', 'card']),
  discountCode: z.string().optional().nullable(),
  shipping: z.object({
    name: z.string().min(2).max(120),
    phone: z.string().min(7).max(20),
    address: z.string().min(5).max(300),
    city: z.string().min(2).max(80),
    province: z.string().min(2).max(80),
    postal: z.string().max(20).optional().nullable(),
  }),
  items: z.array(LineSchema).min(1).max(50),
  idempotencyKey: z.string().min(8).max(128),
})

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
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

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const admin = createClient(supabaseUrl, serviceKey)

  try {
    const raw = await req.json()
    const parsed = BodySchema.safeParse(raw)
    if (!parsed.success) {
      return json({ error: 'Invalid input', details: parsed.error.flatten() }, 400)
    }
    const body = parsed.data

    const ip =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
      req.headers.get('cf-connecting-ip') ??
      'unknown'

    const allowed = await rateLimit(admin, `${ip}:${body.email}`, 8, 60)
    if (!allowed) {
      return json({ error: 'Too many requests. Please wait a moment.' }, 429)
    }

    // Idempotency: return existing order if key already used
    const { data: existing } = await admin
      .from('orders')
      .select('id, order_number, status, total, tracking_token')
      .eq('idempotency_key', body.idempotencyKey)
      .maybeSingle()
    if (existing) {
      return json({
        orderNumber: existing.order_number,
        status: existing.status,
        total: existing.total,
        trackingToken: existing.tracking_token,
        idempotent: true,
      })
    }

    // Reload variants + products from DB — never trust client prices
    const variantIds = body.items.map((i) => i.variantId)
    const { data: variants, error: vErr } = await admin
      .from('product_variants')
      .select('id, sku, options, price, stock, is_active, product_id, products(id, name, is_active)')
      .in('id', variantIds)

    if (vErr || !variants || variants.length !== variantIds.length) {
      return json({ error: 'One or more items are unavailable.' }, 400)
    }

    const qtyByVariant = new Map(body.items.map((i) => [i.variantId, i.quantity]))
    let subtotal = 0
    const lines: {
      product_id: string
      variant_id: string
      product_name: string
      variant_label: string
      sku: string
      unit_price: number
      quantity: number
      line_total: number
    }[] = []

    for (const v of variants) {
      const product = v.products as { id: string; name: string; is_active: boolean } | null
      if (!v.is_active || !product?.is_active) {
        return json({ error: `Item ${v.sku} is not available.` }, 400)
      }
      const qty = qtyByVariant.get(v.id)!
      if (v.stock < qty) {
        return json({ error: `Insufficient stock for ${v.sku}.` }, 409)
      }
      const unit = Number(v.price)
      const lineTotal = unit * qty
      subtotal += lineTotal
      const opts = (v.options ?? {}) as Record<string, string>
      const variant_label = Object.values(opts).filter(Boolean).join(' · ')
      lines.push({
        product_id: product.id,
        variant_id: v.id,
        product_name: product.name,
        variant_label,
        sku: v.sku,
        unit_price: unit,
        quantity: qty,
        line_total: lineTotal,
      })
    }

    let discount = 0
    let discountCode: string | null = null
    if (body.discountCode) {
      const code = body.discountCode.trim().toUpperCase()
      const { data: dc } = await admin
        .from('discount_codes')
        .select('*')
        .eq('code', code)
        .eq('is_active', true)
        .maybeSingle()
      if (!dc) return json({ error: 'Invalid discount code.' }, 400)
      const now = Date.now()
      if (dc.starts_at && new Date(dc.starts_at).getTime() > now) {
        return json({ error: 'Discount code is not active yet.' }, 400)
      }
      if (dc.ends_at && new Date(dc.ends_at).getTime() < now) {
        return json({ error: 'Discount code has expired.' }, 400)
      }
      if (dc.max_uses != null && dc.used_count >= dc.max_uses) {
        return json({ error: 'Discount code usage limit reached.' }, 400)
      }
      if (dc.min_spend != null && subtotal < Number(dc.min_spend)) {
        return json({
          error: `Minimum spend for this code is ${dc.min_spend}.`,
        }, 400)
      }
      discount =
        dc.type === 'percent'
          ? Math.round((subtotal * Number(dc.value)) / 100)
          : Math.min(subtotal, Number(dc.value))
      discountCode = code
    }

    const afterDiscount = Math.max(0, subtotal - discount)
    const deliveryFee = afterDiscount >= FREE_ABOVE ? 0 : FLAT_FEE
    const total = afterDiscount + deliveryFee

    let status: string
    if (body.paymentMethod === 'card') status = 'pending_payment'
    else if (body.paymentMethod === 'bank_transfer') status = 'awaiting_payment'
    else status = 'awaiting_fulfilment'

    const orderNumber = `EO-${Date.now().toString(36).toUpperCase()}${Math.floor(
      Math.random() * 100,
    )
      .toString()
      .padStart(2, '0')}`

    // Transactional-ish flow: decrement stock then insert order
    for (const line of lines) {
      const { error } = await admin.rpc('decrement_variant_stock', {
        p_variant_id: line.variant_id,
        p_qty: line.quantity,
      })
      if (error) {
        return json({ error: error.message || 'Stock update failed.' }, 409)
      }
    }

    const { data: order, error: oErr } = await admin
      .from('orders')
      .insert({
        order_number: orderNumber,
        email: body.email.toLowerCase(),
        phone: body.phone,
        status,
        payment_method: body.paymentMethod,
        subtotal,
        discount,
        delivery_fee: deliveryFee,
        total,
        discount_code: discountCode,
        shipping_name: body.shipping.name,
        shipping_phone: body.shipping.phone,
        shipping_address: body.shipping.address,
        shipping_city: body.shipping.city,
        shipping_province: body.shipping.province,
        shipping_postal: body.shipping.postal ?? null,
        idempotency_key: body.idempotencyKey,
      })
      .select('id, order_number, status, total, tracking_token')
      .single()

    if (oErr || !order) {
      // Best-effort: stock already decremented — log for ops
      await admin.from('app_events').insert({
        event_type: 'order_insert_failed',
        payload: { error: oErr?.message, idempotencyKey: body.idempotencyKey },
      })
      return json({ error: 'Could not create order.' }, 500)
    }

    await admin.from('order_items').insert(
      lines.map((l) => ({ ...l, order_id: order.id })),
    )

    await admin.from('payments').insert({
      order_id: order.id,
      provider: body.paymentMethod === 'card' ? 'mock' : body.paymentMethod,
      amount: total,
      currency: 'PKR',
      status: 'pending',
    })

    if (discountCode) {
      await admin.rpc('exec', {}).catch(() => null)
      // Increment usage without raw SQL helper
      const { data: dc } = await admin
        .from('discount_codes')
        .select('used_count')
        .eq('code', discountCode)
        .single()
      if (dc) {
        await admin
          .from('discount_codes')
          .update({ used_count: dc.used_count + 1 })
          .eq('code', discountCode)
      }
    }

    await admin.from('app_events').insert({
      event_type: 'order_created',
      payload: { orderNumber: order.order_number, total: order.total },
      ip,
    })

    // Email confirmation would be sent here via Resend/Postmark using secrets

    return json({
      orderNumber: order.order_number,
      status: order.status,
      total: order.total,
      trackingToken: order.tracking_token,
    })
  } catch (e) {
    console.error(e)
    return json({ error: 'Unexpected error' }, 500)
  }
})
