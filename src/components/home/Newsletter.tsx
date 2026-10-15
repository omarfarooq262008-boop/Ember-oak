import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { store } from '@/config/store'

const STORAGE_KEY = 'eo-newsletter-subscribers'

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
}

function saveSubscriber(email: string): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const list: string[] = raw ? (JSON.parse(raw) as string[]) : []
    const normalized = email.trim().toLowerCase()
    if (list.includes(normalized)) return false
    list.push(normalized)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
    return true
  } catch {
    return false
  }
}

export function Newsletter() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)

  const onSubmit = (e: FormEvent) => {
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
    const added = saveSubscriber(trimmed)
    if (added) {
      toast.success('You’re on the list — thank you.')
      setEmail('')
    } else {
      toast.message('This email is already subscribed.')
    }
  }

  return (
    <section
      className="section-pad bg-surface"
      aria-labelledby="newsletter-heading"
    >
      <div className="container-eo mx-auto max-w-xl text-center">
        <h2 id="newsletter-heading" className="text-2xl md:text-3xl">
          Stay in the loop
        </h2>
        <p className="mt-3 text-sm text-muted md:text-base">
          New collections, restocks, and quiet notes from {store.name} — no spam.
        </p>
        <form
          className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-start"
          onSubmit={onSubmit}
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
              <p id="newsletter-error" className="mt-2 text-sm text-error">
                {error}
              </p>
            ) : null}
          </div>
          <Button type="submit" className="shrink-0">
            Subscribe
          </Button>
        </form>
      </div>
    </section>
  )
}
