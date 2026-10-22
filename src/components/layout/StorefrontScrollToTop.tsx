import { useCallback } from 'react'

import { ScrollToTop } from '@/components/ScrollToTop'
import { useCart } from '@/contexts/CartContext'

/** Storefront: scroll reset + close cart drawer on pathname change. */
export function StorefrontScrollToTop() {
  const { closeCart } = useCart()
  const onPathnameChange = useCallback(() => {
    closeCart()
  }, [closeCart])

  return <ScrollToTop onPathnameChange={onPathnameChange} />
}
