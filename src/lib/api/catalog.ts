import { mapCategory, mapCollection, mapProduct, mapReview } from '@/lib/api/mappers'
import {
  buildListRpcArgs,
  type ProductListFilters,
} from '@/lib/api/queryBuilders'
import * as local from '@/lib/api/localFallback'
import { requireSupabaseOrFallback } from '@/lib/api/source'
import { supabase } from '@/lib/supabase'
import type { Category, Collection, Product, Review } from '@/types'

const PRODUCT_CARD_SELECT = `
  id, slug, name, short_description, category_id, tags,
  is_active, is_featured, is_bestseller, created_at,
  categories ( id, slug, name, description, image_url, sort_order, is_active ),
  product_variants ( id, product_id, sku, options, price, compare_at_price, stock, is_active ),
  product_images ( id, product_id, url, alt, sort_order, is_primary )
`

const PRODUCT_DETAIL_SELECT = `
  id, slug, name, short_description, description, category_id,
  materials, dimensions, care, tags,
  is_active, is_featured, is_bestseller, created_at,
  categories ( id, slug, name, description, image_url, sort_order, is_active ),
  product_variants ( id, product_id, sku, options, price, compare_at_price, stock, is_active ),
  product_images ( id, product_id, url, alt, sort_order, is_primary ),
  collection_products ( collections ( id, slug, name, description, image_url, featured, sort_order, is_active ) ),
  reviews ( rating )
`

function client() {
  if (!supabase) {
    throw new Error('Supabase client is not configured.')
  }
  return supabase
}

async function fetchProductsByIdsInternal(
  ids: string[],
  detail = false,
): Promise<Product[]> {
  if (ids.length === 0) return []
  const { data, error } = await client()
    .from('products')
    .select(detail ? PRODUCT_DETAIL_SELECT : PRODUCT_CARD_SELECT)
    .in('id', ids)
    .eq('is_active', true)

  if (error) throw new Error(error.message)

  const rows = (data as unknown as Record<string, unknown>[] | null) ?? []
  const byId = new Map(
    rows.map((r) => [String(r.id), mapProduct(r as never)] as const),
  )
  return ids.map((id) => byId.get(id)).filter(Boolean) as Product[]
}

export async function fetchProductsByIds(ids: string[]): Promise<Product[]> {
  if (ids.length === 0) return []
  if (requireSupabaseOrFallback() === 'local') {
    return local.localGetProductsByIds(ids)
  }
  return fetchProductsByIdsInternal(ids, false)
}

export async function fetchCategories(): Promise<Category[]> {
  if (requireSupabaseOrFallback() === 'local') return local.localGetCategories()

  const { data, error } = await client()
    .from('categories')
    .select('id, slug, name, description, image_url, sort_order, is_active')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  if (error) throw new Error(error.message)
  return (data ?? []).map((r) => mapCategory(r as Record<string, unknown>))
}

export async function fetchCollections(options?: {
  featured?: boolean
}): Promise<Collection[]> {
  if (requireSupabaseOrFallback() === 'local') {
    return local.localGetCollections(options?.featured)
  }

  let q = client()
    .from('collections')
    .select(
      'id, slug, name, description, image_url, featured, sort_order, is_active',
    )
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  if (options?.featured) q = q.eq('featured', true)

  const { data, error } = await q
  if (error) throw new Error(error.message)
  return (data ?? []).map((r) => mapCollection(r as Record<string, unknown>))
}

export async function fetchCollectionBySlug(
  slug: string,
): Promise<Collection | null> {
  const all = await fetchCollections()
  return all.find((c) => c.slug === slug) ?? null
}

export async function fetchCategoryBySlug(
  slug: string,
): Promise<Category | null> {
  const all = await fetchCategories()
  return all.find((c) => c.slug === slug) ?? null
}

export async function fetchProductList(
  filters: ProductListFilters,
): Promise<{ items: Product[]; total: number }> {
  if (requireSupabaseOrFallback() === 'local') {
    return local.localListProducts(filters)
  }

  const args = buildListRpcArgs(filters)
  const { data, error } = await client().rpc('catalog_list_product_ids', args)

  if (error) throw new Error(error.message)

  const rows = (data ?? []) as Array<{ product_id: string; total_count: number }>
  const total = rows.length > 0 ? Number(rows[0]!.total_count) : 0
  const ids = rows.map((r) => r.product_id)
  const items = await fetchProductsByIds(ids)
  return { items, total }
}

/** Load-more: fetch pages 1..visiblePage as one window via page_size * page */
export async function fetchProductListThroughPage(
  filters: Omit<ProductListFilters, 'page' | 'pageSize'> & {
    visiblePages: number
    pageSize?: number
  },
): Promise<{ items: Product[]; total: number }> {
  const pageSize = filters.pageSize ?? 12
  return fetchProductList({
    ...filters,
    page: 1,
    pageSize: pageSize * Math.max(1, filters.visiblePages),
  })
}

export async function fetchBestsellers(limit = 8): Promise<Product[]> {
  if (requireSupabaseOrFallback() === 'local') {
    return local.localGetBestsellers(limit)
  }

  const { data, error } = await client()
    .from('products')
    .select(PRODUCT_CARD_SELECT)
    .eq('is_active', true)
    .eq('is_bestseller', true)
    .order('name', { ascending: true })
    .limit(limit)

  if (error) throw new Error(error.message)
  return (data ?? []).map((r) => mapProduct(r as never))
}

export async function fetchNewest(limit = 12): Promise<Product[]> {
  if (requireSupabaseOrFallback() === 'local') {
    return local
      .localListProducts({ sort: 'newest', page: 1, pageSize: limit })
      .items
  }

  const { data, error } = await client()
    .from('products')
    .select(PRODUCT_CARD_SELECT)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw new Error(error.message)
  return (data ?? []).map((r) => mapProduct(r as never))
}

export async function fetchProductBySlug(slug: string): Promise<Product | null> {
  if (requireSupabaseOrFallback() === 'local') {
    return local.localGetProductBySlug(slug)
  }

  const { data, error } = await client()
    .from('products')
    .select(PRODUCT_DETAIL_SELECT)
    .eq('slug', slug)
    .eq('is_active', true)
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!data) return null
  return mapProduct(data as never)
}

export async function fetchRelatedProducts(
  product: Product,
  limit = 4,
): Promise<Product[]> {
  if (requireSupabaseOrFallback() === 'local') {
    return local.localGetRelated(product, limit)
  }

  if (!product.category_id) return []

  const { data, error } = await client()
    .from('products')
    .select(PRODUCT_CARD_SELECT)
    .eq('is_active', true)
    .eq('category_id', product.category_id)
    .neq('id', product.id)
    .order('is_bestseller', { ascending: false })
    .limit(limit)

  if (error) throw new Error(error.message)
  return (data ?? []).map((r) => mapProduct(r as never))
}

export async function fetchApprovedReviews(
  productId: string,
  limit = 20,
): Promise<Review[]> {
  if (requireSupabaseOrFallback() === 'local') {
    return local.localGetReviews(productId).slice(0, limit)
  }

  const { data, error } = await client()
    .from('reviews')
    .select(
      'id, product_id, customer_name, rating, title, body, is_verified, is_approved, created_at',
    )
    .eq('product_id', productId)
    .eq('is_approved', true)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw new Error(error.message)
  return (data ?? []).map((r) => mapReview(r as Record<string, unknown>))
}

export async function searchProductsRemote(
  query: string,
  limit = 24,
): Promise<Product[]> {
  const q = query.trim()
  if (!q) return []

  if (requireSupabaseOrFallback() === 'local') {
    return local.localSearchProducts(q, limit)
  }

  const { data, error } = await client().rpc('catalog_search_product_ids', {
    p_query: q,
    p_limit: limit,
  })

  if (error) throw new Error(error.message)
  const ids = ((data ?? []) as Array<{ product_id: string }>).map(
    (r) => r.product_id,
  )
  return fetchProductsByIds(ids)
}

/** Client-side typo tolerance over a small candidate set. */
export function typoTolerantFilter(
  products: Product[],
  query: string,
): Product[] {
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean)
  if (words.length === 0) return products

  return products.filter((product) => {
    const hay = [
      product.name,
      product.category?.name ?? '',
      ...(product.tags ?? []),
    ]
      .join(' ')
      .toLowerCase()
    return words.every((word) => wordMatches(word, hay))
  })
}

function levenshtein(a: string, b: string): number {
  const m = a.length
  const n = b.length
  const dp: number[] = Array.from({ length: n + 1 }, (_, j) => j)
  for (let i = 1; i <= m; i++) {
    let prev = dp[0]!
    dp[0] = i
    for (let j = 1; j <= n; j++) {
      const temp = dp[j]!
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      dp[j] = Math.min(dp[j]! + 1, dp[j - 1]! + 1, prev + cost)
      prev = temp
    }
  }
  return dp[n]!
}

function wordMatches(queryWord: string, target: string): boolean {
  const q = queryWord.toLowerCase()
  const t = target.toLowerCase()
  if (t.includes(q)) return true
  if (q.length < 4) return false
  return t.split(/[\s\-_/]+/).some((token) => {
    if (token.length < 4) return token === q
    return levenshtein(q, token) <= 1
  })
}

export async function fetchAttributeOptions(): Promise<
  Record<string, string[]>
> {
  if (requireSupabaseOrFallback() === 'local') {
    return local.localGetAttributeOptions()
  }

  const { data, error } = await client()
    .from('product_variants')
    .select('options, is_active, products!inner(is_active)')
    .eq('is_active', true)
    .eq('products.is_active', true)

  if (error) throw new Error(error.message)

  const opts: Record<string, Set<string>> = {
    size: new Set(),
    scent: new Set(),
    color: new Set(),
  }
  for (const row of data ?? []) {
    const options = (row as { options?: Record<string, string> }).options ?? {}
    for (const key of ['size', 'scent', 'color'] as const) {
      const val = options[key]
      if (val) opts[key]!.add(val)
    }
  }
  return {
    size: [...opts.size!].sort(),
    scent: [...opts.scent!].sort(),
    color: [...opts.color!].sort(),
  }
}

export async function fetchPriceBounds(): Promise<{ min: number; max: number }> {
  if (requireSupabaseOrFallback() === 'local') {
    return local.localGetPriceBounds()
  }

  const { data, error } = await client()
    .from('product_variants')
    .select('price, is_active, products!inner(is_active)')
    .eq('is_active', true)
    .eq('products.is_active', true)

  if (error) throw new Error(error.message)
  let min = Infinity
  let max = 0
  for (const row of data ?? []) {
    const price = Number((row as { price: number }).price)
    min = Math.min(min, price)
    max = Math.max(max, price)
  }
  if (!Number.isFinite(min)) return { min: 0, max: 0 }
  return { min, max }
}

export type { ProductListFilters }
export type { ProductSort } from '@/lib/api/queryBuilders'
