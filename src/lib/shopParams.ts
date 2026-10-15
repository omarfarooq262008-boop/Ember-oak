import type { ProductFilters, ProductSort } from '@/lib/catalog'
import type { ProductAttributeKey } from '@/types'

const SORT_VALUES: ProductSort[] = ['featured', 'price-asc', 'price-desc', 'newest']
const ATTR_KEYS: ProductAttributeKey[] = ['size', 'scent', 'color']

export const SHOP_PAGE_SIZE = 12

export type ShopSearchParams = ProductFilters & {
  page: number
}

export function parseShopSearchParams(
  searchParams: URLSearchParams,
): ShopSearchParams {
  const sortRaw = searchParams.get('sort')
  const sort = SORT_VALUES.includes(sortRaw as ProductSort)
    ? (sortRaw as ProductSort)
    : 'featured'

  const pageRaw = parseInt(searchParams.get('page') ?? '1', 10)
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1

  const minRaw = searchParams.get('minPrice')
  const maxRaw = searchParams.get('maxPrice')
  const minPrice = minRaw != null && minRaw !== '' ? Number(minRaw) : undefined
  const maxPrice = maxRaw != null && maxRaw !== '' ? Number(maxRaw) : undefined

  const inStockParam = searchParams.get('inStock')
  const inStock =
    inStockParam === 'true' ? true : inStockParam === 'false' ? false : undefined

  const attributes: Record<string, string> = {}
  for (const key of ATTR_KEYS) {
    const v = searchParams.get(key)
    if (v) attributes[key] = v
  }

  return {
    categorySlug: searchParams.get('category') ?? undefined,
    collectionSlug: searchParams.get('collection') ?? undefined,
    minPrice: minPrice != null && !Number.isNaN(minPrice) ? minPrice : undefined,
    maxPrice: maxPrice != null && !Number.isNaN(maxPrice) ? maxPrice : undefined,
    inStock,
    attributes: Object.keys(attributes).length > 0 ? attributes : undefined,
    sort,
    page,
    pageSize: SHOP_PAGE_SIZE,
  }
}

export function shopParamsToSearchParams(
  params: ShopSearchParams,
): URLSearchParams {
  const sp = new URLSearchParams()
  if (params.categorySlug) sp.set('category', params.categorySlug)
  if (params.collectionSlug) sp.set('collection', params.collectionSlug)
  if (params.minPrice != null) sp.set('minPrice', String(params.minPrice))
  if (params.maxPrice != null) sp.set('maxPrice', String(params.maxPrice))
  if (params.inStock === true) sp.set('inStock', 'true')
  if (params.inStock === false) sp.set('inStock', 'false')
  if (params.attributes) {
    for (const [k, v] of Object.entries(params.attributes)) {
      if (v) sp.set(k, v)
    }
  }
  if (params.sort && params.sort !== 'featured') sp.set('sort', params.sort)
  if (params.page > 1) sp.set('page', String(params.page))
  return sp
}
