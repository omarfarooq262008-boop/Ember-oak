import type { ProductVariant } from '@/types'

export type StockState =
  | { kind: 'out_of_stock'; label: string }
  | { kind: 'low_stock'; label: string; stock: number }
  | { kind: 'in_stock'; label: string; stock: number }

/** Live stock messaging for a single variant. */
export function getStockState(variant: Pick<ProductVariant, 'stock'> | null | undefined): StockState {
  const stock = variant?.stock ?? 0
  if (stock <= 0) {
    return { kind: 'out_of_stock', label: 'Out of stock' }
  }
  if (stock <= 3) {
    return { kind: 'low_stock', label: `Only ${stock} left`, stock }
  }
  return { kind: 'in_stock', label: 'In stock', stock }
}

export function productHasStock(
  variants: Array<Pick<ProductVariant, 'stock' | 'is_active'>> | null | undefined,
): boolean {
  return (variants ?? []).some((v) => v.is_active && v.stock > 0)
}

export function getMinVariantPrice(
  variants: Array<Pick<ProductVariant, 'price' | 'is_active'>> | null | undefined,
): number {
  const active = (variants ?? []).filter((v) => v.is_active)
  if (active.length === 0) return 0
  return Math.min(...active.map((v) => Number(v.price)))
}

export function getMaxVariantPrice(
  variants: Array<Pick<ProductVariant, 'price' | 'is_active'>> | null | undefined,
): number {
  const active = (variants ?? []).filter((v) => v.is_active)
  if (active.length === 0) return 0
  return Math.max(...active.map((v) => Number(v.price)))
}
