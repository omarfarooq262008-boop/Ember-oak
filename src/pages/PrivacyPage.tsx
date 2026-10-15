import { Seo } from '@/components/seo/Seo'
import { store } from '@/config/store'

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

export function PrivacyPage() {
  const { support, legal } = store
  const lastUpdated = 'October 2025'

  return (
    <>
      <Seo
        title="Privacy policy"
        description={`How ${store.name} collects and uses personal data — draft for review.`}
        url={`${store.seo.siteUrl}/privacy`}
      />

      <article className="section-pad container-eo mx-auto max-w-3xl">
        <h1 className="text-3xl">Privacy policy</h1>
        <p className="mt-2 text-sm text-muted">Last updated: {lastUpdated}</p>

        <LegalDraftNotice />

        <div className="space-y-8 text-sm leading-relaxed text-muted">
          <section>
            <h2 className="text-lg text-text">Who we are</h2>
            <p className="mt-2">
              This policy describes how {legal.companyName} (&quot;{store.name}&quot;,
              &quot;we&quot;, &quot;us&quot;) handles personal information when you shop at{' '}
              {store.seo.siteUrl}, contact support, or subscribe to our newsletter.
            </p>
          </section>

          <section>
            <h2 className="text-lg text-text">Information we collect</h2>
            <ul className="mt-2 list-disc space-y-2 pl-5">
              <li>
                <strong className="font-medium text-text">Order &amp; checkout:</strong>{' '}
                name, email, phone, delivery address, order details, and payment method
                selection (card data is processed by our payment provider, not stored on
                this demo site).
              </li>
              <li>
                <strong className="font-medium text-text">Support:</strong> messages you
                send via email, WhatsApp, or our contact form.
              </li>
              <li>
                <strong className="font-medium text-text">Newsletter:</strong> email
                address if you opt in.
              </li>
              <li>
                <strong className="font-medium text-text">Technical:</strong> device and
                usage data via cookies and similar technologies (see below).
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg text-text">How we use information</h2>
            <ul className="mt-2 list-disc space-y-2 pl-5">
              <li>Fulfil orders, arrange delivery, and process payments</li>
              <li>Respond to enquiries and provide customer support</li>
              <li>Send transactional messages (order confirmations, shipping updates)</li>
              <li>Send marketing emails only where you have opted in</li>
              <li>Improve our website, products, and fraud prevention</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg text-text">Sharing</h2>
            <p className="mt-2">
              We share data with couriers, payment processors, and service providers who
              assist our operations, under contracts that require appropriate safeguards.
              We do not sell your personal information.
            </p>
          </section>

          <section>
            <h2 className="text-lg text-text">Retention &amp; security</h2>
            <p className="mt-2">
              We retain order records as required for accounting and legal purposes. We
              apply reasonable technical and organisational measures to protect data; no
              online transmission is completely secure.
            </p>
          </section>

          <section>
            <h2 className="text-lg text-text">Your choices</h2>
            <p className="mt-2">
              You may request access, correction, or deletion of personal data, or
              unsubscribe from marketing, by contacting{' '}
              <a href={`mailto:${support.email}`} className="text-text hover:text-accent">
                {support.email}
              </a>
              . You may also lodge a complaint with the relevant data protection authority
              in Pakistan.
            </p>
          </section>

          <section>
            <h2 className="text-lg text-text">Contact</h2>
            <p className="mt-2">
              {legal.companyName}
              <br />
              {support.address.line1}, {support.address.line2}
              <br />
              {support.address.city}, {support.address.country}
              <br />
              {support.email}
            </p>
          </section>
        </div>

        <p className="mt-10 text-xs text-muted">{store.legal.notice}</p>
      </article>
    </>
  )
}
