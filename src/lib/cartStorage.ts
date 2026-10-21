import type { CartItem } from '@/types'

export const CART_STORAGE_KEY = 'eo-cart-v1'

export type StoredCartState = {
  items: CartItem[]
  discountCode: string | null
  discountAmount: number
  discountRuleSummary: string | null
}

export function emptyCartState(): StoredCartState {
  return {
    items: [],
    discountCode: null,
    discountAmount: 0,
    discountRuleSummary: null,
  }
}

export function loadCartState(
  storage: Pick<Storage, 'getItem'> | null = typeof window !== 'undefined'
    ? window.localStorage
    : null,
): StoredCartState {
  if (!storage) return emptyCartState()
  try {
    const raw = storage.getItem(CART_STORAGE_KEY)
    if (!raw) return emptyCartState()
    const parsed = JSON.parse(raw) as Partial<StoredCartState>
    return {
      items: Array.isArray(parsed.items) ? parsed.items : [],
      discountCode: parsed.discountCode ?? null,
      discountAmount: parsed.discountAmount ?? 0,
      discountRuleSummary: parsed.discountRuleSummary ?? null,
    }
  } catch {
    return emptyCartState()
  }
}

export function saveCartState(
  state: StoredCartState,
  storage: Pick<Storage, 'setItem'> | null = typeof window !== 'undefined'
    ? window.localStorage
    : null,
): void {
  if (!storage) return
  try {
    storage.setItem(CART_STORAGE_KEY, JSON.stringify(state))
  } catch {
    /* quota or private mode */
  }
}
