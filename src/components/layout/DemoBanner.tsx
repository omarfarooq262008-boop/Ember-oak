import { Link } from 'react-router-dom'

import { isDemoMode } from '@/lib/demoMode'

/** Slim portfolio banner — only when VITE_DEMO_MODE=true. */
export function DemoBanner() {
  if (!isDemoMode()) return null

  return (
    <div
      role="status"
      className="border-b border-border bg-background px-4 py-2 text-center text-xs text-muted md:text-sm"
    >
      <p>
        Demo store, no real payments or orders. Portfolio project by Pixtor.{' '}
        <Link to="/about-demo" className="underline hover:text-accent">
          How it works
        </Link>
      </p>
    </div>
  )
}
