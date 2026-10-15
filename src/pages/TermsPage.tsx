import { Seo } from '@/components/seo/Seo'
import { store } from '@/config/store'
import { formatPKR } from '@/lib/format'

function LegalDraftNotice() {
  if (!store.legal.needsLegalReview) return null
  return (
    <p
      className="mb-8 rounded-(--radius-card) border border-border bg-surface p-4 text-sm text-muted"
      role="note"
    >
      {store.legal.notice}
    </p>
  )
}

export function TermsPage() {
  const { legal, delivery, payments, support } = store
  const lastUpdated = 'October 2025'

  return (
    <>
      <Seo
        title="Terms of service"
        description={`Terms and conditions for shopping at ${store.name} — draft for review.`}
        url={`${store.seo.siteUrl}/terms`}
      />

      <article className="section-pad container-eo mx-auto max-w-3xl">
        <h1 className="text-3xl">Terms of service</h1>
        <p className="mt-2 text-sm text-muted">Last updated: {lastUpdated}</p>

        <LegalDraftNotice />

        <div className="space-y-8 text-sm leading-relaxed text-muted">
          <section>
            <h2 className="text-lg text-text">Agreement</h2>
            <p className="mt-2">
              By using {store.seo.siteUrl} or placing an order with {store.name}, you agree
              to these terms. If you do not agree, please do not use the site. These terms
              are offered by {legal.companyName}.
            </p>
          </section>

          <section>
            <h2 className="text-lg text-text">Products &amp; pricing</h2>
            <p className="mt-2">
              We sell {store.whatWeSell}. Prices are shown in {store.currency.code} and
              include applicable taxes unless stated otherwise. We may correct pricing
              errors and cancel affected orders with a full refund.
            </p>
          </section>

          <section>
            <h2 className="text-lg text-text">Orders &amp; payment</h2>
            <p className="mt-2">
              An order is confirmed when you receive an order number. Accepted methods:{' '}
              {payments.labels.cod}, {payments.labels.bank_transfer},{' '}
              {payments.labels.card}. {payments.cardNote} Bank transfer customers must
              follow the instructions provided at checkout.
            </p>
          </section>

          <section>
            <h2 className="text-lg text-text">Shipping</h2>
            <p className="mt-2">
              {delivery.summary} Free delivery applies to orders at or above{' '}
              {formatPKR(delivery.freeAbovePKR)}; otherwise {formatPKR(delivery.flatFeePKR)}{' '}
              applies. Risk of loss passes to you upon delivery to the address provided.
            </p>
          </section>

          <section>
            <h2 className="text-lg text-text">Returns</h2>
            <p className="mt-2">
              Returns and exchanges are governed by our returns policy on this site.
              Opened fragrance items are generally final sale; damaged goods must be
              reported promptly with photos.
            </p>
          </section>

          <section>
            <h2 className="text-lg text-text">Limitation of liability</h2>
            <p className="mt-2">
              To the fullest extent permitted by law, we are not liable for indirect or
              consequential losses. Our total liability for any order is limited to the
              amount you paid for that order.
            </p>
          </section>

          <section>
            <h2 className="text-lg text-text">Governing law</h2>
            <p className="mt-2">
              These terms are governed by the laws of Pakistan. Disputes shall be subject
              to the exclusive jurisdiction of the courts of Karachi, Sindh, unless
              mandatory consumer protections require otherwise.
            </p>
          </section>

          <section>
            <h2 className="text-lg text-text">Contact</h2>
            <p className="mt-2">
              Questions about these terms:{' '}
              <a href={`mailto:${support.email}`} className="text-text hover:text-accent">
                {support.email}
              </a>
              .
            </p>
          </section>
        </div>

        <p className="mt-10 text-xs text-muted">{store.legal.notice}</p>
      </article>
    </>
  )
}
