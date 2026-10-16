/**
 * Shared storefront pricing helpers (mirrors create_order_atomic delivery rules).
 * Browser may preview totals; the database always recomputes the real charge.
 */

export const FREE_DELIVERY_ABOVE_PKR = 8000
export const FLAT_DELIVERY_FEE_PKR = 250

export type DiscountType = 'percent' | 'fixed'

export function computeLineTotal(unitPrice: number, quantity: number): number {
  if (unitPrice < 0 || quantity < 0) return 0
  return unitPrice * quantity
}

export function computeSubtotal(
  lines: { unitPrice: number; quantity: number }[],
): number {
  return lines.reduce(
    (sum, line) => sum + computeLineTotal(line.unitPrice, line.quantity),
    0,
  )
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

export function computeDeliveryFee(subtotalAfterDiscount: number): number {
  if (subtotalAfterDiscount >= FREE_DELIVERY_ABOVE_PKR) return 0
  return FLAT_DELIVERY_FEE_PKR
}

export function computeOrderTotal(
  subtotal: number,
  discountAmount: number,
): { deliveryFee: number; total: number; afterDiscount: number } {
  const afterDiscount = Math.max(0, subtotal - discountAmount)
  const deliveryFee = computeDeliveryFee(afterDiscount)
  return {
    afterDiscount,
    deliveryFee,
    total: afterDiscount + deliveryFee,
  }
}

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

export function evaluateDiscountCode(
  code: string,
  subtotal: number,
  rules: DiscountRule[],
  now: Date = new Date(),
):
  | { valid: true; code: string; discountAmount: number }
  | { valid: false; message: string } {
  const normalized = code.trim().toUpperCase()
  if (!normalized) {
    return { valid: false, message: 'Enter a discount code.' }
  }

  const match = rules.find(
    (dc) => dc.is_active && dc.code.toUpperCase() === normalized,
  )
  if (!match) {
    return { valid: false, message: 'This code is not valid.' }
  }

  const t = now.getTime()
  if (match.starts_at && new Date(match.starts_at).getTime() > t) {
    return { valid: false, message: 'This code is not active yet.' }
  }
  if (match.ends_at && new Date(match.ends_at).getTime() < t) {
    return { valid: false, message: 'This code has expired.' }
  }
  if (match.max_uses != null && match.used_count >= match.max_uses) {
    return { valid: false, message: 'This code has reached its usage limit.' }
  }
  if (match.min_spend != null && subtotal < match.min_spend) {
    return {
      valid: false,
      message: `Minimum spend is PKR ${match.min_spend.toLocaleString('en-PK')}.`,
    }
  }

  const discountAmount = computeDiscountAmount(subtotal, match.type, match.value)
  if (discountAmount <= 0) {
    return {
      valid: false,
      message: 'This code cannot be applied to your cart.',
    }
  }

  return { valid: true, code: match.code, discountAmount }
}
