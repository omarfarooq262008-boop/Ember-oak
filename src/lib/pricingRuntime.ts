/**
 * Mutable delivery thresholds used by computeDeliveryFee.
 * Storefront settings hydrate these at runtime; defaults match store.ts.
 */
import { store } from '@/config/store'

let freeAbove: number = store.delivery.freeAbovePKR
let flatFee: number = store.delivery.flatFeePKR

export function setDeliveryThresholds(next: {
  freeAbovePKR: number
  flatFeePKR: number
}) {
  freeAbove = next.freeAbovePKR
  flatFee = next.flatFeePKR
}

export function getDeliveryThresholds() {
  return { freeAbovePKR: freeAbove, flatFeePKR: flatFee }
}

export function computeDeliveryFeeFromSettings(
  subtotalAfterDiscount: number,
): number {
  if (subtotalAfterDiscount >= freeAbove) return 0
  return flatFee
}
