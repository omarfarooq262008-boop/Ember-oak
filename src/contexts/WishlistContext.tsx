import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

const STORAGE_KEY = 'eo-wishlist-v1'

interface WishlistContextValue {
  ids: string[]
  toggle: (productId: string) => void
  isWishlisted: (productId: string) => boolean
}

const WishlistContext = createContext<WishlistContextValue | null>(null)

function readIds(): string[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    return Array.isArray(parsed) ? parsed.filter((id) => typeof id === 'string') : []
  } catch {
    return []
  }
}

export function WishlistProvider({ children }: { children: ReactNode }) {
  const [ids, setIds] = useState<string[]>(() => readIds())

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(ids))
    } catch {
      /* ignore */
    }
  }, [ids])

  const toggle = useCallback((productId: string) => {
    setIds((prev) =>
      prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId],
    )
  }, [])

  const isWishlisted = useCallback(
    (productId: string) => ids.includes(productId),
    [ids],
  )

  const value = useMemo(
    () => ({ ids, toggle, isWishlisted }),
    [ids, toggle, isWishlisted],
  )

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>
}

export function useWishlist(): WishlistContextValue {
  const ctx = useContext(WishlistContext)
  if (!ctx) {
    throw new Error('useWishlist must be used within WishlistProvider')
  }
  return ctx
}
