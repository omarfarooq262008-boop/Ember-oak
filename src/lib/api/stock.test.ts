import { describe, expect, it } from 'vitest'

import {
  getMaxVariantPrice,
  getMinVariantPrice,
  getStockState,
  productHasStock,
} from '@/lib/api/stock'

describe('getStockState', () => {
  it('reports out of stock', () => {
    expect(getStockState({ stock: 0 })).toEqual({
      kind: 'out_of_stock',
      label: 'Out of stock',
    })
    expect(getStockState(null).kind).toBe('out_of_stock')
  })

  it('reports low stock at 3 or fewer', () => {
    expect(getStockState({ stock: 3 })).toEqual({
      kind: 'low_stock',
      label: 'Only 3 left',
      stock: 3,
    })
    expect(getStockState({ stock: 1 }).label).toBe('Only 1 left')
  })

  it('reports in stock above 3', () => {
    expect(getStockState({ stock: 4 })).toEqual({
      kind: 'in_stock',
      label: 'In stock',
      stock: 4,
    })
  })
})

describe('variant price helpers', () => {
  const variants = [
    { price: 4500, is_active: true, stock: 2 },
    { price: 7200, is_active: true, stock: 0 },
    { price: 100, is_active: false, stock: 9 },
  ]

  it('uses only active variants for min/max', () => {
    expect(getMinVariantPrice(variants)).toBe(4500)
    expect(getMaxVariantPrice(variants)).toBe(7200)
  })

  it('detects availability from active stock', () => {
    expect(productHasStock(variants)).toBe(true)
    expect(productHasStock([{ is_active: true, stock: 0 }])).toBe(false)
  })
})
