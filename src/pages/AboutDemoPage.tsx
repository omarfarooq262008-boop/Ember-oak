import { Link } from 'react-router-dom'

import { Seo } from '@/components/seo/Seo'
import { store } from '@/config/store'
import { isDemoMode } from '@/lib/demoMode'
import { NotFoundPage } from '@/pages/NotFoundPage'

const STACK = [
  'React + Vite + TypeScript',
  'Supabase (Postgres, Auth, Storage, RLS)',
  'Supabase Edge Functions',
  'Vercel hosting',
  'Resend (transactional email)',
  'Sentry (optional error tracking)',
] as const

const FEATURES = [
  'Product catalog, collections, search, and wishlist',
  'Cart, discounts, and atomic checkout (COD, bank transfer, card)',
  'Mock card payments for demos (no real money)',
  'Order tracking and confirmation emails',
  'Admin panel (products, inventory, orders, reviews, messages)',
  'Rate limiting, honeypots, and CI',
] as const

export function AboutDemoPage() {
  if (!isDemoMode()) return <NotFoundPage />

  return (
    <>
      <Seo
        title="About this demo"
        description={`How the ${store.name} portfolio demo works — stack and features.`}
        url={`${store.seo.siteUrl}/about-demo`}
        noindex
      />

      <article className="section-pad container-eo mx-auto max-w-2xl">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-accent">
          Portfolio
        </p>
        <h1 className="mt-2 text-3xl">How this demo works</h1>
        <p className="mt-4 text-sm text-muted">
          {store.name} is a full-stack ecommerce demo by Pixtor — not a live store.
          Orders and card payments are simulated. Nothing here charges a real card.
        </p>

        <section className="mt-10">
          <h2 className="text-xl text-text">Stack</h2>
          <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-muted">
            {STACK.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>

        <section className="mt-10">
          <h2 className="text-xl text-text">What you can try</h2>
          <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-muted">
            {FEATURES.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>

        <p className="mt-10 text-sm text-muted">
          <Link to="/shop" className="underline hover:text-accent">
            Browse the shop
          </Link>
          {' · '}
          <Link to="/" className="underline hover:text-accent">
            Home
          </Link>
        </p>
      </article>
    </>
  )
}
