import { useEffect } from 'react'

import { useStoreSettings } from '@/hooks/useStoreSettings'
import { setDeliveryThresholds } from '@/lib/pricing'

/** Loads admin settings into client pricing helpers used by cart/checkout. */
export function StoreSettingsHydrator() {
  const { delivery } = useStoreSettings()

  useEffect(() => {
    setDeliveryThresholds({
      freeAbovePKR: delivery.freeAbovePKR,
      flatFeePKR: delivery.flatFeePKR,
    })
  }, [delivery.flatFeePKR, delivery.freeAbovePKR])

  return null
}
