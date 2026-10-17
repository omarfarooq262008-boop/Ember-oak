import { XIcon } from 'lucide-react'
import { useState } from 'react'

import { store } from '@/config/store'
import { useStoreSettings } from '@/hooks/useStoreSettings'
import { cn } from '@/lib/utils'

function readDismissed(text: string): boolean {
  if (!text) return true
  if (!store.announcement.dismissible) return false
  try {
    return localStorage.getItem(store.announcement.storageKey) === '1'
  } catch {
    return false
  }
}

export function AnnouncementBar() {
  const { announcement } = useStoreSettings()
  const text = announcement.enabled ? announcement.text : ''
  const [dismissed, setDismissed] = useState(() => readDismissed(text))

  if (!text || dismissed) return null

  const dismiss = () => {
    setDismissed(true)
    try {
      localStorage.setItem(store.announcement.storageKey, '1')
    } catch {
      /* ignore */
    }
  }

  return (
    <div
      role="region"
      aria-label="Store announcement"
      className="relative bg-brand-band px-4 py-2.5 text-center text-sm text-brand-band-text"
    >
      <p className="mx-auto max-w-3xl pr-10 md:pr-0">{text}</p>
      {store.announcement.dismissible ? (
        <button
          type="button"
          onClick={dismiss}
          className={cn(
            'absolute right-2 top-1/2 flex size-11 min-h-[44px] min-w-[44px] -translate-y-1/2 items-center justify-center rounded-(--radius-sm) text-brand-band-text/80 transition-colors hover:bg-white/10 hover:text-brand-band-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-brand-band',
          )}
          aria-label="Dismiss announcement"
        >
          <XIcon className="size-4" aria-hidden />
        </button>
      ) : null}
    </div>
  )
}
