export type ProductSort = 'featured' | 'price-asc' | 'price-desc' | 'newest'

export interface ProductListFilters {
  categorySlug?: string
  collectionSlug?: string
  minPrice?: number
  maxPrice?: number
  inStock?: boolean
  attributes?: Record<string, string>
  sort?: ProductSort
  page?: number
  pageSize?: number
}

export const DEFAULT_PAGE_SIZE = 12

/** Normalize shop filters for RPC / cache keys. */
export function buildListRpcArgs(filters: ProductListFilters) {
  const page = Math.max(1, filters.page ?? 1)
  const pageSize = Math.min(48, Math.max(1, filters.pageSize ?? DEFAULT_PAGE_SIZE))
  const attrs = filters.attributes ?? {}

  return {
    p_category_slug: filters.categorySlug?.trim() || null,
    p_collection_slug: filters.collectionSlug?.trim() || null,
    p_min_price: filters.minPrice ?? null,
    p_max_price: filters.maxPrice ?? null,
    p_in_stock: filters.inStock === true ? true : null,
    p_size: attrs.size?.trim() || null,
    p_scent: attrs.scent?.trim() || null,
    p_color: attrs.color?.trim() || null,
    p_sort: filters.sort ?? 'featured',
    p_page: page,
    p_page_size: pageSize,
  }
}

export function listCacheKey(filters: ProductListFilters): unknown[] {
  const args = buildListRpcArgs(filters)
  return ['products', 'list', args]
}

export function searchCacheKey(query: string, limit = 24): unknown[] {
  return ['products', 'search', query.trim().toLowerCase(), limit]
}

/** Offset for load-more: pages 1..N concatenated as pageSize * N */
export function loadMorePageSize(visiblePages: number, pageSize = DEFAULT_PAGE_SIZE): number {
  return Math.max(1, visiblePages) * pageSize
}

export function paginationRange(page: number, pageSize: number): { from: number; to: number } {
  const p = Math.max(1, page)
  const size = Math.max(1, pageSize)
  const from = (p - 1) * size
  return { from, to: from + size - 1 }
}
