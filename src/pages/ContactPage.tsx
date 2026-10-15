import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'

import { Seo } from '@/components/seo/Seo'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { store } from '@/config/store'
import { cn } from '@/lib/utils'

const STORAGE_KEY = 'eo-contact-messages'

type ContactMessage = {
  id: string
  name: string
  email: string
  phone: string
  message: string
  createdAt: string
}

type FieldErrors = Partial<Record<'name' | 'email' | 'phone' | 'message', string>>

function loadMessages(): ContactMessage[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    return Array.isArray(parsed) ? (parsed as ContactMessage[]) : []
  } catch {
    return []
  }
}

function saveMessage(entry: ContactMessage) {
  const existing = loadMessages()
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...existing, entry]))
}

export function ContactPage() {
  const { support } = store
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [message, setMessage] = useState('')
  const [errors, setErrors] = useState<FieldErrors>({})
  const [submitting, setSubmitting] = useState(false)

  const validate = (): FieldErrors => {
    const next: FieldErrors = {}
    const trimmedName = name.trim()
    const trimmedEmail = email.trim()
    const trimmedPhone = phone.trim()
    const trimmedMessage = message.trim()

    if (!trimmedName) {
      next.name = 'Please enter your name.'
    } else if (trimmedName.length < 2) {
      next.name = 'Name should be at least 2 characters.'
    }

    if (!trimmedEmail) {
      next.email = 'Please enter your email.'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      next.email = 'Enter a valid email address.'
    }

    if (trimmedPhone && !/^[\d\s+\-()]{7,20}$/.test(trimmedPhone)) {
      next.phone = 'Enter a valid phone number.'
    }

    if (!trimmedMessage) {
      next.message = 'Please enter a message.'
    } else if (trimmedMessage.length < 10) {
      next.message = 'Message should be at least 10 characters.'
    }

    return next
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    const nextErrors = validate()
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    setSubmitting(true)
    try {
      saveMessage({
        id: crypto.randomUUID(),
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        message: message.trim(),
        createdAt: new Date().toISOString(),
      })
      toast.success('Message sent — we will reply within 1–2 working days.')
      setName('')
      setEmail('')
      setPhone('')
      setMessage('')
      setErrors({})
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <Seo
        title="Contact"
        description={`Reach ${store.name} by email, phone, or WhatsApp. ${support.hours}.`}
        url={`${store.seo.siteUrl}/contact`}
      />

      <div className="section-pad container-eo mx-auto max-w-xl">
        <h1 className="text-3xl">Contact us</h1>
        <p className="mt-2 text-sm text-muted">
          Questions about an order, a product, or wholesale? Send a note — or reach us
          directly during {support.hours}.
        </p>

        <div className="mt-8 space-y-2 text-sm text-muted">
          <p>
            <a href={`mailto:${support.email}`} className="font-medium text-text hover:text-accent">
              {support.email}
            </a>
          </p>
          <p>
            <a href={`tel:${support.phone.replace(/\s/g, '')}`} className="hover:text-accent">
              {support.phone}
            </a>
          </p>
          <p>
            <a href={support.whatsappUrl} className="hover:text-accent">
              WhatsApp {support.whatsapp}
            </a>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-10 space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="contact-name">Name</Label>
            <Input
              id="contact-name"
              name="name"
              autoComplete="name"
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                if (errors.name) setErrors((prev) => ({ ...prev, name: undefined }))
              }}
              error={Boolean(errors.name)}
              aria-describedby={errors.name ? 'contact-name-error' : undefined}
            />
            {errors.name ? (
              <p id="contact-name-error" className="text-sm text-error" role="alert">
                {errors.name}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="contact-email">Email</Label>
            <Input
              id="contact-email"
              name="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }))
              }}
              error={Boolean(errors.email)}
              aria-describedby={errors.email ? 'contact-email-error' : undefined}
            />
            {errors.email ? (
              <p id="contact-email-error" className="text-sm text-error" role="alert">
                {errors.email}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="contact-phone">Phone (optional)</Label>
            <Input
              id="contact-phone"
              name="phone"
              type="tel"
              autoComplete="tel"
              placeholder="+92 300 0000000"
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value)
                if (errors.phone) setErrors((prev) => ({ ...prev, phone: undefined }))
              }}
              error={Boolean(errors.phone)}
              aria-describedby={errors.phone ? 'contact-phone-error' : undefined}
            />
            {errors.phone ? (
              <p id="contact-phone-error" className="text-sm text-error" role="alert">
                {errors.phone}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="contact-message">Message</Label>
            <textarea
              id="contact-message"
              name="message"
              rows={5}
              value={message}
              onChange={(e) => {
                setMessage(e.target.value)
                if (errors.message) setErrors((prev) => ({ ...prev, message: undefined }))
              }}
              aria-invalid={errors.message ? true : undefined}
              aria-describedby={errors.message ? 'contact-message-error' : undefined}
              className={cn(
                'flex min-h-[120px] w-full rounded-(--radius-sm) border border-border bg-surface px-4 py-3 text-sm text-text transition-[border-color] duration-200 placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                errors.message && 'border-error focus-visible:ring-error',
              )}
            />
            {errors.message ? (
              <p id="contact-message-error" className="text-sm text-error" role="alert">
                {errors.message}
              </p>
            ) : null}
          </div>

          <Button type="submit" disabled={submitting} className="w-full sm:w-auto">
            {submitting ? 'Sending…' : 'Send message'}
          </Button>
        </form>
      </div>
    </>
  )
}
