import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { store } from '@/config/store'
import { cn } from '@/lib/utils'

interface FooterProps {
  onSubscribe?: (email: string) => Promise<void> | void
  className?: string
}

const footerLinks = [
  { label: 'Shipping', href: '/shipping' },
  { label: 'Returns', href: '/returns' },
  { label: 'FAQ', href: '/faq' },
  { label: 'Privacy', href: '/privacy' },
  { label: 'Terms', href: '/terms' },
] as const

function PaymentIcons() {
  return (
    <div className="flex flex-wrap items-center gap-3 text-xs font-medium text-muted">
      <span className="inline-flex items-center gap-1 rounded border border-border px-2 py-1">
        <svg width="20" height="14" viewBox="0 0 20 14" aria-hidden className="text-text">
          <rect x="0.5" y="0.5" width="19" height="13" rx="2" fill="none" stroke="currentColor" />
          <rect x="0" y="3" width="20" height="3" fill="currentColor" opacity="0.15" />
        </svg>
        Card
      </span>
      <span className="inline-flex items-center rounded border border-border px-2 py-1">COD</span>
      <span className="inline-flex items-center rounded border border-border px-2 py-1">
        Bank transfer
      </span>
    </div>
  )
}

export function Footer({ onSubscribe, className }: FooterProps) {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')

  const handleSubscribe = async (e: FormEvent) => {
    e.preventDefault()
    const trimmed = email.trim()
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setStatus('error')
      return
    }
    setStatus('loading')
    try {
      if (onSubscribe) {
        await onSubscribe(trimmed)
      } else {
        await new Promise((r) => setTimeout(r, 400))
        console.info('[newsletter]', trimmed)
      }
      setEmail('')
      setStatus('done')
    } catch {
      setStatus('error')
    }
  }

  const { support, social, payments } = store
  const address = support.address

  return (
    <footer className={cn('border-t border-border bg-background', className)}>
      <div className="section-pad container-eo grid gap-10 md:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="font-display text-lg font-bold">{store.name}</p>
          <p className="mt-2 text-sm text-muted">{store.tagline}</p>
          <address className="mt-4 space-y-1 text-sm not-italic text-muted">
            <p>{address.line1}</p>
            <p>{address.line2}</p>
            <p>
              {address.city}, {address.province} {address.postalCode}
            </p>
            <p>
              <a href={`mailto:${support.email}`} className="hover:text-accent">
                {support.email}
              </a>
            </p>
            <p>
              <a href={support.whatsappUrl} className="hover:text-accent">
                WhatsApp {support.whatsapp}
              </a>
            </p>
          </address>
        </div>

        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Help</h2>
          <ul className="mt-4 space-y-2">
            {footerLinks.map((link) => (
              <li key={link.href}>
                <Link to={link.href} className="text-sm hover:text-accent">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Follow</h2>
          <ul className="mt-4 space-y-2 text-sm">
            <li>
              <a href={social.instagram} className="hover:text-accent" target="_blank" rel="noreferrer">
                Instagram
              </a>
            </li>
            <li>
              <a href={social.facebook} className="hover:text-accent" target="_blank" rel="noreferrer">
                Facebook
              </a>
            </li>
            <li>
              <a href={social.pinterest} className="hover:text-accent" target="_blank" rel="noreferrer">
                Pinterest
              </a>
            </li>
          </ul>
          <div className="mt-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">We accept</p>
            <div className="mt-2">
              <PaymentIcons />
            </div>
            <p className="mt-2 text-xs text-muted">
              {payments.labels.cod}, {payments.labels.bank_transfer},{' '}
              {payments.labels.card}
            </p>
          </div>
        </div>

        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Newsletter</h2>
          <p className="mt-2 text-sm text-muted">
            New collections and restocks — no spam, unsubscribe anytime.
          </p>
          <form className="mt-4 flex flex-col gap-2 sm:flex-row" onSubmit={handleSubscribe}>
            <Input
              type="email"
              name="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                if (status === 'error') setStatus('idle')
              }}
              aria-label="Email for newsletter"
              autoComplete="email"
              error={status === 'error'}
            />
            <Button type="submit" disabled={status === 'loading'} className="shrink-0">
              {status === 'loading' ? '…' : 'Subscribe'}
            </Button>
          </form>
          {status === 'done' ? (
            <p className="mt-2 text-sm text-success" role="status">
              Thanks — you&apos;re on the list.
            </p>
          ) : null}
          {status === 'error' ? (
            <p className="mt-2 text-sm text-error" role="alert">
              Enter a valid email address.
            </p>
          ) : null}
        </div>
      </div>

      <div className="border-t border-border px-4 py-6 text-center text-xs text-muted md:px-8">
        <p>
          © {new Date().getFullYear()} {store.legal.companyName}. All rights reserved.
        </p>
      </div>
    </footer>
  )
}
