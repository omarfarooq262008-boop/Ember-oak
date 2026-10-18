import { CheckCircle2Icon } from 'lucide-react'
import { Link, useLocation, useParams, useSearchParams } from 'react-router-dom'

import { Seo } from '@/components/seo/Seo'
import { Button } from '@/components/ui/button'
import { store } from '@/config/store'
import { formatPKR } from '@/lib/format'
import type { PaymentMethod } from '@/types'

type ConfirmationState = {
  orderNumber?: string
  status?: string
  total?: number
  trackingToken?: string
  email?: string
  paymentMethod?: PaymentMethod
  paymentReference?: string | null
}

function nextSteps(method: PaymentMethod, paid: boolean): string[] {
  switch (method) {
    case 'cod':
      return [
        'We are preparing your order for dispatch.',
        'Pay the courier in cash when your parcel arrives.',
        `Delivery in ${store.delivery.workingDaysMin}–${store.delivery.workingDaysMax} working days after dispatch.`,
      ]
    case 'bank_transfer':
      return [
        'Transfer the exact order total using the bank details below.',
        store.payments.bankTransfer.instructions,
        'Include your unique payment reference so we can match your transfer.',
        'We will confirm payment and ship within about 1 working day.',
      ]
    case 'card':
      return paid
        ? [
            'Payment confirmed. We are preparing your order for dispatch.',
            `Delivery in ${store.delivery.workingDaysMin}–${store.delivery.workingDaysMax} working days after dispatch.`,
          ]
        : [
            'Your card payment is pending until the payment provider confirms it.',
            'The order is never marked paid from the browser alone.',
            'We will email you when payment clears.',
          ]
    default:
      return ['We will email you with updates.']
  }
}

export function OrderConfirmationPage() {
  const { orderNumber: paramNumber = '' } = useParams<{ orderNumber: string }>()
  const location = useLocation()
  const [search] = useSearchParams()
  const state = (location.state as ConfirmationState | null) ?? {}
  const paid = search.get('paid') === '1'

  const displayNumber = state.orderNumber ?? paramNumber
  const paymentMethod = state.paymentMethod ?? (paid ? 'card' : 'cod')
  const total = state.total
  const email = state.email
  const trackingToken = state.trackingToken
  const paymentReference = state.paymentReference
  const steps = nextSteps(paymentMethod, paid)
  const { bankTransfer } = store.payments

  const trackHref = trackingToken
    ? `/track-order?token=${encodeURIComponent(trackingToken)}`
    : `/track-order?order=${encodeURIComponent(displayNumber)}`

  return (
    <>
      <Seo title="Order confirmed" description="Thank you for your order." />

      <div className="section-pad container-eo mx-auto max-w-xl text-center">
        <CheckCircle2Icon className="mx-auto size-12 text-success" aria-hidden />
        <h1 className="mt-4 text-3xl">{paid ? 'Payment received' : 'Thank you'}</h1>
        <p className="mt-2 text-muted">
          {paid ? 'Your order is confirmed and paid.' : 'Your order has been placed.'}
        </p>

        <div className="mt-8 rounded-(--radius-card) border border-border bg-surface p-6 text-left">
          <p className="text-sm text-muted">Order number</p>
          <p className="font-display text-xl font-bold tabular-nums">{displayNumber}</p>
          {total != null ? (
            <p className="mt-2 text-sm">
              Total: <span className="font-medium tabular-nums">{formatPKR(total)}</span>
            </p>
          ) : null}
          {state.status === 'pending_payment' && !paid ? (
            <p className="mt-2 text-sm text-muted">Status: pending payment</p>
          ) : null}
        </div>

        {paymentMethod === 'bank_transfer' ? (
          <div className="mt-6 rounded-(--radius-card) border border-border bg-surface p-6 text-left text-sm">
            <h2 className="font-display text-lg font-semibold">Bank transfer details</h2>
            <p className="mt-3 font-medium text-text">{bankTransfer.bankName}</p>
            <p>Account: {bankTransfer.accountTitle}</p>
            <p className="tabular-nums">A/C {bankTransfer.accountNumber}</p>
            <p className="tabular-nums">IBAN {bankTransfer.iban}</p>
            {paymentReference ? (
              <p className="mt-4">
                Your unique reference:{' '}
                <span className="font-mono font-semibold text-text">{paymentReference}</span>
              </p>
            ) : (
              <p className="mt-4 text-muted">
                Use your order number as the transfer reference if no unique reference was shown.
              </p>
            )}
            <p className="mt-3 text-muted">{bankTransfer.instructions}</p>
          </div>
        ) : null}

        <div className="mt-8 text-left">
          <h2 className="text-lg">What happens next</h2>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-muted">
            {steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </div>

        <p className="mt-8 text-sm text-muted">
          Keep this order number. A confirmation email
          {email ? (
            <>
              {' '}
              will be sent to <span className="font-medium text-text">{email}</span>
            </>
          ) : null}{' '}
          when delivery is configured.
        </p>

        <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button asChild variant="secondary">
            <Link to={trackHref}>Track order</Link>
          </Button>
          <Button asChild>
            <Link to="/shop">Continue shopping</Link>
          </Button>
        </div>

        <p className="mt-10 text-sm text-muted">
          Need help with your order?{' '}
          <Link to="/contact" className="font-medium text-text underline hover:text-accent">
            Contact us
          </Link>
        </p>
      </div>
    </>
  )
}
