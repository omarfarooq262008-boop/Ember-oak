import { compressProductImage } from '@/lib/admin/imageCompress'
import { isSupabaseConfigured, supabase } from '@/lib/supabase'
import type { OrderStatus, PaymentMethod, ProductAttributeKey } from '@/types'

export class AdminApiError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AdminApiError'
  }
}

function requireClient() {
  if (!supabase) {
    throw new AdminApiError('Supabase is not configured.')
  }
  return supabase
}

export async function adminRpc<T = unknown>(
  name: string,
  args: Record<string, unknown> = {},
): Promise<T> {
  const client = requireClient()
  const { data, error } = await client.rpc(name, args)
  if (error) throw new AdminApiError(error.message)
  return data as T
}

export type AdminProductRow = {
  id: string
  slug: string
  name: string
  short_description: string
  description: string
  category_id: string | null
  materials: string | null
  dimensions: string | null
  care: string | null
  tags: string[]
  is_active: boolean
  is_featured: boolean
  is_bestseller: boolean
  seo_title: string | null
  seo_description: string | null
  archived_at: string | null
  created_at: string
  updated_at: string
}

export type AdminProductImageRow = {
  id: string
  product_id: string
  url: string
  alt: string
  sort_order: number
  is_primary: boolean
}

export type AdminVariantRow = {
  id: string
  product_id: string
  sku: string
  options: Partial<Record<ProductAttributeKey, string>>
  price: number
  compare_at_price: number | null
  stock: number
  is_active: boolean
}

export type AdminProductDetail = AdminProductRow & {
  product_images: AdminProductImageRow[]
  product_variants: AdminVariantRow[]
  collection_ids: string[]
}

export type ProductUpsertInput = {
  id?: string
  slug: string
  name: string
  short_description: string
  description: string
  category_id: string | null
  materials?: string | null
  dimensions?: string | null
  care?: string | null
  tags: string[]
  is_active: boolean
  is_featured: boolean
  is_bestseller: boolean
  seo_title?: string | null
  seo_description?: string | null
  collection_ids: string[]
  variants: Array<{
    id?: string
    sku: string
    options: Partial<Record<ProductAttributeKey, string>>
    price: number
    compare_at_price: number | null
    stock: number
    is_active: boolean
    stockReason?: string
  }>
}

function publicStorageUrl(path: string): string {
  const base = import.meta.env.VITE_SUPABASE_URL as string
  return `${base}/storage/v1/object/public/product-images/${path}`
}

function storagePathFromUrl(url: string): string | null {
  const marker = '/product-images/'
  const idx = url.indexOf(marker)
  if (idx === -1) return null
  return url.slice(idx + marker.length)
}

export type AdminProductListItem = AdminProductRow & {
  thumbnail_url: string | null
  stock_total: number
  variant_count: number
}

export async function listProducts(search?: string): Promise<AdminProductListItem[]> {
  const client = requireClient()
  let q = client
    .from('products')
    .select(
      `
      id, slug, name, short_description, description, category_id, materials, dimensions, care, tags,
      is_active, is_featured, is_bestseller, seo_title, seo_description, archived_at, created_at, updated_at,
      product_images ( url, is_primary, sort_order ),
      product_variants ( stock, is_active )
    `,
    )
    .is('archived_at', null)
    .order('updated_at', { ascending: false })

  if (search?.trim()) {
    const term = `%${search.trim()}%`
    q = q.or(`name.ilike.${term},slug.ilike.${term}`)
  }

  const { data, error } = await q
  if (error) throw new AdminApiError(error.message)

  return (data ?? []).map((row) => {
    const images = (row.product_images ?? []) as Array<{
      url: string
      is_primary: boolean
      sort_order: number
    }>
    const variants = (row.product_variants ?? []) as Array<{
      stock: number
      is_active: boolean
    }>
    const primary =
      images.find((i) => i.is_primary) ??
      [...images].sort((a, b) => a.sort_order - b.sort_order)[0]
    const stock_total = variants
      .filter((v) => v.is_active)
      .reduce((sum, v) => sum + Number(v.stock), 0)

    const {
      product_images: _images,
      product_variants: _variants,
      ...product
    } = row as AdminProductRow & {
      product_images?: unknown
      product_variants?: unknown
    }

    return {
      ...(product as AdminProductRow),
      thumbnail_url: primary?.url ?? null,
      stock_total,
      variant_count: variants.length,
    }
  })
}

export async function isSlugTaken(slug: string, excludeId?: string): Promise<boolean> {
  const client = requireClient()
  let q = client.from('products').select('id').eq('slug', slug).limit(1)
  if (excludeId) q = q.neq('id', excludeId)
  const { data, error } = await q
  if (error) throw new AdminApiError(error.message)
  return (data?.length ?? 0) > 0
}

export async function getProduct(id: string): Promise<AdminProductDetail | null> {
  const client = requireClient()
  const { data: product, error } = await client
    .from('products')
    .select(
      'id, slug, name, short_description, description, category_id, materials, dimensions, care, tags, is_active, is_featured, is_bestseller, seo_title, seo_description, archived_at, created_at, updated_at',
    )
    .eq('id', id)
    .maybeSingle()

  if (error) throw new AdminApiError(error.message)
  if (!product) return null

  const [{ data: images }, { data: variants }, { data: links }] = await Promise.all([
    client
      .from('product_images')
      .select('id, product_id, url, alt, sort_order, is_primary')
      .eq('product_id', id)
      .order('sort_order', { ascending: true }),
    client
      .from('product_variants')
      .select('id, product_id, sku, options, price, compare_at_price, stock, is_active')
      .eq('product_id', id)
      .order('created_at', { ascending: true }),
    client.from('collection_products').select('collection_id').eq('product_id', id),
  ])

  return {
    ...(product as AdminProductRow),
    product_images: (images ?? []) as AdminProductImageRow[],
    product_variants: (variants ?? []).map((v) => ({
      ...v,
      price: Number(v.price),
      compare_at_price:
        v.compare_at_price != null ? Number(v.compare_at_price) : null,
      stock: Number(v.stock),
    })) as AdminVariantRow[],
    collection_ids: (links ?? []).map((l) => l.collection_id as string),
  }
}

export async function upsertProduct(input: ProductUpsertInput): Promise<string> {
  const client = requireClient()
  const now = new Date().toISOString()
  const row = {
    slug: input.slug,
    name: input.name,
    short_description: input.short_description,
    description: input.description,
    category_id: input.category_id,
    materials: input.materials ?? null,
    dimensions: input.dimensions ?? null,
    care: input.care ?? null,
    tags: input.tags,
    is_active: input.is_active,
    is_featured: input.is_featured,
    is_bestseller: input.is_bestseller,
    seo_title: input.seo_title ?? null,
    seo_description: input.seo_description ?? null,
    updated_at: now,
  }

  let productId = input.id

  if (productId) {
    const { error } = await client.from('products').update(row).eq('id', productId)
    if (error) throw new AdminApiError(error.message)
  } else {
    const { data, error } = await client.from('products').insert(row).select('id').single()
    if (error) throw new AdminApiError(error.message)
    productId = data.id as string
  }

  const { data: existingLinks } = await client
    .from('collection_products')
    .select('collection_id')
    .eq('product_id', productId)

  const existing = new Set((existingLinks ?? []).map((l) => l.collection_id as string))
  const desired = new Set(input.collection_ids)

  const toRemove = [...existing].filter((id) => !desired.has(id))
  const toAdd = [...desired].filter((id) => !existing.has(id))

  if (toRemove.length) {
    const { error } = await client
      .from('collection_products')
      .delete()
      .eq('product_id', productId)
      .in('collection_id', toRemove)
    if (error) throw new AdminApiError(error.message)
  }

  if (toAdd.length) {
    const { error } = await client.from('collection_products').insert(
      toAdd.map((collection_id, i) => ({
        collection_id,
        product_id: productId,
        sort_order: i,
      })),
    )
    if (error) throw new AdminApiError(error.message)
  }

  const { data: existingVariants } = await client
    .from('product_variants')
    .select('id, stock')
    .eq('product_id', productId)

  const existingVariantMap = new Map(
    (existingVariants ?? []).map((v) => [v.id as string, Number(v.stock)]),
  )

  for (const variant of input.variants) {
    const payload = {
      product_id: productId,
      sku: variant.sku,
      options: variant.options,
      price: variant.price,
      compare_at_price: variant.compare_at_price,
      is_active: variant.is_active,
    }

    if (variant.id && existingVariantMap.has(variant.id)) {
      const prevStock = existingVariantMap.get(variant.id)!
      const { error } = await client
        .from('product_variants')
        .update(payload)
        .eq('id', variant.id)
      if (error) throw new AdminApiError(error.message)

      if (variant.stock !== prevStock) {
        await adjustStock(variant.id, variant.stock, variant.stockReason ?? 'product edit')
      }
    } else {
      const { error } = await client.from('product_variants').insert({
        ...payload,
        stock: variant.stock,
      })
      if (error) throw new AdminApiError(error.message)
    }
  }

  return productId
}

export async function archiveProduct(id: string): Promise<void> {
  const client = requireClient()
  const { error } = await client
    .from('products')
    .update({
      is_active: false,
      archived_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
  if (error) throw new AdminApiError(error.message)
}

export async function uploadProductImage(
  productId: string,
  file: File,
  alt: string,
): Promise<AdminProductImageRow> {
  const client = requireClient()
  const { blob, fileName } = await compressProductImage(file)
  const path = `${productId}/${crypto.randomUUID()}-${fileName}`

  const { error: upErr } = await client.storage.from('product-images').upload(path, blob, {
    contentType: 'image/webp',
    upsert: false,
  })
  if (upErr) throw new AdminApiError(upErr.message)

  const url = publicStorageUrl(path)

  const { data: maxRow } = await client
    .from('product_images')
    .select('sort_order')
    .eq('product_id', productId)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle()

  const sort_order = maxRow ? Number(maxRow.sort_order) + 1 : 0

  const { count } = await client
    .from('product_images')
    .select('id', { count: 'exact', head: true })
    .eq('product_id', productId)

  const is_primary = (count ?? 0) === 0

  const { data, error } = await client
    .from('product_images')
    .insert({
      product_id: productId,
      url,
      alt: alt.trim() || file.name,
      sort_order,
      is_primary,
    })
    .select('id, product_id, url, alt, sort_order, is_primary')
    .single()

  if (error) throw new AdminApiError(error.message)
  return data as AdminProductImageRow
}

export async function deleteProductImage(image: AdminProductImageRow): Promise<void> {
  const client = requireClient()
  const path = storagePathFromUrl(image.url)
  if (path) {
    await client.storage.from('product-images').remove([path])
  }
  const { error } = await client.from('product_images').delete().eq('id', image.id)
  if (error) throw new AdminApiError(error.message)
}

export async function reorderImages(
  productId: string,
  orderedIds: string[],
): Promise<void> {
  const client = requireClient()
  await Promise.all(
    orderedIds.map((id, sort_order) =>
      client.from('product_images').update({ sort_order }).eq('id', id).eq('product_id', productId),
    ),
  )
}

export async function setPrimaryImage(productId: string, imageId: string): Promise<void> {
  const client = requireClient()
  const { error: clearErr } = await client
    .from('product_images')
    .update({ is_primary: false })
    .eq('product_id', productId)
  if (clearErr) throw new AdminApiError(clearErr.message)

  const { error } = await client
    .from('product_images')
    .update({ is_primary: true })
    .eq('id', imageId)
    .eq('product_id', productId)
  if (error) throw new AdminApiError(error.message)
}

export async function updateImageAlt(imageId: string, alt: string): Promise<void> {
  const client = requireClient()
  const { error } = await client
    .from('product_images')
    .update({ alt: alt.trim() })
    .eq('id', imageId)
  if (error) throw new AdminApiError(error.message)
}

export type InventoryRow = {
  variant_id: string
  sku: string
  stock: number
  product_id: string
  product_name: string
  is_active: boolean
}

export async function listInventory(): Promise<InventoryRow[]> {
  const client = requireClient()
  const { data, error } = await client
    .from('product_variants')
    .select(
      'id, sku, stock, is_active, product_id, products!inner(id, name, archived_at)',
    )
    .is('products.archived_at', null)
    .order('sku', { ascending: true })

  if (error) throw new AdminApiError(error.message)

  return (data ?? []).map((row) => {
    const raw = row.products as { id: string; name: string } | { id: string; name: string }[]
    const p = Array.isArray(raw) ? raw[0] : raw
    return {
      variant_id: row.id as string,
      sku: row.sku as string,
      stock: Number(row.stock),
      product_id: p?.id ?? (row.product_id as string),
      product_name: p?.name ?? '—',
      is_active: Boolean(row.is_active),
    }
  })
}

export async function adjustStock(
  variantId: string,
  newStock: number,
  reason: string,
): Promise<void> {
  await adminRpc('admin_adjust_stock', {
    p_variant_id: variantId,
    p_new_stock: newStock,
    p_reason: reason,
  })
}

export type StockHistoryRow = {
  id: string
  variant_id: string
  stock_before: number
  stock_after: number
  reason: string
  created_at: string
  admin_id: string | null
}

export async function listStockHistory(variantId: string): Promise<StockHistoryRow[]> {
  const client = requireClient()
  const { data, error } = await client
    .from('stock_history')
    .select('id, variant_id, stock_before, stock_after, reason, created_at, admin_id')
    .eq('variant_id', variantId)
    .order('created_at', { ascending: false })
    .limit(50)
  if (error) throw new AdminApiError(error.message)
  return (data ?? []) as StockHistoryRow[]
}

export type OrderListFilters = {
  search?: string
  status?: OrderStatus | ''
  payment_method?: PaymentMethod | ''
  from?: string
  to?: string
}

export type AdminOrderRow = {
  id: string
  order_number: string
  email: string
  status: OrderStatus
  payment_method: PaymentMethod
  total: number
  created_at: string
  shipping_name: string
}

export async function listOrders(filters: OrderListFilters = {}): Promise<AdminOrderRow[]> {
  const client = requireClient()
  let q = client
    .from('orders')
    .select('id, order_number, email, status, payment_method, total, created_at, shipping_name')
    .order('created_at', { ascending: false })
    .limit(200)

  if (filters.status) q = q.eq('status', filters.status)
  if (filters.payment_method) q = q.eq('payment_method', filters.payment_method)
  if (filters.from) q = q.gte('created_at', filters.from)
  if (filters.to) q = q.lte('created_at', filters.to)
  if (filters.search?.trim()) {
    const term = `%${filters.search.trim()}%`
    q = q.or(`order_number.ilike.${term},email.ilike.${term},shipping_name.ilike.${term}`)
  }

  const { data, error } = await q
  if (error) throw new AdminApiError(error.message)
  return (data ?? []).map((o) => ({
    ...o,
    total: Number(o.total),
  })) as AdminOrderRow[]
}

export type AdminOrderDetail = AdminOrderRow & {
  phone: string
  subtotal: number
  discount: number
  delivery_fee: number
  discount_code: string | null
  shipping_phone: string
  shipping_address: string
  shipping_city: string
  shipping_province: string
  shipping_postal: string | null
  tracking_number: string | null
  payment_reference: string | null
  updated_at: string
  order_items: Array<{
    id: string
    product_name: string
    variant_label: string
    sku: string
    unit_price: number
    quantity: number
    line_total: number
  }>
  payments: Array<{ id: string; status: string; provider: string; amount: number }>
}

export async function getOrder(id: string): Promise<AdminOrderDetail | null> {
  const client = requireClient()
  const { data, error } = await client
    .from('orders')
    .select(
      `
      id, order_number, email, phone, status, payment_method,
      subtotal, discount, delivery_fee, total, discount_code,
      shipping_name, shipping_phone, shipping_address, shipping_city,
      shipping_province, shipping_postal, tracking_number, payment_reference,
      created_at, updated_at,
      order_items ( id, product_name, variant_label, sku, unit_price, quantity, line_total ),
      payments ( id, status, provider, amount )
    `,
    )
    .eq('id', id)
    .maybeSingle()

  if (error) throw new AdminApiError(error.message)
  if (!data) return null

  const row = data as Record<string, unknown>
  return {
    ...(row as AdminOrderRow),
    phone: row.phone as string,
    subtotal: Number(row.subtotal),
    discount: Number(row.discount),
    delivery_fee: Number(row.delivery_fee),
    discount_code: row.discount_code as string | null,
    shipping_phone: row.shipping_phone as string,
    shipping_address: row.shipping_address as string,
    shipping_city: row.shipping_city as string,
    shipping_province: row.shipping_province as string,
    shipping_postal: row.shipping_postal as string | null,
    tracking_number: row.tracking_number as string | null,
    payment_reference: (row.payment_reference as string | null) ?? null,
    updated_at: row.updated_at as string,
    order_items: ((row.order_items as unknown[]) ?? []).map((i) => {
      const item = i as Record<string, unknown>
      return {
        id: item.id as string,
        product_name: item.product_name as string,
        variant_label: item.variant_label as string,
        sku: item.sku as string,
        unit_price: Number(item.unit_price),
        quantity: Number(item.quantity),
        line_total: Number(item.line_total),
      }
    }),
    payments: ((row.payments as unknown[]) ?? []).map((p) => {
      const pay = p as Record<string, unknown>
      return {
        id: pay.id as string,
        status: pay.status as string,
        provider: pay.provider as string,
        amount: Number(pay.amount),
      }
    }),
  }
}

export async function transitionOrder(
  orderId: string,
  newStatus: OrderStatus,
  trackingNumber?: string | null,
): Promise<void> {
  await adminRpc('admin_transition_order_status', {
    p_order_id: orderId,
    p_new_status: newStatus,
    p_tracking_number: trackingNumber ?? null,
  })
}

export async function markCodPaid(orderId: string): Promise<void> {
  await adminRpc('admin_mark_cod_paid', { p_order_id: orderId })
}

export async function markBankPaid(orderId: string): Promise<void> {
  await adminRpc('admin_mark_bank_paid', { p_order_id: orderId })
}

export async function refundOrder(orderId: string): Promise<void> {
  const client = requireClient()
  const { data, error } = await client.functions.invoke('admin-refund', {
    body: { orderId },
  })
  if (error) {
    const ctx = error as { context?: Response; message?: string }
    try {
      const body = ctx.context ? await ctx.context.json() : null
      if (body?.error) throw new AdminApiError(String(body.error))
    } catch (e) {
      if (e instanceof AdminApiError) throw e
    }
    throw new AdminApiError(error.message || 'Refund failed')
  }
  if ((data as { error?: string } | null)?.error) {
    throw new AdminApiError((data as { error: string }).error)
  }
}

/** Fire-and-forget order email — failures must not block admin UI. */
export async function sendOrderEmail(
  orderId: string,
  template:
    | 'order_confirmation'
    | 'payment_received'
    | 'order_shipped'
    | 'order_cancelled'
    | 'order_refunded',
): Promise<void> {
  const client = requireClient()
  try {
    await client.functions.invoke('send-order-email', {
      body: { orderId, template },
    })
  } catch {
    /* never block status changes */
  }
}

export type DashboardStats = {
  ordersToday: number
  ordersMonth: number
  revenueMonth: number
  pendingFulfilment: number
  lowStockCount: number
  pendingReviews: number
  recentOrders: AdminOrderRow[]
}

export async function dashboardStats(): Promise<DashboardStats> {
  const client = requireClient()
  const now = new Date()
  const startOfDay = new Date(now)
  startOfDay.setHours(0, 0, 0, 0)
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  const threshold = await getInventorySettings()

  const [
    { count: ordersToday },
    { data: monthOrders },
    { count: pendingFulfilment },
    { data: variants },
    { count: pendingReviews },
    { data: recent },
  ] = await Promise.all([
    client
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', startOfDay.toISOString()),
    client
      .from('orders')
      .select('total')
      .gte('created_at', startOfMonth.toISOString())
      .not('status', 'in', '("cancelled","refunded")'),
    client
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .in('status', ['awaiting_fulfilment', 'awaiting_payment', 'pending_payment']),
    client.from('product_variants').select('stock').eq('is_active', true),
    client
      .from('reviews')
      .select('id', { count: 'exact', head: true })
      .eq('is_approved', false)
      .is('rejected_at', null),
    client
      .from('orders')
      .select('id, order_number, email, status, payment_method, total, created_at, shipping_name')
      .order('created_at', { ascending: false })
      .limit(8),
  ])

  const revenueMonth = (monthOrders ?? []).reduce(
    (sum, o) => sum + Number(o.total),
    0,
  )
  const lowStockCount = (variants ?? []).filter(
    (v) => Number(v.stock) <= threshold.lowStockThreshold,
  ).length

  return {
    ordersToday: ordersToday ?? 0,
    ordersMonth: monthOrders?.length ?? 0,
    revenueMonth,
    pendingFulfilment: pendingFulfilment ?? 0,
    lowStockCount,
    pendingReviews: pendingReviews ?? 0,
    recentOrders: (recent ?? []).map((o) => ({
      ...o,
      total: Number(o.total),
    })) as AdminOrderRow[],
  }
}

export type DiscountRow = {
  id: string
  code: string
  type: 'percent' | 'fixed'
  value: number
  min_spend: number | null
  max_uses: number | null
  used_count: number
  starts_at: string | null
  ends_at: string | null
  is_active: boolean
}

export async function listDiscounts(): Promise<DiscountRow[]> {
  const client = requireClient()
  const { data, error } = await client
    .from('discount_codes')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw new AdminApiError(error.message)
  return (data ?? []).map((d) => ({
    ...d,
    value: Number(d.value),
    min_spend: d.min_spend != null ? Number(d.min_spend) : null,
    used_count: Number(d.used_count),
  })) as DiscountRow[]
}

export async function upsertDiscount(input: {
  id?: string
  code: string
  type: 'percent' | 'fixed'
  value: number
  min_spend: number | null
  max_uses: number | null
  starts_at: string | null
  ends_at: string | null
  is_active: boolean
}): Promise<void> {
  const client = requireClient()
  const row = {
    code: input.code.trim().toUpperCase(),
    type: input.type,
    value: input.value,
    min_spend: input.min_spend,
    max_uses: input.max_uses,
    starts_at: input.starts_at,
    ends_at: input.ends_at,
    is_active: input.is_active,
  }
  if (input.id) {
    const { error } = await client.from('discount_codes').update(row).eq('id', input.id)
    if (error) throw new AdminApiError(error.message)
  } else {
    const { error } = await client.from('discount_codes').insert(row)
    if (error) throw new AdminApiError(error.message)
  }
}

export async function deactivateDiscount(id: string): Promise<void> {
  const client = requireClient()
  const { error } = await client.from('discount_codes').update({ is_active: false }).eq('id', id)
  if (error) throw new AdminApiError(error.message)
}

export type ReviewAdminRow = {
  id: string
  product_id: string
  customer_name: string
  rating: number
  title: string | null
  body: string
  is_approved: boolean
  created_at: string
  products?: { name: string; slug: string } | null
}

export async function listPendingReviews(): Promise<ReviewAdminRow[]> {
  const client = requireClient()
  const { data, error } = await client
    .from('reviews')
    .select(
      'id, product_id, customer_name, rating, title, body, is_approved, created_at, products(name, slug)',
    )
    .eq('is_approved', false)
    .is('rejected_at', null)
    .order('created_at', { ascending: false })
    .limit(100)
  if (error) throw new AdminApiError(error.message)
  return (data ?? []).map((row) => {
    const r = row as ReviewAdminRow & {
      products: { name: string; slug: string } | { name: string; slug: string }[] | null
    }
    const prod = r.products
    const products =
      prod == null ? null : Array.isArray(prod) ? (prod[0] ?? null) : prod
    return { ...r, products }
  })
}

/** Approve or reject via SECURITY DEFINER RPC (no direct reviews UPDATE). */
export async function moderateReview(
  id: string,
  action: 'approve' | 'reject',
): Promise<void> {
  await adminRpc('admin_moderate_review', {
    p_review_id: id,
    p_action: action,
  })
}

/** @deprecated use moderateReview */
export async function setReviewApproved(
  id: string,
  approved: boolean,
): Promise<void> {
  await moderateReview(id, approved ? 'approve' : 'reject')
}

export type ContactMessageRow = {
  id: string
  name: string
  email: string
  phone: string | null
  message: string
  created_at: string
  is_handled: boolean
  handled_at: string | null
}

export async function listContactMessages(): Promise<ContactMessageRow[]> {
  const client = requireClient()
  const { data, error } = await client
    .from('contact_messages')
    .select('id, name, email, phone, message, created_at, is_handled, handled_at')
    .order('created_at', { ascending: false })
    .limit(200)
  if (error) throw new AdminApiError(error.message)
  return (data ?? []) as ContactMessageRow[]
}

export async function markContactHandled(id: string): Promise<void> {
  const client = requireClient()
  const { error } = await client
    .from('contact_messages')
    .update({
      is_handled: true,
      handled_at: new Date().toISOString(),
    })
    .eq('id', id)
  if (error) throw new AdminApiError(error.message)
}

export type NewsletterRow = {
  id: string
  email: string
  source: string | null
  created_at: string
}

export async function listNewsletterSubscribers(): Promise<NewsletterRow[]> {
  const client = requireClient()
  const { data, error } = await client
    .from('newsletter_subscribers')
    .select('id, email, source, created_at')
    .order('created_at', { ascending: false })
  if (error) throw new AdminApiError(error.message)
  return (data ?? []) as NewsletterRow[]
}

export type DeliverySettings = {
  flatFeePKR: number
  freeAbovePKR: number
  workingDaysMin: number
  workingDaysMax: number
}

export type ContactSettings = {
  email: string
  phone: string
  whatsapp: string
}

export type AnnouncementSettings = {
  text: string
  enabled: boolean
}

export type InventorySettings = {
  lowStockThreshold: number
}

async function getSetting<T>(key: string, fallback: T): Promise<T> {
  if (!supabase) return fallback
  const { data } = await supabase.from('settings').select('value').eq('key', key).maybeSingle()
  if (!data?.value) return fallback
  return { ...fallback, ...(data.value as object) } as T
}

export async function getInventorySettings(): Promise<InventorySettings> {
  return getSetting('inventory', { lowStockThreshold: 5 })
}

export async function getAdminSettings(): Promise<{
  delivery: DeliverySettings
  contact: ContactSettings
  announcement: AnnouncementSettings
  inventory: InventorySettings
}> {
  const [delivery, contact, announcement, inventory] = await Promise.all([
    getSetting<DeliverySettings>('delivery', {
      flatFeePKR: 250,
      freeAbovePKR: 8000,
      workingDaysMin: 3,
      workingDaysMax: 5,
    }),
    getSetting<ContactSettings>('contact', {
      email: '',
      phone: '',
      whatsapp: '',
    }),
    getSetting<AnnouncementSettings>('announcement', { text: '', enabled: false }),
    getInventorySettings(),
  ])
  return { delivery, contact, announcement, inventory }
}

export async function setSetting(key: string, value: Record<string, unknown>): Promise<void> {
  const client = requireClient()
  const { error } = await client
    .from('settings')
    .upsert({ key, value, updated_at: new Date().toISOString() })
  if (error) throw new AdminApiError(error.message)
}

export type AppEventRow = {
  id: string
  event_type: string
  actor_id: string | null
  payload: Record<string, unknown>
  created_at: string
}

export async function listAppEvents(limit = 100): Promise<AppEventRow[]> {
  const client = requireClient()
  const { data, error } = await client
    .from('app_events')
    .select('id, event_type, actor_id, payload, created_at')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw new AdminApiError(error.message)
  return (data ?? []) as AppEventRow[]
}

export async function listCategoriesForAdmin() {
  const client = requireClient()
  const { data, error } = await client
    .from('categories')
    .select('id, name, slug')
    .order('sort_order', { ascending: true })
  if (error) throw new AdminApiError(error.message)
  return data ?? []
}

export async function listCollectionsForAdmin() {
  const client = requireClient()
  const { data, error } = await client
    .from('collections')
    .select('id, name, slug')
    .order('sort_order', { ascending: true })
  if (error) throw new AdminApiError(error.message)
  return data ?? []
}

export { isSupabaseConfigured }
