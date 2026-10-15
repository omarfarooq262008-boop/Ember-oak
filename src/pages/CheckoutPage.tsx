import { Loader2Icon } from 'lucide-react'
import { useMemo, useState, type FormEvent, type HTMLAttributes } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { FreeDeliveryBar } from '@/components/cart/FreeDeliveryBar'
import { Seo } from '@/components/seo/Seo'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { store } from '@/config/store'
import { useCart } from '@/contexts/CartContext'
import { formatPKR } from '@/lib/format'
import {
  generateOrderNumber,
  generateOrderToken,
  saveOrder,
  type LocalOrder,
} from '@/lib/orders'
import { getCitiesForProvince, pakistanProvinces } from '@/lib/pakistan'
import type { OrderStatus, PaymentMethod } from '@/types'

interface FormState {
  email: string
  phone: string
  shippingName: string
  shippingAddress: string
  shippingProvince: string
  shippingCity: string
  shippingPostal: string
  paymentMethod: PaymentMethod
  cardName: string
  cardNumber: string
  cardExpiry: string
  cardCvc: string
}

interface FormErrors {
  email?: string
  phone?: string
  shippingName?: string
  shippingAddress?: string
  shippingProvince?: string
  shippingCity?: string
  paymentMethod?: string
  cardName?: string
  cardNumber?: string
  cardExpiry?: string
  cardCvc?: string
}

function initialStatus(method: PaymentMethod): OrderStatus {
  switch (method) {
    case 'cod':
      return 'awaiting_fulfilment'
    case 'bank_transfer':
      return 'awaiting_payment'
    case 'card':
      return 'pending_payment'
    default:
      return 'awaiting_fulfilment'
  }
}

function validateForm(values: FormState): FormErrors {
  const errors: FormErrors = {}
  const email = values.email.trim()
  if (!email) errors.email = 'Email is required.'
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = 'Enter a valid email address.'
  }

  const phone = values.phone.trim()
  if (!phone) errors.phone = 'Phone number is required.'
  else if (phone.replace(/\D/g, '').length < 10) {
    errors.phone = 'Enter a valid phone number.'
  }

  if (!values.shippingName.trim()) errors.shippingName = 'Full name is required.'
  if (!values.shippingAddress.trim()) errors.shippingAddress = 'Address is required.'
  if (!values.shippingProvince) errors.shippingProvince = 'Select a province.'
  if (!values.shippingCity) errors.shippingCity = 'Select a city.'

  if (values.paymentMethod === 'card') {
    if (!values.cardName.trim()) errors.cardName = 'Name on card is required.'
    if (values.cardNumber.replace(/\s/g, '').length < 12) {
      errors.cardNumber = 'Enter a valid card number.'
    }
    if (!/^\d{2}\/\d{2}$/.test(values.cardExpiry.trim())) {
      errors.cardExpiry = 'Use MM/YY format.'
    }
    if (values.cardCvc.length < 3) errors.cardCvc = 'Enter a valid CVC.'
  }

  return errors
}

export function CheckoutPage() {
  const navigate = useNavigate()
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
    await new Promise((r) => setTimeout(r, 500))

    const order: LocalOrder = {
      id: crypto.randomUUID?.() ?? `ord_${Date.now()}`,
      order_number: generateOrderNumber(),
      token: generateOrderToken(),
      email: form.email.trim(),
      status: initialStatus(form.paymentMethod),
      payment_method: form.paymentMethod,
      subtotal,
      discount: discountAmount,
      delivery_fee: deliveryFee,
      total,
      discount_code: discountCode,
      shipping_name: form.shippingName.trim(),
      shipping_phone: form.phone.trim(),
      shipping_address: form.shippingAddress.trim(),
      shipping_city: form.shippingCity,
      shipping_province: form.shippingProvince,
      shipping_postal: form.shippingPostal.trim() || null,
      created_at: new Date().toISOString(),
      items: items.map((item) => ({
        product_id: item.productId,
        variant_id: item.variantId,
        product_name: item.productName,
        variant_label: item.variantLabel,
        sku: item.sku,
        unit_price: item.price,
        quantity: item.quantity,
        line_total: item.price * item.quantity,
      })),
    }

    saveOrder(order)
    clear()
    setSubmitting(false)
    navigate(`/order-confirmation/${order.order_number}`, {
      state: { order },
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
        <p className="mt-2 text-sm text-muted">Guest checkout — no account required.</p>

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
                  <select
                    id="province"
                    name="province"
                    autoComplete="address-level1"
                    className="flex h-11 w-full rounded-(--radius-sm) border border-border bg-surface px-3 text-sm"
                    value={form.shippingProvince}
                    aria-invalid={errors.shippingProvince ? true : undefined}
                    onChange={(e) => updateField('shippingProvince', e.target.value)}
                  >
                    <option value="">Select province</option>
                    {pakistanProvinces.map((p) => (
                      <option key={p.slug} value={p.name}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                  {errors.shippingProvince ? (
                    <p className="text-sm text-error" role="alert">
                      {errors.shippingProvince}
                    </p>
                  ) : null}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <select
                    id="city"
                    name="city"
                    autoComplete="address-level2"
                    className="flex h-11 w-full rounded-(--radius-sm) border border-border bg-surface px-3 text-sm disabled:opacity-50"
                    value={form.shippingCity}
                    disabled={!form.shippingProvince}
                    aria-invalid={errors.shippingCity ? true : undefined}
                    onChange={(e) => updateField('shippingCity', e.target.value)}
                  >
                    <option value="">Select city</option>
                    {cities.map((city) => (
                      <option key={city} value={city}>
                        {city}
                      </option>
                    ))}
                  </select>
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
                    className="flex cursor-pointer items-start gap-3 rounded-(--radius-card) border border-border p-4 has-checked:border-accent has-checked:bg-accent/5"
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
                <div className="rounded-(--radius-card) border border-border bg-background/50 p-4 text-sm text-muted">
                  <p className="font-medium text-text">{bankTransfer.bankName}</p>
                  <p>Account: {bankTransfer.accountTitle}</p>
                  <p className="tabular-nums">A/C {bankTransfer.accountNumber}</p>
                  <p className="tabular-nums">IBAN {bankTransfer.iban}</p>
                  <p className="mt-2">{bankTransfer.instructions}</p>
                </div>
              ) : null}

              {form.paymentMethod === 'card' ? (
                <div className="space-y-4 rounded-(--radius-card) border border-border p-4">
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

            <dl className="space-y-2 border-t border-border pt-4 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted">Subtotal</dt>
                <dd className="tabular-nums">{formatPKR(subtotal)}</dd>
              </div>
              {discountAmount > 0 ? (
                <div className="flex justify-between text-success">
                  <dt>Discount</dt>
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
