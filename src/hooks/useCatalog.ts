import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'

import {
  fetchApprovedReviews,
  fetchAttributeOptions,
  fetchBestsellers,
  fetchCategories,
  fetchCategoryBySlug,
  fetchCollectionBySlug,
  fetchCollections,
  fetchNewest,
  fetchPriceBounds,
  fetchProductBySlug,
  fetchProductListThroughPage,
  fetchProductsByIds,
  fetchRelatedProducts,
  searchProductsRemote,
  typoTolerantFilter,
} from '@/lib/api/catalog'
import { listCacheKey, searchCacheKey } from '@/lib/api/queryBuilders'
import type { ProductListFilters } from '@/lib/api/queryBuilders'
import type { Product } from '@/types'

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: fetchCategories,
  })
}

export function useCategoryBySlug(slug: string | undefined) {
  return useQuery({
    queryKey: ['categories', 'slug', slug],
    queryFn: () => fetchCategoryBySlug(slug!),
    enabled: Boolean(slug),
  })
}

export function useCollections(featured?: boolean) {
  return useQuery({
    queryKey: ['collections', { featured: Boolean(featured) }],
    queryFn: () => fetchCollections({ featured }),
  })
}

export function useCollectionBySlug(slug: string | undefined) {
  return useQuery({
    queryKey: ['collections', 'slug', slug],
    queryFn: () => fetchCollectionBySlug(slug!),
    enabled: Boolean(slug),
  })
}

export function useBestsellers(limit = 8) {
  return useQuery({
    queryKey: ['products', 'bestsellers', limit],
    queryFn: () => fetchBestsellers(limit),
  })
}

export function useProductsByIds(ids: string[]) {
  const key = useMemo(() => [...ids].sort().join(','), [ids])
  return useQuery({
    queryKey: ['products', 'by-ids', key],
    queryFn: () => fetchProductsByIds(ids),
    enabled: ids.length > 0,
  })
}

export function useNewest(limit = 24) {
  return useQuery({
    queryKey: ['products', 'newest', limit],
    queryFn: () => fetchNewest(limit),
  })
}

export function useProductList(
  filters: ProductListFilters & { visiblePages: number },
) {
  const { visiblePages, ...rest } = filters
  return useQuery({
    queryKey: [...listCacheKey(rest), 'through', visiblePages],
    queryFn: () =>
      fetchProductListThroughPage({
        ...rest,
        visiblePages,
        pageSize: rest.pageSize ?? 12,
      }),
  })
}

export function useProductBySlug(slug: string | undefined) {
  return useQuery({
    queryKey: ['products', 'slug', slug],
    queryFn: () => fetchProductBySlug(slug!),
    enabled: Boolean(slug),
  })
}

export function useRelatedProducts(product: Product | null | undefined, limit = 4) {
  return useQuery({
    queryKey: ['products', 'related', product?.id, limit],
    queryFn: () => fetchRelatedProducts(product!, limit),
    enabled: Boolean(product?.id),
  })
}

export function useApprovedReviews(productId: string | undefined) {
  return useQuery({
    queryKey: ['reviews', productId],
    queryFn: () => fetchApprovedReviews(productId!),
    enabled: Boolean(productId),
  })
}

export function useProductSearch(query: string, limit = 24) {
  const trimmed = query.trim()
  const remote = useQuery({
    queryKey: searchCacheKey(trimmed, limit),
    queryFn: () => searchProductsRemote(trimmed, limit),
    enabled: trimmed.length >= 1,
  })

  const items = useMemo(() => {
    const remoteItems = remote.data ?? []
    if (remoteItems.length === 0 && trimmed.length >= 4) {
      // typo pass runs only when we already have a small set elsewhere;
      // when remote returns empty, try a broader fetch then filter — skip if loading
      return remoteItems
    }
    if (remoteItems.length > 0 && remoteItems.length <= 40) {
      const fuzzy = typoTolerantFilter(remoteItems, trimmed)
      return fuzzy.length > 0 ? fuzzy : remoteItems
    }
    return remoteItems
  }, [remote.data, trimmed])

  return { ...remote, data: trimmed ? items : [] }
}

export function useSearchSuggestions(query: string) {
  const trimmed = query.trim()
  const products = useProductSearch(trimmed, 6)
  const categories = useCategories()

  const categoryHits = useMemo(() => {
    if (trimmed.length < 1) return []
    const q = trimmed.toLowerCase()
    return (categories.data ?? [])
      .filter((c) => c.name.toLowerCase().includes(q) || c.slug.includes(q))
      .slice(0, 4)
  }, [categories.data, trimmed])

  return {
    products: products.data ?? [],
    categories: categoryHits,
    isLoading: products.isLoading || categories.isLoading,
    isError: products.isError,
    error: products.error,
    refetch: products.refetch,
  }
}

export function useAttributeOptions() {
  return useQuery({
    queryKey: ['catalog', 'attributes'],
    queryFn: fetchAttributeOptions,
    staleTime: 5 * 60_000,
  })
}

export function usePriceBounds() {
  return useQuery({
    queryKey: ['catalog', 'price-bounds'],
    queryFn: fetchPriceBounds,
    staleTime: 5 * 60_000,
  })
}
