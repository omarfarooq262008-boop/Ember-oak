import { describe, expect, it } from 'vitest'

import {
  CART_STORAGE_KEY,
  loadCartState,
  saveCartState,
  type StoredCartState,
} from './cartStorage'

function memoryStorage() {
  const map = new Map<string, string>()
  return {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => {
      map.set(key, value)
    },
  }
}

describe('cart discount persistence', () => {
  it('keeps the applied discount code and amount across save/load (re-render / reload)', () => {
    const storage = memoryStorage()
    const applied: StoredCartState = {
      items: [
        {
          variantId: 'v1',
          productId: 'p1',
          productSlug: 'candle',
          productName: 'Candle',
          variantLabel: 'Default',
          sku: 'C-1',
          price: 2500,
          compareAtPrice: null,
          quantity: 1,
          imageUrl: '/images/candle-warm.jpg',
          imageAlt: 'Candle',
          maxStock: 5,
        },
      ],
      discountCode: 'WELCOME10',
      discountAmount: 250,
      discountRuleSummary: '10% off',
    }

    saveCartState(applied, storage)

    // Simulate a component re-mount / page reload reading shared cart state
    const restored = loadCartState(storage)

    expect(storage.getItem(CART_STORAGE_KEY)).toContain('WELCOME10')
    expect(restored.discountCode).toBe('WELCOME10')
    expect(restored.discountAmount).toBe(250)
    expect(restored.discountRuleSummary).toBe('10% off')
    expect(restored.items).toHaveLength(1)
  })
})
