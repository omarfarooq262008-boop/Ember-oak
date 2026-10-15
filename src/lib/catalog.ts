/**
 * Catalog query helpers — local data today, Supabase-ready tomorrow.
 */
import {
  categories as localCategories,
  collections as localCollections,
  products as localProducts,
} from '@/data/catalog'
import type { Category, Collection, Product } from '@/types'

export type ProductSort = 'featured' | 'price-asc' | 'price-desc' | 'newest'

export interface ProductFilters {
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

export interface PaginatedResult<T> {
  items: T[]
  total: number
}

function activeProducts(): Product[] {
  return localProducts.filter((p) => p.is_active)
}

export function getMinVariantPrice(product: Product): number {
  const variants = product.variants ?? []
  if (variants.length === 0) return 0
  return Math.min(...variants.map((v) => v.price))
}

export function getMaxVariantPrice(product: Product): number {
  const variants = product.variants ?? []
  if (variants.length === 0) return 0
  return Math.max(...variants.map((v) => v.price))
}

function productInStock(product: Product): boolean {
  return (product.variants ?? []).some((v) => v.is_active && v.stock > 0)
}

function matchesAttributes(product: Product, attributes?: Record<string, string>): boolean {
  if (!attributes || Object.keys(attributes).length === 0) return true
  const variants = product.variants ?? []
  return variants.some((v) =>
    Object.entries(attributes).every(
      ([key, value]) => v.options[key as keyof typeof v.options] === value,
    ),
  )
}

export function getCategories(): Category[] {
  return localCategories
    .filter((c) => c.is_active)
    .sort((a, b) => a.sort_order - b.sort_order)
}

export function getCategoryBySlug(slug: string): Category | undefined {
  return getCategories().find((c) => c.slug === slug)
}

export function getCollections(options?: { featured?: boolean }): Collection[] {
  let list = localCollections.filter((c) => c.is_active)
  if (options?.featured) {
    list = list.filter((c) => c.featured)
  }
  return list.sort((a, b) => a.sort_order - b.sort_order)
}

export function getCollectionBySlug(slug: string): Collection | undefined {
  return getCollections().find((c) => c.slug === slug)
}

export function getProductBySlug(slug: string): Product | undefined {
  return activeProducts().find((p) => p.slug === slug)
}

function sortProducts(list: Product[], sort: ProductSort = 'featured'): Product[] {
  const copy = [...list]
  switch (sort) {
    case 'price-asc':
      return copy.sort((a, b) => getMinVariantPrice(a) - getMinVariantPrice(b))
    case 'price-desc':
      return copy.sort((a, b) => getMinVariantPrice(b) - getMinVariantPrice(a))
    case 'newest':
      return copy.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
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

export function getProducts(filters: ProductFilters = {}): PaginatedResult<Product> {
  const {
    categorySlug,
    collectionSlug,
    minPrice,
    maxPrice,
    inStock,
    attributes,
    sort = 'featured',
    page = 1,
    pageSize = 12,
  } = filters

  let list = activeProducts()

  if (categorySlug) {
    const cat = getCategoryBySlug(categorySlug)
    if (cat) list = list.filter((p) => p.category_id === cat.id)
    else list = []
  }

  if (collectionSlug) {
    const col = getCollectionBySlug(collectionSlug)
    if (col) list = list.filter((p) => p.collections?.some((c) => c.id === col.id))
    else list = []
  }

  if (minPrice != null) {
    list = list.filter((p) => getMaxVariantPrice(p) >= minPrice)
  }

  if (maxPrice != null) {
    list = list.filter((p) => getMinVariantPrice(p) <= maxPrice)
  }

  if (inStock === true) {
    list = list.filter(productInStock)
  }

  if (attributes) {
    list = list.filter((p) => matchesAttributes(p, attributes))
  }

  list = sortProducts(list, sort)

  const total = list.length
  const start = (Math.max(1, page) - 1) * pageSize
  const items = list.slice(start, start + pageSize)

  return { items, total }
}

export function getBestsellers(limit = 8): Product[] {
  const list = activeProducts()
    .filter((p) => p.is_bestseller)
    .sort((a, b) => a.name.localeCompare(b.name))
  return list.slice(0, limit)
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
  const tokens = t.split(/[\s\-_/]+/)
  return tokens.some((token) => {
    if (token.length < 4) return token === q
    return levenshtein(q, token) <= 1
  })
}

function productSearchText(product: Product): string {
  return [
    product.name,
    product.short_description,
    product.description,
    ...(product.tags ?? []),
    product.category?.name ?? '',
  ]
    .join(' ')
    .toLowerCase()
}

export function searchProducts(query: string): Product[] {
  const trimmed = query.trim()
  if (!trimmed) return []

  const words = trimmed.toLowerCase().split(/\s+/).filter(Boolean)

  return activeProducts().filter((product) => {
    const haystack = productSearchText(product)
    return words.every((word) => wordMatches(word, haystack))
  })
}

export function getRelatedProducts(product: Product, limit = 4): Product[] {
  const collectionIds = new Set(product.collections?.map((c) => c.id) ?? [])
  const scored = activeProducts()
    .filter((p) => p.id !== product.id)
    .map((p) => {
      let score = 0
      if (p.category_id === product.category_id) score += 2
      if (p.collections?.some((c) => collectionIds.has(c.id))) score += 3
      if (p.is_bestseller) score += 1
      return { p, score }
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || a.p.name.localeCompare(b.p.name))

  return scored.slice(0, limit).map(({ p }) => p)
}

