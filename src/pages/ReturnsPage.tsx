import { Link } from 'react-router-dom'

import { Seo } from '@/components/seo/Seo'
import { store } from '@/config/store'

export function ReturnsPage() {
  const { support } = store

  return (
    <>
      <Seo
        title="Returns"
        description={`Returns and exchanges policy for ${store.name} — fragrance, homeware, and ceramics.`}
        url={`${store.seo.siteUrl}/returns`}
      />

      <article className="section-pad container-eo mx-auto max-w-3xl">
        <h1 className="text-3xl">Returns &amp; exchanges</h1>
        <p className="mt-4 text-muted">
          We want you to love what arrives. If something is not right, we will make it
          right — fairly and quickly.
        </p>

        <div className="mt-10 space-y-8 text-sm leading-relaxed text-muted">
          <section>
            <h2 className="text-lg text-text">Change of mind</h2>
            <p className="mt-2">
              Unopened, unused items in original packaging may be returned within{' '}
              <strong className="font-medium text-text">7 days of delivery</strong> for a
              store credit or exchange. Opened candles, diffusers, and personal-care
              fragrance items cannot be resold and are final sale for hygiene reasons.
            </p>
          </section>

          <section>
            <h2 className="text-lg text-text">Damaged or wrong item</h2>
            <p className="mt-2">
              Received the wrong variant or a broken ceramic? Contact us within{' '}
              <strong className="font-medium text-text">48 hours</strong> with your order
              number and clear photos. We will arrange a replacement or full refund,
              including return shipping where needed.
            </p>
          </section>

          <section>
            <h2 className="text-lg text-text">COD orders</h2>
            <p className="mt-2">
              Refunds for cash-on-delivery purchases are issued via bank transfer to a
              Pakistani account in the customer&apos;s name. Processing typically takes 3–5
              working days after we receive and inspect the return.
            </p>
          </section>

          <section>
            <h2 className="text-lg text-text">How to start a return</h2>
            <ol className="mt-2 list-decimal space-y-2 pl-5">
              <li>
                Email{' '}
                <a href={`mailto:${support.email}`} className="text-text hover:text-accent">
                  {support.email}
                </a>{' '}
                or message us on WhatsApp with your order number.
              </li>
              <li>We will confirm eligibility and share return instructions for Karachi.</li>
              <li>Pack items securely — reuse our box if you still have it.</li>
            </ol>
          </section>

          <section>
            <h2 className="text-lg text-text">Non-returnable items</h2>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Opened or used fragrance products</li>
              <li>Final-sale or marked-down clearance items</li>
              <li>Gift cards and digital products</li>
            </ul>
          </section>
        </div>

        <p className="mt-10 text-sm text-muted">
          Delivery timelines are in our{' '}
          <Link to="/shipping" className="text-text underline hover:text-accent">
            shipping guide
          </Link>
          . For quick answers, see the{' '}
          <Link to="/faq" className="text-text underline hover:text-accent">
            FAQ
          </Link>
          .
        </p>
      </article>
    </>
  )
}
