import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'

import { Seo } from '@/components/seo/Seo'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { store } from '@/config/store'
import { submitContactRemote } from '@/lib/checkoutApi'
import { cn } from '@/lib/utils'

type FieldErrors = Partial<Record<'name' | 'email' | 'phone' | 'message', string>>

export function ContactPage() {
  const { support } = store
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [message, setMessage] = useState('')
  const [website, setWebsite] = useState('')
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
    } else if (trimmedMessage.length > 2000) {
      next.message = 'Message is too long (max 2000 characters).'
    }

    return next
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const nextErrors = validate()
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    setSubmitting(true)
    const result = await submitContactRemote({
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim() || undefined,
      message: message.trim(),
      website: website || undefined,
    })
    setSubmitting(false)

    if (!result.ok) {
      toast.error(result.message)
      return
    }

    toast.success('Message sent — we will reply within 1–2 working days.')
    setName('')
    setEmail('')
    setPhone('')
    setMessage('')
    setWebsite('')
    setErrors({})
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

        <form onSubmit={(e) => void handleSubmit(e)} className="mt-10 space-y-4" noValidate>
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
              aria-invalid={Boolean(errors.name)}
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
              aria-invalid={Boolean(errors.email)}
            />
            {errors.email ? (
              <p className="text-sm text-error" role="alert">
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
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
            {errors.phone ? (
              <p className="text-sm text-error" role="alert">
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
              maxLength={2000}
              value={message}
              onChange={(e) => {
                setMessage(e.target.value)
                if (errors.message) setErrors((prev) => ({ ...prev, message: undefined }))
              }}
              className={cn(
                'flex w-full rounded-(--radius-sm) border border-border bg-background px-3 py-2 text-sm',
                errors.message && 'border-error',
              )}
            />
            {errors.message ? (
              <p className="text-sm text-error" role="alert">
                {errors.message}
              </p>
            ) : null}
          </div>

          {/* Honeypot — hidden from users */}
          <div className="absolute -left-[9999px] opacity-0" aria-hidden>
            <Label htmlFor="contact-website">Website</Label>
            <Input
              id="contact-website"
              name="website"
              tabIndex={-1}
              autoComplete="off"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
            />
          </div>

          <Button type="submit" disabled={submitting}>
            {submitting ? 'Sending…' : 'Send message'}
          </Button>
        </form>
      </div>
    </>
  )
}
