import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { store } from '@/config/store'
import { useInViewFade } from '@/hooks/useInViewFade'
import { subscribeNewsletterRemote } from '@/lib/checkoutApi'
import { cn } from '@/lib/utils'

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
}

export function Newsletter() {
  const [email, setEmail] = useState('')
  const [website, setWebsite] = useState('')
  const [formStartedAt, setFormStartedAt] = useState(() => Date.now())
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const { ref, inView } = useInViewFade<HTMLElement>()

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    const trimmed = email.trim()
    if (!trimmed) {
      setError('Enter your email address.')
      return
    }
    if (!isValidEmail(trimmed)) {
      setError('Enter a valid email address.')
      return
    }
    setSubmitting(true)
    const result = await subscribeNewsletterRemote({
      email: trimmed,
      website: website || undefined,
      source: 'home',
      formStartedAt,
    })
    setSubmitting(false)
    if (!result.ok) {
      setError(result.message)
      return
    }
    toast.success('You’re on the list — thank you.')
    setEmail('')
    setWebsite('')
    setFormStartedAt(Date.now())
  }

  return (
    <section
      ref={ref}
      className="section-pad bg-surface"
      aria-labelledby="newsletter-heading"
    >
      <div
        className={cn(
          'container-eo mx-auto max-w-xl rounded-(--radius-card) border border-border bg-background px-6 py-10 text-center md:px-10 md:py-12',
          inView && 'fade-in-up',
        )}
      >
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-accent">
          Newsletter
        </p>
        <h2 id="newsletter-heading" className="mt-2 text-2xl md:text-3xl">
          Stay in the loop
        </h2>
        <p className="mt-3 text-sm text-muted md:text-base">
          New collections, restocks, and quiet notes from {store.name} — no spam.
        </p>
        <form
          className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-start"
          onSubmit={(e) => void onSubmit(e)}
          noValidate
        >
          <div className="flex-1 text-left">
            <Label htmlFor="newsletter-email" className="sr-only">
              Email
            </Label>
            <Input
              id="newsletter-email"
              type="email"
              name="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                if (error) setError(null)
              }}
              aria-invalid={error != null}
              aria-describedby={error ? 'newsletter-error' : undefined}
            />
            {error ? (
              <p id="newsletter-error" className="mt-2 text-sm text-error" role="alert">
                {error}
              </p>
            ) : null}
          </div>
          <div className="absolute -left-[9999px] opacity-0" aria-hidden>
            <Input
              name="website"
              tabIndex={-1}
              autoComplete="off"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
            />
          </div>
          <Button type="submit" className="shrink-0 sm:min-w-[8.5rem]" disabled={submitting}>
            {submitting ? '…' : 'Subscribe'}
          </Button>
        </form>
      </div>
    </section>
  )
}
