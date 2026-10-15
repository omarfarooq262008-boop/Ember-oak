import { CheckCircle2Icon } from 'lucide-react'
import { Link, useLocation, useParams } from 'react-router-dom'

import { Seo } from '@/components/seo/Seo'
import { Button } from '@/components/ui/button'
import { store } from '@/config/store'
import { formatPKR } from '@/lib/format'
import type { LocalOrder } from '@/lib/orders'
import type { PaymentMethod } from '@/types'

function nextSteps(method: PaymentMethod): string[] {
  switch (method) {
    case 'cod':
      return [
        'We are preparing your order for dispatch.',
        'Pay the courier in cash when your parcel arrives.',
        `Delivery in ${store.delivery.workingDaysMin}–${store.delivery.workingDaysMax} working days after dispatch.`,
      ]
    case 'bank_transfer':
      return [
        'Transfer the exact order total using the bank details from checkout.',
        store.payments.bankTransfer.instructions,
        'We will confirm payment and ship within about 1 working day.',
      ]
    case 'card':
      return [
        'Your card payment is being processed (demo mock provider).',
        'You will receive an email once payment is confirmed.',
        'We will dispatch as soon as payment clears.',
      ]
    default:
      return ['We will email you with updates.']
  }
}

export function OrderConfirmationPage() {
  const { orderNumber = '' } = useParams<{ orderNumber: string }>()
  const location = useLocation()
  const order = (location.state as { order?: LocalOrder } | null)?.order

  const displayNumber = order?.order_number ?? orderNumber
  const paymentMethod = order?.payment_method ?? 'cod'
  const total = order?.total
  const email = order?.email
  const steps = nextSteps(paymentMethod)

  return (
    <>
      <Seo title="Order confirmed" description="Thank you for your order." />

      <div className="section-pad container-eo mx-auto max-w-xl text-center">
        <CheckCircle2Icon className="mx-auto size-12 text-success" aria-hidden />
        <h1 className="mt-4 text-3xl">Thank you</h1>
        <p className="mt-2 text-muted">Your order has been placed.</p>

        <div className="mt-8 rounded-(--radius-card) border border-border bg-surface p-6 text-left">
          <p className="text-sm text-muted">Order number</p>
          <p className="font-display text-xl font-bold tabular-nums">{displayNumber}</p>
          {total != null ? (
            <p className="mt-2 text-sm">
              Total paid: <span className="font-medium tabular-nums">{formatPKR(total)}</span>
            </p>
          ) : null}
        </div>

        <div className="mt-8 text-left">
          <h2 className="text-lg">What happens next</h2>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-muted">
            {steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </div>

        <p className="mt-8 text-sm text-muted">
          A confirmation email will be sent to{' '}
          <span className="font-medium text-text">{email ?? 'the address you provided'}</span>{' '}
          once our demo checkout is connected to email delivery.
        </p>

        <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button asChild variant="secondary">
            <Link to={`/track-order?order=${encodeURIComponent(displayNumber)}`}>
              Track order
            </Link>
          </Button>
          <Button asChild>
            <Link to="/shop">Continue shopping</Link>
          </Button>
        </div>
      </div>
    </>
  )
}
