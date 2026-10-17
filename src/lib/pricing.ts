/**
 * Shared storefront pricing helpers (mirrors create_order_atomic delivery rules).
 * Browser may preview totals; the database always recomputes the real charge.
 */
import { evaluateDiscountAgainstRules } from '@/lib/discountReasons'
import {
  computeDiscountAmount as computeDiscountAmountCore,
  type DiscountRule as DiscountRuleCore,
  type DiscountType as DiscountTypeCore,
} from '@/lib/pricingCore'

export {
  buildDiscountRuleSummary,
  evaluateDiscountAgainstRules,
  evaluateDiscountRow,
  messageForDiscountReason,
  type DiscountOutcome,
  type DiscountReason,
} from '@/lib/discountReasons'

export const FREE_DELIVERY_ABOVE_PKR = 8000
export const FLAT_DELIVERY_FEE_PKR = 250

export type DiscountType = DiscountTypeCore
export type DiscountRule = DiscountRuleCore

export {
  getDeliveryThresholds,
  setDeliveryThresholds,
} from '@/lib/pricingRuntime'
import { computeDeliveryFeeFromSettings } from '@/lib/pricingRuntime'

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
  return computeDiscountAmountCore(subtotal, type, value)
}

export function computeDeliveryFee(subtotalAfterDiscount: number): number {
  return computeDeliveryFeeFromSettings(subtotalAfterDiscount)
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

/** Thin wrapper kept for older call sites */
export function evaluateDiscountCode(
  code: string,
  subtotal: number,
  rules: DiscountRule[],
  now: Date = new Date(),
):
  | { valid: true; code: string; discountAmount: number }
  | { valid: false; message: string } {
  const outcome = evaluateDiscountAgainstRules(code, subtotal, rules, now)
  if (outcome.valid) {
    return {
      valid: true,
      code: outcome.code,
      discountAmount: outcome.discountAmount,
    }
  }
  return { valid: false, message: outcome.message }
}
