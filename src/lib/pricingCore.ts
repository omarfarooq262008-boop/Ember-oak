/** Tiny core helpers — no imports from discountReasons (avoids cycles). */

export type DiscountType = 'percent' | 'fixed'

export type DiscountRule = {
  code: string
  type: DiscountType
  value: number
  min_spend: number | null
  max_uses: number | null
  used_count: number
  starts_at: string | null
  ends_at: string | null
  is_active: boolean
}

export function computeDiscountAmount(
  subtotal: number,
  type: DiscountType,
  value: number,
): number {
  if (subtotal <= 0 || value <= 0) return 0
  if (type === 'percent') {
    return Math.floor((subtotal * value) / 100)
  }
  return Math.min(subtotal, value)
}
