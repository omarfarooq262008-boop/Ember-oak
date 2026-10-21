import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

import { setSentryOrderStage, setSentryRouteTag } from '@/lib/sentry/tags'

/**
 * Keeps a lightweight Sentry `route` tag in sync with the current path.
 * Clears `order_stage` when leaving checkout-related screens.
 */
export function SentryRouteTags() {
  const location = useLocation()

  useEffect(() => {
    setSentryRouteTag(location.pathname)

    const onCheckout =
      location.pathname === '/checkout' ||
      location.pathname === '/mock-checkout' ||
      location.pathname.startsWith('/order-confirmation')
    if (!onCheckout) {
      setSentryOrderStage(null)
    }
  }, [location.pathname])

  return null
}
