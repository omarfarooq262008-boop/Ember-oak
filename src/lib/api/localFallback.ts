/**
 * DEV-ONLY adapter over src/data/catalog.ts.
 * Never imported on the production happy path when Supabase URL is set.
 */
import {
  categories as localCategories,
  collections as localCollections,
  products as localProducts,
} from '@/data/catalog'
import {
  buildListRpcArgs,
  type ProductListFilters,
  type ProductSort,
} from '@/lib/api/queryBuilders'
import {
  getMaxVariantPrice,
  getMinVariantPrice,
  productHasStock,
} from '@/lib/api/stock'
import type { Category, Collection, Product, Review } from '@/types'

function activeProducts(): Product[] {
  return localProducts.filter((p) => p.is_active)
}

function sortProducts(list: Product[], sort: ProductSort): Product[] {
  const copy = [...list]
  switch (sort) {
    case 'price-asc':
      return copy.sort(
        (a, b) =>
          getMinVariantPrice(a.variants) - getMinVariantPrice(b.variants),
      )
    case 'price-desc':
      return copy.sort(
        (a, b) =>
          getMinVariantPrice(b.variants) - getMinVariantPrice(a.variants),
      )
    case 'newest':
      return copy.sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      )
    case 'featured':
    default:
      return copy.sort((a, b) => {
        if (a.is_featured !== b.is_featured) return a.is_featured ? -1 : 1
        if (a.is_bestseller !== b.is_bestseller) return a.is_bestseller ? -1 : 1
        return a.name.localeCompare(b.name)
      })
  }
}

function matchesAttributes(
  product: Product,
  attributes?: Record<string, string>,
): boolean {
  if (!attributes || Object.keys(attributes).length === 0) return true
  return (product.variants ?? []).some((v) =>
    Object.entries(attributes).every(
      ([key, value]) =>
        v.options[key as keyof typeof v.options] === value,
    ),
  )
}

export function localGetCategories(): Category[] {
  return localCategories
    .filter((c) => c.is_active)
    .sort((a, b) => a.sort_order - b.sort_order)
}

export function localGetCollections(featured?: boolean): Collection[] {
  let list = localCollections.filter((c) => c.is_active)
  if (featured) list = list.filter((c) => c.featured)
  return list.sort((a, b) => a.sort_order - b.sort_order)
}

export function localGetProductBySlug(slug: string): Product | null {
  return activeProducts().find((p) => p.slug === slug) ?? null
}

export function localGetProductsByIds(ids: string[]): Product[] {
  const byId = new Map(activeProducts().map((p) => [p.id, p]))
  return ids.map((id) => byId.get(id)).filter(Boolean) as Product[]
}

export function localListProducts(
  filters: ProductListFilters,
): { items: Product[]; total: number } {
  const args = buildListRpcArgs(filters)
  let list = activeProducts()

  if (args.p_category_slug) {
    const cat = localGetCategories().find((c) => c.slug === args.p_category_slug)
    list = cat ? list.filter((p) => p.category_id === cat.id) : []
  }
  if (args.p_collection_slug) {
    const col = localGetCollections().find(
      (c) => c.slug === args.p_collection_slug,
    )
    list = col
      ? list.filter((p) => p.collections?.some((c) => c.id === col.id))
      : []
  }
  if (args.p_min_price != null) {
    list = list.filter(
      (p) => getMaxVariantPrice(p.variants) >= Number(args.p_min_price),
    )
  }
  if (args.p_max_price != null) {
    list = list.filter(
      (p) => getMinVariantPrice(p.variants) <= Number(args.p_max_price),
    )
  }
  if (args.p_in_stock) {
    list = list.filter((p) => productHasStock(p.variants))
  }
  const attrs: Record<string, string> = {}
  if (args.p_size) attrs.size = args.p_size
  if (args.p_scent) attrs.scent = args.p_scent
  if (args.p_color) attrs.color = args.p_color
  if (Object.keys(attrs).length) {
    list = list.filter((p) => matchesAttributes(p, attrs))
  }

  list = sortProducts(list, (args.p_sort as ProductSort) ?? 'featured')
  const total = list.length
  const start = (args.p_page - 1) * args.p_page_size
  return { items: list.slice(start, start + args.p_page_size), total }
}

export function localGetBestsellers(limit = 8): Product[] {
  return activeProducts()
    .filter((p) => p.is_bestseller)
    .sort((a, b) => a.name.localeCompare(b.name))
    .slice(0, limit)
}

export function localSearchProducts(query: string, limit = 24): Product[] {
  const q = query.trim().toLowerCase()
  if (!q) return []
  return activeProducts()
    .filter((p) => {
      const hay = [
        p.name,
        p.category?.name ?? '',
        ...(p.tags ?? []),
      ]
        .join(' ')
        .toLowerCase()
      return hay.includes(q)
    })
    .slice(0, limit)
}

export function localGetRelated(product: Product, limit = 4): Product[] {
  return activeProducts()
    .filter((p) => p.id !== product.id && p.category_id === product.category_id)
    .slice(0, limit)
}

export function localGetReviews(_productId: string): Review[] {
  return []
}

export function localGetAttributeOptions(): Record<string, string[]> {
  const opts: Record<string, Set<string>> = {
    size: new Set(),
    scent: new Set(),
    color: new Set(),
  }
  for (const p of activeProducts()) {
    for (const v of p.variants ?? []) {
      for (const key of ['size', 'scent', 'color'] as const) {
        const val = v.options[key]
        if (val) opts[key]!.add(val)
      }
    }
  }
  return {
    size: [...opts.size!].sort(),
    scent: [...opts.scent!].sort(),
    color: [...opts.color!].sort(),
  }
}

export function localGetPriceBounds(): { min: number; max: number } {
  let min = Infinity
  let max = 0
  for (const p of activeProducts()) {
    for (const v of p.variants ?? []) {
      if (!v.is_active) continue
      min = Math.min(min, v.price)
      max = Math.max(max, v.price)
    }
  }
  if (!Number.isFinite(min)) return { min: 0, max: 0 }
  return { min, max }
}
