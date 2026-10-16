import { describe, expect, it } from 'vitest'

import {
  buildListRpcArgs,
  listCacheKey,
  loadMorePageSize,
  paginationRange,
  searchCacheKey,
} from '@/lib/api/queryBuilders'

describe('buildListRpcArgs', () => {
  it('normalizes empty filters to nulls and defaults', () => {
    expect(buildListRpcArgs({})).toEqual({
      p_category_slug: null,
      p_collection_slug: null,
      p_min_price: null,
      p_max_price: null,
      p_in_stock: null,
      p_size: null,
      p_scent: null,
      p_color: null,
      p_sort: 'featured',
      p_page: 1,
      p_page_size: 12,
    })
  })

  it('maps shop filters including attributes and clamps page size', () => {
    const args = buildListRpcArgs({
      categorySlug: ' candles ',
      collectionSlug: 'amber-hours',
      minPrice: 1000,
      maxPrice: 9000,
      inStock: true,
      attributes: { size: '220 g', scent: 'Amber', color: 'Ash' },
      sort: 'price-asc',
      page: 2,
      pageSize: 100,
    })
    expect(args.p_category_slug).toBe('candles')
    expect(args.p_collection_slug).toBe('amber-hours')
    expect(args.p_min_price).toBe(1000)
    expect(args.p_max_price).toBe(9000)
    expect(args.p_in_stock).toBe(true)
    expect(args.p_size).toBe('220 g')
    expect(args.p_scent).toBe('Amber')
    expect(args.p_color).toBe('Ash')
    expect(args.p_sort).toBe('price-asc')
    expect(args.p_page).toBe(2)
    expect(args.p_page_size).toBe(48)
  })

  it('treats inStock false as null (no filter)', () => {
    expect(buildListRpcArgs({ inStock: false }).p_in_stock).toBeNull()
  })
})

describe('pagination helpers', () => {
  it('computes load-more window size', () => {
    expect(loadMorePageSize(1)).toBe(12)
    expect(loadMorePageSize(3, 12)).toBe(36)
  })

  it('computes inclusive range', () => {
    expect(paginationRange(1, 12)).toEqual({ from: 0, to: 11 })
    expect(paginationRange(2, 12)).toEqual({ from: 12, to: 23 })
  })
})

describe('cache keys', () => {
  it('includes normalized list args', () => {
    const key = listCacheKey({ categorySlug: 'candles', page: 1 })
    expect(key[0]).toBe('products')
    expect(key[1]).toBe('list')
  })

  it('normalizes search query case', () => {
    expect(searchCacheKey('  Candle  ')).toEqual([
      'products',
      'search',
      'candle',
      24,
    ])
  })
})
