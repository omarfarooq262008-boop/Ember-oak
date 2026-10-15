import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { toast } from 'sonner'

import { store } from '@/config/store'
import { validateDiscountCode } from '@/lib/catalog'
import type { CartItem, DiscountCode } from '@/types'

const STORAGE_KEY = 'eo-cart-v1'

interface CartState {
  items: CartItem[]
  discountCode: string | null
  discountAmount: number
}

interface AddItemInput {
  variantId: string
  productId: string
  productSlug: string
  productName: string
  variantLabel: string
  sku: string
  price: number
  compareAtPrice: number | null
  quantity?: number
  imageUrl: string
  imageAlt: string
  maxStock: number
}

interface CartContextValue {
  items: CartItem[]
  itemCount: number
  subtotal: number
  deliveryFee: number
  discountAmount: number
  discountCode: string | null
  total: number
  cartOpen: boolean
  openCart: () => void
  closeCart: () => void
  setCartOpen: (open: boolean) => void
  addItem: (input: AddItemInput) => void
  updateQty: (variantId: string, quantity: number) => void
  removeItem: (variantId: string) => void
  clear: () => void
  applyDiscount: (code: string) => { ok: true } | { ok: false; message: string }
  clearDiscount: () => void
}

const CartContext = createContext<CartContextValue | null>(null)

function readStorage(): CartState {
  if (typeof window === 'undefined') {
    return { items: [], discountCode: null, discountAmount: 0 }
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { items: [], discountCode: null, discountAmount: 0 }
    const parsed = JSON.parse(raw) as CartState
    return {
      items: Array.isArray(parsed.items) ? parsed.items : [],
      discountCode: parsed.discountCode ?? null,
      discountAmount: parsed.discountAmount ?? 0,
    }
  } catch {
    return { items: [], discountCode: null, discountAmount: 0 }
  }
}

function writeStorage(state: CartState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    /* quota or private mode */
  }
}

function computeDeliveryFee(subtotalAfterDiscount: number): number {
  const { freeAbovePKR, flatFeePKR } = store.delivery
  if (subtotalAfterDiscount >= freeAbovePKR) return 0
  return flatFeePKR
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<CartState>(() => readStorage())
  const [cartOpen, setCartOpen] = useState(false)

  useEffect(() => {
    writeStorage(state)
  }, [state])

  const subtotal = useMemo(
    () => state.items.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [state.items],
  )

  const deliveryFee = useMemo(() => {
    const afterDiscount = Math.max(0, subtotal - state.discountAmount)
    return computeDeliveryFee(afterDiscount)
  }, [subtotal, state.discountAmount])

  const total = useMemo(
    () => Math.max(0, subtotal - state.discountAmount) + deliveryFee,
    [subtotal, state.discountAmount, deliveryFee],
  )

  const itemCount = useMemo(
    () => state.items.reduce((sum, item) => sum + item.quantity, 0),
    [state.items],
  )

  const openCart = useCallback(() => setCartOpen(true), [])
  const closeCart = useCallback(() => setCartOpen(false), [])

  const addItem = useCallback((input: AddItemInput) => {
    const qty = input.quantity ?? 1
    setState((prev) => {
      const existing = prev.items.find((i) => i.variantId === input.variantId)
      let items: CartItem[]
      if (existing) {
        const nextQty = Math.min(existing.quantity + qty, input.maxStock)
        items = prev.items.map((i) =>
          i.variantId === input.variantId ? { ...i, quantity: nextQty } : i,
        )
      } else {
        items = [
          ...prev.items,
          {
            variantId: input.variantId,
            productId: input.productId,
            productSlug: input.productSlug,
            productName: input.productName,
            variantLabel: input.variantLabel,
            sku: input.sku,
            price: input.price,
            compareAtPrice: input.compareAtPrice,
            quantity: Math.min(qty, input.maxStock),
            imageUrl: input.imageUrl,
            imageAlt: input.imageAlt,
            maxStock: input.maxStock,
          },
        ]
      }
      return { ...prev, items }
    })
    toast.success('Added to cart', {
      description: input.productName,
    })
  }, [])

  const updateQty = useCallback((variantId: string, quantity: number) => {
    setState((prev) => {
      if (quantity <= 0) {
        return { ...prev, items: prev.items.filter((i) => i.variantId !== variantId) }
      }
      return {
        ...prev,
        items: prev.items.map((i) =>
          i.variantId === variantId
            ? { ...i, quantity: Math.min(quantity, i.maxStock) }
            : i,
        ),
      }
    })
  }, [])

  const removeItem = useCallback((variantId: string) => {
    setState((prev) => ({
      ...prev,
      items: prev.items.filter((i) => i.variantId !== variantId),
    }))
  }, [])

  const clear = useCallback(() => {
    setState({ items: [], discountCode: null, discountAmount: 0 })
  }, [])

  const recalcDiscount = useCallback(
    (code: string | null, itemsSubtotal: number): { amount: number; code: DiscountCode | null } => {
      if (!code) return { amount: 0, code: null }
      const result = validateDiscountCode(code, itemsSubtotal)
      if (!result.valid) return { amount: 0, code: null }
      return { amount: result.discountAmount, code: result.code }
    },
    [],
  )

  const applyDiscount = useCallback(
    (code: string): { ok: true } | { ok: false; message: string } => {
      const result = validateDiscountCode(code, subtotal)
      if (!result.valid) {
        return { ok: false, message: result.message }
      }
      setState((prev) => ({
        ...prev,
        discountCode: result.code.code,
        discountAmount: result.discountAmount,
      }))
      return { ok: true }
    },
    [subtotal],
  )

  const clearDiscount = useCallback(() => {
    setState((prev) => ({ ...prev, discountCode: null, discountAmount: 0 }))
  }, [])

  useEffect(() => {
    setState((prev) => {
      if (!prev.discountCode) return prev
      const { amount } = recalcDiscount(prev.discountCode, subtotal)
      if (amount === prev.discountAmount) return prev
      return { ...prev, discountAmount: amount }
    })
  }, [subtotal, recalcDiscount])

  const value = useMemo<CartContextValue>(
    () => ({
      items: state.items,
      itemCount,
      subtotal,
      deliveryFee,
      discountAmount: state.discountAmount,
      discountCode: state.discountCode,
      total,
      cartOpen,
      openCart,
      closeCart,
      setCartOpen,
      addItem,
      updateQty,
      removeItem,
      clear,
      applyDiscount,
      clearDiscount,
    }),
    [
      state.items,
      state.discountAmount,
      state.discountCode,
      itemCount,
      subtotal,
      deliveryFee,
      total,
      cartOpen,
      openCart,
      closeCart,
      addItem,
      updateQty,
      removeItem,
      clear,
      applyDiscount,
      clearDiscount,
    ],
  )

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext)
  if (!ctx) {
    throw new Error('useCart must be used within CartProvider')
  }
  return ctx
}
