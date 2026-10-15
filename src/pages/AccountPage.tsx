import { Link } from 'react-router-dom'

import { Seo } from '@/components/seo/Seo'
import { Button } from '@/components/ui/button'
import { store } from '@/config/store'

export function AccountPage() {
  return (
    <>
      <Seo
        title="Account"
        description={`Guest checkout at ${store.name} — track orders without signing in.`}
        url={`${store.seo.siteUrl}/account`}
      />

      <div className="section-pad container-eo mx-auto max-w-lg text-center">
        <h1 className="text-3xl">Your account</h1>
        <p className="mt-4 text-sm text-muted">
          Account coming soon — track orders without signing in. We use guest checkout today,
          so you can complete purchases with just an email and phone number.
        </p>

        <div className="mt-10 rounded-(--radius-card) border border-border bg-surface p-6 text-left text-sm text-muted">
          <p className="font-medium text-text">Already placed an order?</p>
          <p className="mt-2">
            Use your order number and checkout email on the track order page — no password
            required.
          </p>
          <Button asChild className="mt-6 w-full sm:w-auto">
            <Link to="/track-order">Track order</Link>
          </Button>
        </div>

        <p className="mt-8 text-sm text-muted">
          Need help?{' '}
          <Link to="/contact" className="text-text underline hover:text-accent">
            Contact us
          </Link>{' '}
          or continue{' '}
          <Link to="/shop" className="text-text underline hover:text-accent">
            shopping
          </Link>
          .
        </p>
      </div>
    </>
  )
}
