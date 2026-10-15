import { Link } from 'react-router-dom'

import { Seo } from '@/components/seo/Seo'
import { Button } from '@/components/ui/button'
import { store } from '@/config/store'

export function NotFoundPage() {
  return (
    <>
      <Seo title="Page not found" description="This page could not be found." />

      <div className="section-pad container-eo mx-auto flex max-w-lg flex-col items-center text-center">
        <p className="font-display text-6xl font-bold tabular-nums text-muted">404</p>
        <h1 className="mt-4 text-3xl">This page wandered off</h1>
        <p className="mt-3 text-sm text-muted">
          The link may be outdated, or the page may have moved. {store.name} is still here
          — explore the shop or head home.
        </p>
        <div className="mt-10 flex w-full flex-col gap-3 sm:flex-row sm:justify-center">
          <Button asChild>
            <Link to="/">Home</Link>
          </Button>
          <Button asChild variant="secondary">
            <Link to="/shop">Shop all</Link>
          </Button>
        </div>
      </div>
    </>
  )
}
