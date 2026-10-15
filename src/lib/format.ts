import { store } from '@/config/store'

/** Format amount as "PKR 4,500" with thousands separators. */
export function formatPKR(amount: number): string {
  const rounded = Math.round(amount)
  const formatted = new Intl.NumberFormat(store.currency.locale, {
    maximumFractionDigits: 0,
  }).format(rounded)
  return `${store.currency.code} ${formatted}`
}

export function savingsAmount(price: number, compareAt?: number | null): number | null {
  if (!compareAt || compareAt <= price) return null
  return compareAt - price
}
