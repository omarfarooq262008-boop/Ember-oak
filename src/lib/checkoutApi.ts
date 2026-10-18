import { isSupabaseConfigured, supabase } from '@/lib/supabase'

export type CreateOrderPayload = {
  email: string
  phone: string
  paymentMethod: 'cod' | 'bank_transfer' | 'card'
  discountCode?: string | null
  shipping: {
    name: string
    phone: string
    address: string
    city: string
    province: string
    postal?: string | null
  }
  items: { variantId: string; quantity: number }[]
  idempotencyKey: string
}

export type CreateOrderResult =
  | {
      ok: true
      orderNumber: string
      status: string
      total: number
      trackingToken: string
      idempotent?: boolean
      checkoutUrl?: string | null
      paymentReference?: string | null
    }
  | { ok: false; message: string; status?: number }

export async function createOrderRemote(
  payload: CreateOrderPayload,
): Promise<CreateOrderResult> {
  if (!isSupabaseConfigured || !supabase) {
    return {
      ok: false,
      message: 'Checkout is not configured. Set VITE_SUPABASE_URL and try again.',
    }
  }

  const { data, error } = await supabase.functions.invoke('create-order', {
    body: payload,
  })

  if (error) {
    // Functions invoke may put JSON error body on context
    const ctx = error as { context?: Response; message?: string }
    try {
      const body = ctx.context ? await ctx.context.json() : null
      if (body?.error && typeof body.error === 'string') {
        return {
          ok: false,
          message: body.error,
          status: ctx.context?.status,
        }
      }
    } catch {
      /* ignore */
    }
    return {
      ok: false,
      message: error.message || 'Could not place order. Please try again.',
    }
  }

  const body = data as {
    error?: string
    orderNumber?: string
    status?: string
    total?: number
    trackingToken?: string
    idempotent?: boolean
    checkoutUrl?: string | null
    paymentReference?: string | null
  } | null

  if (!body || body.error || !body.orderNumber || !body.trackingToken) {
    return {
      ok: false,
      message: body?.error || 'Could not place order. Please try again.',
    }
  }

  return {
    ok: true,
    orderNumber: body.orderNumber,
    status: body.status ?? 'awaiting_fulfilment',
    total: Number(body.total ?? 0),
    trackingToken: body.trackingToken,
    idempotent: body.idempotent,
    checkoutUrl: body.checkoutUrl ?? null,
    paymentReference: body.paymentReference ?? null,
  }
}

export type TrackedOrder = {
  order_number: string
  status: string
  payment_method: string
  subtotal: number
  discount: number
  delivery_fee: number
  total: number
  discount_code: string | null
  shipping_name: string
  shipping_city: string
  shipping_province: string
  created_at: string
  order_items: {
    product_name: string
    variant_label: string
    sku: string
    unit_price: number
    quantity: number
    line_total: number
  }[]
}

export async function trackOrderRemote(
  input: { token: string } | { orderNumber: string; email: string },
): Promise<{ ok: true; order: TrackedOrder } | { ok: false; message: string }> {
  if (!isSupabaseConfigured || !supabase) {
    return { ok: false, message: 'Order tracking is not configured.' }
  }

  const { data, error } = await supabase.functions.invoke('track-order', {
    body: input,
  })

  if (error) {
    try {
      const ctx = error as { context?: Response }
      const body = ctx.context ? await ctx.context.json() : null
      if (body?.error) return { ok: false, message: String(body.error) }
    } catch {
      /* ignore */
    }
    return { ok: false, message: 'Could not look up this order.' }
  }

  const body = data as { order?: TrackedOrder; error?: string } | null
  if (!body?.order) {
    return { ok: false, message: body?.error || 'No order found.' }
  }
  return { ok: true, order: body.order }
}

export async function submitContactRemote(input: {
  name: string
  email: string
  phone?: string
  orderNumber?: string
  message: string
  website?: string
}): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!isSupabaseConfigured || !supabase) {
    return { ok: false, message: 'Contact form is not configured.' }
  }
  const { data, error } = await supabase.functions.invoke('submit-contact', {
    body: input,
  })
  if (error) {
    return { ok: false, message: 'Could not send your message. Please try again.' }
  }
  if ((data as { error?: string } | null)?.error) {
    return { ok: false, message: (data as { error: string }).error }
  }
  return { ok: true }
}

export async function subscribeNewsletterRemote(input: {
  email: string
  website?: string
  source?: string
}): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!isSupabaseConfigured || !supabase) {
    return { ok: false, message: 'Newsletter is not configured.' }
  }
  const { data, error } = await supabase.functions.invoke('subscribe-newsletter', {
    body: input,
  })
  if (error) {
    return { ok: false, message: 'Could not subscribe right now.' }
  }
  if ((data as { error?: string } | null)?.error) {
    return { ok: false, message: (data as { error: string }).error }
  }
  return { ok: true }
}
