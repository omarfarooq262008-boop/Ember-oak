import {
  AlertCircleIcon,
  CheckCircle2Icon,
  Loader2Icon,
  MailIcon,
  MapPinIcon,
  MessageCircleIcon,
  PhoneIcon,
} from 'lucide-react'
import { useState, type FormEvent, type ReactNode } from 'react'

import { Seo } from '@/components/seo/Seo'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { store } from '@/config/store'
import { useStoreSettings } from '@/hooks/useStoreSettings'
import { submitContactRemote } from '@/lib/checkoutApi'
import { cn } from '@/lib/utils'

type FieldErrors = Partial<
  Record<'name' | 'email' | 'phone' | 'orderNumber' | 'message', string>
>

export function ContactPage() {
  const { support } = store
  const { contact } = useStoreSettings()
  const emailDisplay = contact.email || support.email
  const phoneDisplay = contact.phone || support.phone
  const whatsappDisplay = contact.whatsapp || support.whatsapp
  const whatsappUrl = `https://wa.me/${whatsappDisplay.replace(/\D/g, '')}`
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [orderNumber, setOrderNumber] = useState('')
  const [message, setMessage] = useState('')
  const [website, setWebsite] = useState('')
  const [formStartedAt, setFormStartedAt] = useState(() => Date.now())
  const [errors, setErrors] = useState<FieldErrors>({})
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [formSuccess, setFormSuccess] = useState<string | null>(null)

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
    setFormError(null)
    setFormSuccess(null)
    const nextErrors = validate()
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    setSubmitting(true)
    const result = await submitContactRemote({
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim() || undefined,
      orderNumber: orderNumber.trim() || undefined,
      message: message.trim(),
      website: website || undefined,
      formStartedAt,
    })
    setSubmitting(false)

    if (!result.ok) {
      setFormError(result.message)
      return
    }

    setFormSuccess('Message sent — we will reply within 1–2 working days.')
    setName('')
    setEmail('')
    setPhone('')
    setOrderNumber('')
    setMessage('')
    setWebsite('')
    setFormStartedAt(Date.now())
    setErrors({})
  }

  return (
    <>
      <Seo
        title="Contact"
        description={`Reach ${store.name} by email, phone, or WhatsApp. ${support.hours}.`}
        url={`${store.seo.siteUrl}/contact`}
      />

      <div className="section-pad container-eo">
        <div className="stagger-children mx-auto max-w-5xl">
          <header className="max-w-2xl">
            <h1 className="text-3xl md:text-4xl">Contact us</h1>
            <p className="mt-3 text-muted">
              Questions about an order, a product, or wholesale? Send a note — or
              reach us directly during {support.hours}.
            </p>
          </header>

          <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-14">
            <aside className="stagger-children space-y-3">
              <ContactLink
                href={`mailto:${emailDisplay}`}
                icon={<MailIcon className="size-4" aria-hidden />}
                label="Email"
                value={emailDisplay}
              />
              <ContactLink
                href={`tel:${phoneDisplay.replace(/\s/g, '')}`}
                icon={<PhoneIcon className="size-4" aria-hidden />}
                label="Phone"
                value={phoneDisplay}
              />
              <ContactLink
                href={whatsappUrl}
                icon={<MessageCircleIcon className="size-4" aria-hidden />}
                label="WhatsApp"
                value={whatsappDisplay}
              />
              <div className="hover-lift flex gap-3 rounded-(--radius-card) border border-border bg-surface p-4">
                <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-(--radius-sm) bg-background text-accent">
                  <MapPinIcon className="size-4" aria-hidden />
                </span>
                <div className="min-w-0 text-sm">
                  <p className="font-medium text-text">Studio</p>
                  <p className="mt-1 text-muted">
                    {support.address.line1}, {support.address.line2}
                    <br />
                    {support.address.city}, {support.address.province}{' '}
                    {support.address.postalCode}
                  </p>
                  <p className="mt-2 text-muted">{support.hours}</p>
                </div>
              </div>
            </aside>

            <form
              onSubmit={(e) => void handleSubmit(e)}
              className="relative space-y-1 rounded-(--radius-card) border border-border bg-surface p-5 sm:p-7"
              noValidate
            >
              <div className="stagger-children space-y-4">
                <FieldBlock
                  label="Name"
                  htmlFor="contact-name"
                  error={errors.name}
                >
                  <Input
                    id="contact-name"
                    name="name"
                    autoComplete="name"
                    className="field-input"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value)
                      if (errors.name)
                        setErrors((prev) => ({ ...prev, name: undefined }))
                    }}
                    aria-invalid={Boolean(errors.name)}
                    error={Boolean(errors.name)}
                  />
                </FieldBlock>

                <FieldBlock
                  label="Email"
                  htmlFor="contact-email"
                  error={errors.email}
                >
                  <Input
                    id="contact-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    className="field-input"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value)
                      if (errors.email)
                        setErrors((prev) => ({ ...prev, email: undefined }))
                    }}
                    aria-invalid={Boolean(errors.email)}
                    error={Boolean(errors.email)}
                  />
                </FieldBlock>

                <FieldBlock
                  label="Phone (optional)"
                  htmlFor="contact-phone"
                  error={errors.phone}
                >
                  <Input
                    id="contact-phone"
                    name="phone"
                    type="tel"
                    autoComplete="tel"
                    className="field-input"
                    value={phone}
                    onChange={(e) => {
                      setPhone(e.target.value)
                      if (errors.phone)
                        setErrors((prev) => ({ ...prev, phone: undefined }))
                    }}
                    aria-invalid={Boolean(errors.phone)}
                    error={Boolean(errors.phone)}
                  />
                </FieldBlock>

                <FieldBlock label="Order number (optional)" htmlFor="contact-order">
                  <Input
                    id="contact-order"
                    name="orderNumber"
                    autoComplete="off"
                    placeholder="EO-…"
                    className="field-input"
                    value={orderNumber}
                    onChange={(e) => setOrderNumber(e.target.value)}
                  />
                </FieldBlock>

                <FieldBlock
                  label="Message"
                  htmlFor="contact-message"
                  error={errors.message}
                >
                  <textarea
                    id="contact-message"
                    name="message"
                    rows={5}
                    maxLength={2000}
                    value={message}
                    onChange={(e) => {
                      setMessage(e.target.value)
                      if (errors.message)
                        setErrors((prev) => ({ ...prev, message: undefined }))
                    }}
                    aria-invalid={Boolean(errors.message)}
                    className={cn(
                      'field-input flex min-h-[140px] w-full resize-y rounded-(--radius-sm) border border-border bg-background px-4 py-3 text-sm text-text shadow-none placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50',
                      errors.message &&
                        'border-error focus-visible:ring-error',
                    )}
                  />
                </FieldBlock>

                {/* Honeypot */}
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

                <div
                  aria-live="polite"
                  aria-atomic="true"
                  className="min-h-[1.5rem]"
                >
                  {formError ? (
                    <p
                      key={formError}
                      className="tab-panel flex items-start gap-2 text-sm text-error"
                      role="alert"
                    >
                      <AlertCircleIcon
                        className="mt-0.5 size-4 shrink-0"
                        aria-hidden
                      />
                      <span>{formError}</span>
                    </p>
                  ) : null}
                  {formSuccess ? (
                    <p
                      key={formSuccess}
                      className="tab-panel flex items-start gap-2 text-sm text-success"
                      role="status"
                    >
                      <CheckCircle2Icon
                        className="mt-0.5 size-4 shrink-0"
                        aria-hidden
                      />
                      <span>{formSuccess}</span>
                    </p>
                  ) : null}
                </div>

                <Button
                  type="submit"
                  disabled={submitting}
                  className="transition-transform duration-200 active:scale-[0.98]"
                >
                  {submitting ? (
                    <>
                      <Loader2Icon
                        className="size-4 animate-spin"
                        aria-hidden
                      />
                      Sending…
                    </>
                  ) : (
                    'Send message'
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  )
}

function ContactLink({
  href,
  icon,
  label,
  value,
}: {
  href: string
  icon: ReactNode
  label: string
  value: string
}) {
  return (
    <a
      href={href}
      className="hover-lift group flex gap-3 rounded-(--radius-card) border border-border bg-surface p-4 transition-colors duration-200 hover:border-accent/35"
    >
      <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-(--radius-sm) bg-background text-accent transition-transform duration-200 group-hover:scale-105">
        {icon}
      </span>
      <span className="min-w-0 text-sm">
        <span className="block font-medium text-text">{label}</span>
        <span className="mt-0.5 block text-muted transition-colors duration-200 group-hover:text-accent">
          {value}
        </span>
      </span>
    </a>
  )
}

function FieldBlock({
  label,
  htmlFor,
  error,
  children,
}: {
  label: string
  htmlFor: string
  error?: string
  children: ReactNode
}) {
  return (
    <div className="field-block space-y-2">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {error ? (
        <p className="tab-panel text-sm text-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}
