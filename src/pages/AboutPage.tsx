import { Seo } from '@/components/seo/Seo'
import { store } from '@/config/store'

export function AboutPage() {
  const { support } = store

  return (
    <>
      <Seo
        title="About"
        description={`Learn about ${store.name} — ${store.description}`}
        url={`${store.seo.siteUrl}/about`}
      />

      <article className="section-pad container-eo mx-auto max-w-3xl">
        <h1 className="text-3xl">About {store.name}</h1>
        <p className="mt-4 text-lg text-muted">{store.tagline}</p>

        <div className="mt-10 space-y-6 text-sm leading-relaxed text-muted">
          <p>
            {store.name} is a Karachi-based studio for {store.whatWeSell}. We curate
            pieces that feel warm, tactile, and quietly luxurious — the kind of objects
            you notice in a well-edited room: a soy candle with a slow burn, a ceramic
            vase with an imperfect glaze, a throw that drapes just right.
          </p>
          <p>
            Our audience is {store.audience}. Every collection is photographed with{' '}
            {store.brand.traits.join(', ')}, so browsing feels closer to a lookbook than
            a catalogue.
          </p>
          <p>
            Orders ship from our Clifton studio nationwide. {store.delivery.summary}{' '}
            You can pay with {store.payments.labels.cod.toLowerCase()},{' '}
            {store.payments.labels.bank_transfer.toLowerCase()}, or{' '}
            {store.payments.labels.card.toLowerCase()} at checkout.
          </p>
        </div>

        <section className="mt-12">
          <h2 className="text-xl text-text">Why shop with us</h2>
          <ul className="mt-6 space-y-6">
            {store.whyUs.map((item) => (
              <li key={item.title}>
                <h3 className="font-medium text-text">{item.title}</h3>
                <p className="mt-1 text-sm text-muted">{item.detail}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-12 rounded-(--radius-card) border border-border bg-surface p-6">
          <h2 className="text-lg text-text">Visit &amp; contact</h2>
          <address className="mt-3 space-y-1 text-sm not-italic text-muted">
            <p>{support.address.line1}</p>
            <p>{support.address.line2}</p>
            <p>
              {support.address.city}, {support.address.province}{' '}
              {support.address.postalCode}
            </p>
            <p className="pt-2">
              <a href={`mailto:${support.email}`} className="text-text hover:text-accent">
                {support.email}
              </a>
            </p>
            <p>
              <a href={support.whatsappUrl} className="text-text hover:text-accent">
                WhatsApp {support.whatsapp}
              </a>
            </p>
            <p>Studio hours: {support.hours}</p>
          </address>
        </section>
      </article>
    </>
  )
}
