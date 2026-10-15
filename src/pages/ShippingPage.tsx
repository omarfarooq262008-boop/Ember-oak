import { Link } from 'react-router-dom'

import { Seo } from '@/components/seo/Seo'
import { store } from '@/config/store'
import { formatPKR } from '@/lib/format'

export function ShippingPage() {
  const { delivery, support } = store

  return (
    <>
      <Seo
        title="Shipping"
        description={delivery.summary}
        url={`${store.seo.siteUrl}/shipping`}
      />

      <article className="section-pad container-eo mx-auto max-w-3xl">
        <h1 className="text-3xl">Shipping &amp; delivery</h1>
        <p className="mt-4 text-muted">{delivery.summary}</p>

        <div className="mt-10 space-y-8 text-sm leading-relaxed text-muted">
          <section>
            <h2 className="text-lg text-text">Nationwide coverage</h2>
            <p className="mt-2">
              {delivery.nationwide
                ? 'We deliver to every major city and town across Pakistan from our Karachi studio.'
                : 'Delivery areas are limited — contact us for availability.'}{' '}
              Orders placed before 2:00&nbsp;pm PKT on working days typically leave the
              studio the next working day.
            </p>
          </section>

          <section>
            <h2 className="text-lg text-text">Delivery times</h2>
            <p className="mt-2">
              Once dispatched, expect your parcel in{' '}
              <strong className="font-medium text-text">
                {delivery.workingDaysMin}–{delivery.workingDaysMax} working days
              </strong>
              . Remote areas may take an extra day or two. You will receive tracking details
              by email and SMS when your order ships (demo checkout — notifications are
              simulated).
            </p>
          </section>

          <section>
            <h2 className="text-lg text-text">Shipping fees</h2>
            <ul className="mt-2 list-disc space-y-2 pl-5">
              <li>
                Orders at or above {formatPKR(delivery.freeAbovePKR)}:{' '}
                <span className="font-medium text-text">free delivery</span>
              </li>
              <li>
                Orders below {formatPKR(delivery.freeAbovePKR)}: flat{' '}
                {formatPKR(delivery.flatFeePKR)} — no zone surcharges
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg text-text">Cash on delivery (COD)</h2>
            <p className="mt-2">
              {store.payments.labels.cod} is available nationwide. Please keep exact change
              where possible. If a COD parcel is refused twice, we may ask for prepaid
              shipping on future orders.
            </p>
          </section>

          <section>
            <h2 className="text-lg text-text">Fragile items</h2>
            <p className="mt-2">
              Candles, ceramics, and glass are packed with extra cushioning. If something
              arrives damaged, photograph the packaging and product within 48 hours and
              contact us — see our{' '}
              <Link to="/returns" className="text-text underline hover:text-accent">
                returns policy
              </Link>
              .
            </p>
          </section>
        </div>

        <p className="mt-10 text-sm text-muted">
          Questions? Email{' '}
          <a href={`mailto:${support.email}`} className="text-text hover:text-accent">
            {support.email}
          </a>{' '}
          or WhatsApp{' '}
          <a href={support.whatsappUrl} className="text-text hover:text-accent">
            {support.whatsapp}
          </a>
          .
        </p>
      </article>
    </>
  )
}
