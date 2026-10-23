import { Loader2Icon } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type FormEvent, type HTMLAttributes } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

import { DiscountCodeField } from '@/components/cart/DiscountCodeField'
import { FreeDeliveryBar } from '@/components/cart/FreeDeliveryBar'
import { Seo } from '@/components/seo/Seo'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { store } from '@/config/store'
import { useAuth } from '@/contexts/AuthContext'
import { useCart } from '@/contexts/CartContext'
import { createOrderRemote } from '@/lib/checkoutApi'
import {
  type FormErrors,
  type FormState,
  validateForm,
} from '@/lib/checkoutValidation'
import { formatPKR } from '@/lib/format'
import { getCitiesForProvince, pakistanProvinces } from '@/lib/pakistan'
import { setSentryOrderStage } from '@/lib/sentry/tags'

export function CheckoutPage() {
  const navigate = useNavigate()
  const { user, profile } = useAuth()
  const {
    items,
    subtotal,
    deliveryFee,
    discountAmount,
    discountCode,
    total,
    clear,
  } = useCart()

  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const idempotencyKey = useRef<string | null>(null)
  if (idempotencyKey.current == null) {
    idempotencyKey.current =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `idem_${performance.now().toString(36)}`
  }
  const [form, setForm] = useState<FormState>({
    email: '',
    phone: '',
    shippingName: '',
    shippingAddress: '',
    shippingProvince: '',
    shippingCity: '',
    shippingPostal: '',
    paymentMethod: 'cod',
    cardName: '',
    cardNumber: '',
    cardExpiry: '',
    cardCvc: '',
  })
  const [errors, setErrors] = useState<FormErrors>({})

  useEffect(() => {
    setSentryOrderStage('checkout_form')
  }, [])

  useEffect(() => {
    if (!user) return
    setForm((prev) => ({
      ...prev,
      email: prev.email || user.email || '',
      phone: prev.phone || profile?.phone || '',
      shippingName: prev.shippingName || profile?.full_name || '',
    }))
  }, [user, profile])

  const cities = useMemo(
    () => getCitiesForProvince(form.shippingProvince),
    [form.shippingProvince],
  )

  const afterDiscount = Math.max(0, subtotal - discountAmount)

  const updateField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => {
      const next = { ...prev, [key]: value }
      if (key === 'shippingProvince') {
        next.shippingCity = ''
      }
      return next
    })
    setErrors((prev) => ({ ...prev, [key]: undefined }))
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (items.length === 0) return

    const nextErrors = validateForm(form)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    setSubmitting(true)
    setSubmitError(null)
    setSentryOrderStage('placing_order')

    const result = await createOrderRemote({
      email: form.email.trim(),
      phone: form.phone.trim(),
      paymentMethod: form.paymentMethod,
      discountCode: discountCode,
      shipping: {
        name: form.shippingName.trim(),
        phone: form.phone.trim(),
        address: form.shippingAddress.trim(),
        city: form.shippingCity,
        province: form.shippingProvince,
        postal: form.shippingPostal.trim() || null,
      },
      items: items.map((item) => ({
        variantId: item.variantId,
        quantity: item.quantity,
      })),
      idempotencyKey: idempotencyKey.current!,
    })

    setSubmitting(false)

    if (!result.ok) {
      setSentryOrderStage('checkout_form')
      setSubmitError(result.message)
      toast.error(result.message)
      // New key only when not a transient double-submit of the same successful order
      if (!result.message.toLowerCase().includes('only') ) {
        /* keep same key for true retries of network blips on same cart */
      }
      return
    }

    clear()

    if (form.paymentMethod === 'card' && result.checkoutUrl) {
      setSentryOrderStage('redirecting_to_payment')
      window.location.assign(result.checkoutUrl)
      return
    }

    setSentryOrderStage('order_confirmation')
    navigate(`/order-confirmation/${result.orderNumber}`, {
      state: {
        orderNumber: result.orderNumber,
        status: result.status,
        total: result.total,
        trackingToken: result.trackingToken,
        email: form.email.trim(),
        paymentMethod: form.paymentMethod,
        paymentReference: result.paymentReference ?? null,
      },
      replace: true,
    })
  }

  if (items.length === 0) {
    return (
      <div className="section-pad container-eo max-w-lg">
        <Seo title="Checkout" />
        <h1 className="text-3xl">Checkout</h1>
        <p className="mt-2 text-muted">Your cart is empty.</p>
        <Button asChild className="mt-6">
          <Link to="/shop">Continue shopping</Link>
        </Button>
      </div>
    )
  }

  const { bankTransfer, cardNote, labels } = store.payments

  return (
    <>
      <Seo title="Checkout" description="Complete your order — guest checkout." />

      <div className="section-pad container-eo">
        <h1 className="text-3xl">Checkout</h1>
        <p className="mt-2 text-sm text-muted">
          {user
            ? 'Signed in — this order will appear in your account.'
            : 'Guest checkout — no account required.'}{' '}
          {!user ? (
            <Link to="/login" className="underline hover:text-accent">
              Log in
            </Link>
          ) : null}
        </p>
        {submitError ? (
          <p className="mt-4 rounded-(--radius-card) border border-error/40 bg-surface px-4 py-3 text-sm text-error" role="alert">
            {submitError}
          </p>
        ) : null}

        <form
          onSubmit={handleSubmit}
          className="mt-10 grid gap-12 lg:grid-cols-[1fr_22rem] lg:items-start"
          noValidate
        >
          <div className="space-y-10">
            <section aria-labelledby="contact-heading" className="space-y-4">
              <h2 id="contact-heading" className="text-xl">
                Contact
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  id="email"
                  label="Email"
                  type="email"
                  autoComplete="email"
                  value={form.email}
                  error={errors.email}
                  onChange={(v) => updateField('email', v)}
                />
                <Field
                  id="phone"
                  label="Phone"
                  type="tel"
                  autoComplete="tel"
                  value={form.phone}
                  error={errors.phone}
                  onChange={(v) => updateField('phone', v)}
                />
              </div>
            </section>

            <section aria-labelledby="address-heading" className="space-y-4">
              <h2 id="address-heading" className="text-xl">
                Delivery address
              </h2>
              <Field
                id="shipping-name"
                label="Full name"
                autoComplete="name"
                value={form.shippingName}
                error={errors.shippingName}
                onChange={(v) => updateField('shippingName', v)}
              />
              <Field
                id="shipping-address"
                label="Street address"
                autoComplete="street-address"
                value={form.shippingAddress}
                error={errors.shippingAddress}
                onChange={(v) => updateField('shippingAddress', v)}
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="province">Province</Label>
                  <Select
                    value={form.shippingProvince || undefined}
                    onValueChange={(v) => updateField('shippingProvince', v)}
                  >
                    <SelectTrigger
                      id="province"
                      aria-invalid={errors.shippingProvince ? true : undefined}
                    >
                      <SelectValue placeholder="Select province" />
                    </SelectTrigger>
                    <SelectContent>
                      {pakistanProvinces.map((p) => (
                        <SelectItem key={p.slug} value={p.name}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.shippingProvince ? (
                    <p className="text-sm text-error" role="alert">
                      {errors.shippingProvince}
                    </p>
                  ) : null}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Select
                    value={form.shippingCity || undefined}
                    onValueChange={(v) => updateField('shippingCity', v)}
                    disabled={!form.shippingProvince}
                  >
                    <SelectTrigger
                      id="city"
                      aria-invalid={errors.shippingCity ? true : undefined}
                    >
                      <SelectValue placeholder="Select city" />
                    </SelectTrigger>
                    <SelectContent>
                      {cities.map((city) => (
                        <SelectItem key={city} value={city}>
                          {city}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.shippingCity ? (
                    <p className="text-sm text-error" role="alert">
                      {errors.shippingCity}
                    </p>
                  ) : null}
                </div>
              </div>
              <Field
                id="postal"
                label="Postal code (optional)"
                autoComplete="postal-code"
                value={form.shippingPostal}
                onChange={(v) => updateField('shippingPostal', v)}
              />
            </section>

            <section aria-labelledby="delivery-method-heading" className="space-y-3">
              <h2 id="delivery-method-heading" className="text-xl">
                Delivery method
              </h2>
              <div className="rounded-(--radius-card) border border-border bg-background/50 p-4">
                <p className="font-medium">Standard delivery</p>
                <p className="text-sm text-muted">
                  {store.delivery.workingDaysMin}–{store.delivery.workingDaysMax} working days
                  nationwide ·{' '}
                  {deliveryFee === 0 ? 'Free' : formatPKR(deliveryFee)}
                </p>
              </div>
            </section>

            <section aria-labelledby="payment-heading" className="space-y-4">
              <h2 id="payment-heading" className="text-xl">
                Payment
              </h2>
              <fieldset className="space-y-3">
                <legend className="sr-only">Payment method</legend>
                {store.payments.methods.map((method) => (
                  <label
                    key={method}
                    className="flex cursor-pointer items-start gap-3 rounded-(--radius-card) border border-border p-4 transition-[border-color,background-color,box-shadow] duration-200 has-checked:border-accent has-checked:bg-accent/5 has-checked:shadow-sm"
                  >
                    <input
                      type="radio"
                      name="payment"
                      value={method}
                      checked={form.paymentMethod === method}
                      onChange={() => updateField('paymentMethod', method)}
                      className="mt-1 size-4 accent-accent"
                    />
                    <span>
                      <span className="font-medium">{labels[method]}</span>
                      {method === 'cod' ? (
                        <span className="mt-1 block text-sm text-muted">
                          Pay when your order arrives.
                        </span>
                      ) : null}
                    </span>
                  </label>
                ))}
              </fieldset>

              {form.paymentMethod === 'bank_transfer' ? (
                <div
                  key="bank_transfer"
                  className="tab-panel rounded-(--radius-card) border border-border bg-background/50 p-4 text-sm text-muted"
                >
                  <p className="font-medium text-text">{bankTransfer.bankName}</p>
                  <p>Account: {bankTransfer.accountTitle}</p>
                  <p className="tabular-nums">A/C {bankTransfer.accountNumber}</p>
                  <p className="tabular-nums">IBAN {bankTransfer.iban}</p>
                  <p className="mt-2">{bankTransfer.instructions}</p>
                </div>
              ) : null}

              {form.paymentMethod === 'card' ? (
                <div
                  key="card"
                  className="tab-panel space-y-4 rounded-(--radius-card) border border-border p-4"
                >
                  <p className="text-sm text-muted">{cardNote}</p>
                  <Field
                    id="card-name"
                    label="Name on card"
                    autoComplete="cc-name"
                    value={form.cardName}
                    error={errors.cardName}
                    onChange={(v) => updateField('cardName', v)}
                  />
                  <Field
                    id="card-number"
                    label="Card number"
                    autoComplete="cc-number"
                    inputMode="numeric"
                    value={form.cardNumber}
                    error={errors.cardNumber}
                    onChange={(v) => updateField('cardNumber', v)}
                  />
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field
                      id="card-expiry"
                      label="Expiry (MM/YY)"
                      autoComplete="cc-exp"
                      placeholder="MM/YY"
                      value={form.cardExpiry}
                      error={errors.cardExpiry}
                      onChange={(v) => updateField('cardExpiry', v)}
                    />
                    <Field
                      id="card-cvc"
                      label="CVC"
                      autoComplete="cc-csc"
                      inputMode="numeric"
                      value={form.cardCvc}
                      error={errors.cardCvc}
                      onChange={(v) => updateField('cardCvc', v)}
                    />
                  </div>
                </div>
              ) : null}
            </section>
          </div>

          <aside className="space-y-6 rounded-(--radius-card) border border-border bg-surface/80 p-6 lg:sticky lg:top-24">
            <h2 className="text-lg font-medium">Order summary</h2>
            <ul className="max-h-48 space-y-3 overflow-y-auto text-sm">
              {items.map((item) => (
                <li key={item.variantId} className="flex justify-between gap-2">
                  <span className="text-muted">
                    {item.productName} × {item.quantity}
                  </span>
                  <span className="shrink-0 tabular-nums">
                    {formatPKR(item.price * item.quantity)}
                  </span>
                </li>
              ))}
            </ul>

            <FreeDeliveryBar subtotalAfterDiscount={afterDiscount} />

            <DiscountCodeField idPrefix="checkout" />

            <dl className="space-y-2 border-t border-border pt-4 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted">Subtotal</dt>
                <dd className="tabular-nums">{formatPKR(subtotal)}</dd>
              </div>
              {discountAmount > 0 ? (
                <div className="flex justify-between text-success">
                  <dt>
                    Discount
                    {discountCode ? (
                      <span className="font-normal text-muted"> ({discountCode})</span>
                    ) : null}
                  </dt>
                  <dd className="tabular-nums">−{formatPKR(discountAmount)}</dd>
                </div>
              ) : null}
              <div className="flex justify-between">
                <dt className="text-muted">Delivery</dt>
                <dd className="tabular-nums">
                  {deliveryFee === 0 ? 'Free' : formatPKR(deliveryFee)}
                </dd>
              </div>
              <div className="flex justify-between border-t border-border pt-3 text-base font-medium">
                <dt>Total</dt>
                <dd className="tabular-nums">{formatPKR(total)}</dd>
              </div>
            </dl>

            <Button type="submit" size="lg" className="w-full" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2Icon className="size-4 animate-spin" aria-hidden />
                  Placing order…
                </>
              ) : (
                `Place order · ${formatPKR(total)}`
              )}
            </Button>
          </aside>
        </form>
      </div>
    </>
  )
}

function Field({
  id,
  label,
  type = 'text',
  autoComplete,
  inputMode,
  placeholder,
  value,
  error,
  onChange,
}: {
  id: string
  label: string
  type?: string
  autoComplete?: string
  inputMode?: HTMLAttributes<HTMLInputElement>['inputMode']
  placeholder?: string
  value: string
  error?: string
  onChange: (value: string) => void
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        name={id}
        type={type}
        autoComplete={autoComplete}
        inputMode={inputMode}
        placeholder={placeholder}
        value={value}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        onChange={(e) => onChange(e.target.value)}
      />
      {error ? (
        <p id={`${id}-error`} className="text-sm text-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}
