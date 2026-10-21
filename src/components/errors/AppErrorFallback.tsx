import { Link } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { store } from '@/config/store'

type AppErrorFallbackProps = {
  resetError?: () => void
}

/** Friendly crash page — matches storefront typography and colours. */
export function AppErrorFallback({ resetError }: AppErrorFallbackProps) {
  return (
    <div className="flex min-h-dvh flex-col bg-background text-text">
      <div className="section-pad container-eo mx-auto flex max-w-lg flex-1 flex-col items-center justify-center text-center">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-accent">
          {store.name}
        </p>
        <h1 className="mt-4 font-display text-3xl font-bold md:text-4xl">
          Something went wrong
        </h1>
        <p className="mt-3 text-sm text-muted md:text-base">
          We hit an unexpected problem loading this page. Your cart is safe —
          head home and try again.
        </p>
        <div className="mt-10 flex w-full flex-col gap-3 sm:flex-row sm:justify-center">
          <Button asChild>
            <Link to="/" onClick={() => resetError?.()}>
              Back to home
            </Link>
          </Button>
          {resetError ? (
            <Button type="button" variant="secondary" onClick={resetError}>
              Try again
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  )
}
