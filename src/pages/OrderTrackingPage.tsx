import { useEffect, useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'

import { Seo } from '@/components/seo/Seo'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { trackOrderRemote, type TrackedOrder } from '@/lib/checkoutApi'
import { formatPKR } from '@/lib/format'

const STATUS_LABELS: Record<string, string> = {
  pending_payment: 'Payment pending',
  awaiting_payment: 'Awaiting payment',
  awaiting_fulfilment: 'Preparing your order',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  refunded: 'Refunded',
}

export function OrderTrackingPage() {
  const [searchParams] = useSearchParams()
  const tokenParam = searchParams.get('token')?.trim() ?? ''
  const orderParam = searchParams.get('order')?.trim() ?? ''

  const [orderNumber, setOrderNumber] = useState(orderParam)
  const [email, setEmail] = useState('')
  const [order, setOrder] = useState<TrackedOrder | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!tokenParam) return
    let cancelled = false
    setLoading(true)
    setError(null)
    void trackOrderRemote({ token: tokenParam }).then((result) => {
      if (cancelled) return
      setLoading(false)
      if (!result.ok) {
        setOrder(null)
        setError(result.message)
        return
      }
      setOrder(result.order)
    })
    return () => {
      cancelled = true
    }
  }, [tokenParam])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setOrder(null)
    setLoading(true)

    const result = await trackOrderRemote({
      orderNumber,
      email,
    })
    setLoading(false)

    if (!result.ok) {
      setError(
        result.message === 'No order found.'
          ? 'No order found. Check your order number and email — they must match exactly.'
          : result.message,
      )
      return
    }

    setOrder(result.order)
  }

  const showForm = !tokenParam || (tokenParam && error && !order)

  return (
    <>
      <Seo title="Track order" description="Look up your Ember & Oak order status." />

      <div className="section-pad container-eo mx-auto max-w-lg">
        <h1 className="text-3xl">Track your order</h1>
        <p className="mt-2 text-sm text-muted">
          Enter the order number from your confirmation and the email used at checkout.
        </p>

        {showForm ? (
          <form onSubmit={(e) => void handleSubmit(e)} className="mt-8 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="order-number">Order number</Label>
              <Input
                id="order-number"
                name="orderNumber"
                autoComplete="off"
                placeholder="EO-…"
                value={orderNumber}
                onChange={(e) => setOrderNumber(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="track-email">Email</Label>
              <Input
                id="track-email"
                name="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            {error ? (
              <p className="text-sm text-error" role="alert">
                {error}
              </p>
            ) : null}
            <Button type="submit" disabled={loading} className="w-full sm:w-auto">
              {loading ? 'Looking up…' : 'Find order'}
            </Button>
          </form>
        ) : null}

        {loading && tokenParam && !order ? (
          <p className="mt-8 text-sm text-muted">Looking up your order…</p>
        ) : null}

        {order ? <OrderDetails order={order} /> : null}
      </div>
    </>
  )
}

function OrderDetails({ order }: { order: TrackedOrder }) {
  return (
    <div className="mt-10 space-y-6 rounded-(--radius-card) border border-border bg-surface p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm text-muted">Order</p>
          <p className="font-display text-xl font-bold tabular-nums">
            {order.order_number}
          </p>
        </div>
        <Badge variant="secondary">
          {STATUS_LABELS[order.status] ?? order.status}
        </Badge>
      </div>

      <p className="text-sm text-muted">
        Placed {new Date(order.created_at).toLocaleString('en-PK')} · Shipping to{' '}
        {order.shipping_name}, {order.shipping_city}, {order.shipping_province}
      </p>

      <ul className="divide-y divide-border text-sm">
        {(order.order_items ?? []).map((item, i) => (
          <li key={`${item.sku}-${i}`} className="flex justify-between gap-4 py-3">
            <div>
              <p className="font-medium">{item.product_name}</p>
              {item.variant_label ? (
                <p className="text-muted">{item.variant_label}</p>
              ) : null}
              <p className="text-muted">
                Qty {item.quantity} · {item.sku}
              </p>
            </div>
            <p className="tabular-nums">{formatPKR(Number(item.line_total))}</p>
          </li>
        ))}
      </ul>

      <dl className="space-y-1 text-sm">
        <div className="flex justify-between">
          <dt className="text-muted">Subtotal</dt>
          <dd className="tabular-nums">{formatPKR(Number(order.subtotal))}</dd>
        </div>
        {Number(order.discount) > 0 ? (
          <div className="flex justify-between">
            <dt className="text-muted">
              Discount{order.discount_code ? ` (${order.discount_code})` : ''}
            </dt>
            <dd className="tabular-nums">−{formatPKR(Number(order.discount))}</dd>
          </div>
        ) : null}
        <div className="flex justify-between">
          <dt className="text-muted">Delivery</dt>
          <dd className="tabular-nums">{formatPKR(Number(order.delivery_fee))}</dd>
        </div>
        <div className="flex justify-between font-medium">
          <dt>Total</dt>
          <dd className="tabular-nums">{formatPKR(Number(order.total))}</dd>
        </div>
      </dl>
    </div>
  )
}
