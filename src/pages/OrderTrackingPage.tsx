import { useEffect, useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'

import { Seo } from '@/components/seo/Seo'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatPKR } from '@/lib/format'
import {
  getOrderByNumberAndEmail,
  getOrderByToken,
  type LocalOrder,
} from '@/lib/orders'
import type { OrderStatus } from '@/types'

const STATUS_LABELS: Record<OrderStatus, string> = {
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
  const [order, setOrder] = useState<LocalOrder | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!tokenParam) return
    setLoading(true)
    setError(null)
    const found = getOrderByToken(tokenParam)
    setOrder(found ?? null)
    if (!found) {
      setError('We could not find an order for this link.')
    }
    setLoading(false)
  }, [tokenParam])

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setOrder(null)
    setLoading(true)

    const found = getOrderByNumberAndEmail(orderNumber, email)
    if (!found) {
      setError(
        'No order found. Check your order number and email — they must match exactly.',
      )
      setLoading(false)
      return
    }

    setOrder(found)
    setLoading(false)
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
          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="order-number">Order number</Label>
              <Input
                id="order-number"
                name="orderNumber"
                autoComplete="off"
                placeholder="EO-123456"
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

        {order ? <OrderDetails order={order} /> : null}
      </div>
    </>
  )
}

function OrderDetails({ order }: { order: LocalOrder }) {
  return (
    <section className="mt-10 space-y-6 rounded-(--radius-card) border border-border bg-surface p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted">Order</p>
          <p className="font-display text-xl font-bold tabular-nums">{order.order_number}</p>
          <p className="mt-1 text-sm text-muted">
            Placed {new Date(order.created_at).toLocaleDateString('en-PK', {
              dateStyle: 'medium',
            })}
          </p>
        </div>
        <Badge variant="accent">{STATUS_LABELS[order.status]}</Badge>
      </div>

      <dl className="grid gap-2 text-sm">
        <div className="flex justify-between">
          <dt className="text-muted">Total</dt>
          <dd className="font-medium tabular-nums">{formatPKR(order.total)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted">Payment</dt>
          <dd className="capitalize">{order.payment_method.replace('_', ' ')}</dd>
        </div>
      </dl>

      <div>
        <h2 className="text-sm font-medium">Items</h2>
        <ul className="mt-2 divide-y divide-border text-sm">
          {order.items.map((item, index) => (
            <li key={`${item.sku}-${index}`} className="flex justify-between gap-2 py-2">
              <span>
                {item.product_name}
                {item.variant_label ? (
                  <span className="block text-muted">{item.variant_label}</span>
                ) : null}
                <span className="text-muted"> × {item.quantity}</span>
              </span>
              <span className="shrink-0 tabular-nums">{formatPKR(item.line_total)}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="text-sm text-muted">
        <p className="font-medium text-text">Shipping to</p>
        <p>{order.shipping_name}</p>
        <p>{order.shipping_address}</p>
        <p>
          {order.shipping_city}, {order.shipping_province}
          {order.shipping_postal ? ` ${order.shipping_postal}` : ''}
        </p>
      </div>
    </section>
  )
}
