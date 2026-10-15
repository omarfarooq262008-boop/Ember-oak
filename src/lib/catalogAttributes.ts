import { getProducts } from '@/lib/catalog'
import type { ProductAttributeKey } from '@/types'

const ATTR_KEYS: ProductAttributeKey[] = ['size', 'scent', 'color']

export function getCatalogAttributeOptions(): Record<
  ProductAttributeKey,
  string[]
> {
  const { items } = getProducts({ pageSize: 500 })
  const sets: Record<ProductAttributeKey, Set<string>> = {
    size: new Set(),
    scent: new Set(),
    color: new Set(),
  }

  for (const product of items) {
    for (const variant of product.variants ?? []) {
      for (const key of ATTR_KEYS) {
        const val = variant.options[key]
        if (val) sets[key].add(val)
      }
    }
  }

  return {
    size: [...sets.size].sort((a, b) => a.localeCompare(b)),
    scent: [...sets.scent].sort((a, b) => a.localeCompare(b)),
    color: [...sets.color].sort((a, b) => a.localeCompare(b)),
  }
}

export function getCatalogPriceBounds(): { min: number; max: number } {
  const { items } = getProducts({ pageSize: 500 })
  let min = Infinity
  let max = 0
  for (const product of items) {
    for (const v of product.variants ?? []) {
      if (v.price < min) min = v.price
      if (v.price > max) max = v.price
    }
  }
  if (!Number.isFinite(min)) return { min: 0, max: 100000 }
  return { min, max }
}
