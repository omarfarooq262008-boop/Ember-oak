import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'

import { useAuth } from '@/contexts/AuthContext'
import { isSupabaseConfigured, supabase } from '@/lib/supabase'

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
    return Array.isArray(parsed)
      ? parsed.filter((id) => typeof id === 'string')
      : []
  } catch {
    return []
  }
}

function writeIds(ids: string[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids))
  } catch {
    /* ignore */
  }
}

export function WishlistProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [ids, setIds] = useState<string[]>(() => readIds())
  const mergedForUser = useRef<string | null>(null)

  // Persist for guests (and as a local cache when logged in)
  useEffect(() => {
    writeIds(ids)
  }, [ids])

  // After login: merge local guest wishlist into DB, then load DB ids
  useEffect(() => {
    if (!user?.id || !supabase || !isSupabaseConfigured) {
      mergedForUser.current = null
      return
    }
    if (mergedForUser.current === user.id) return
    mergedForUser.current = user.id

    const client = supabase
    if (!client) return

    const run = async () => {
      const local = readIds()
      if (local.length > 0) {
        await client.from('wishlists').upsert(
          local.map((product_id) => ({
            user_id: user.id,
            product_id,
          })),
          { onConflict: 'user_id,product_id', ignoreDuplicates: true },
        )
      }
      const { data } = await client
        .from('wishlists')
        .select('product_id')
        .eq('user_id', user.id)
      if (data) {
        setIds(data.map((r) => r.product_id as string))
      }
    }
    void run()
  }, [user?.id])

  const toggle = useCallback(
    (productId: string) => {
      setIds((prev) => {
        const next = prev.includes(productId)
          ? prev.filter((id) => id !== productId)
          : [...prev, productId]
        return next
      })

      const client = supabase
      if (user?.id && client) {
        const removing = ids.includes(productId)
        if (removing) {
          void client
            .from('wishlists')
            .delete()
            .eq('user_id', user.id)
            .eq('product_id', productId)
        } else {
          void client.from('wishlists').upsert(
            { user_id: user.id, product_id: productId },
            { onConflict: 'user_id,product_id' },
          )
        }
      }
    },
    [user?.id, ids],
  )

  const isWishlisted = useCallback(
    (productId: string) => ids.includes(productId),
    [ids],
  )

  const value = useMemo(
    () => ({ ids, toggle, isWishlisted }),
    [ids, toggle, isWishlisted],
  )

  return (
    <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>
  )
}

export function useWishlist(): WishlistContextValue {
  const ctx = useContext(WishlistContext)
  if (!ctx) {
    throw new Error('useWishlist must be used within WishlistProvider')
  }
  return ctx
}
