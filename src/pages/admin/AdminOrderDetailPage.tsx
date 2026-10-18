import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { toast } from 'sonner'

import { ConfirmDialog } from '@/components/admin/ConfirmDialog'
import {
  AdminTable,
  AdminTableBody,
  AdminTableHead,
  AdminTd,
  AdminTh,
} from '@/components/admin/AdminTable'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import {
  getOrder,
  isSupabaseConfigured,
  markBankPaid,
  markCodPaid,
  refundOrder,
  sendOrderEmail,
  transitionOrder,
} from '@/lib/admin/api'
import { allowedNextStatuses, STATUS_LABELS } from '@/lib/admin/orderStatus'
import { formatPKR } from '@/lib/format'
import type { OrderStatus } from '@/types'

export function AdminOrderDetailPage() {
  const { id } = useParams()
  const qc = useQueryClient()
  const [tracking, setTracking] = useState('')
  const [pendingStatus, setPendingStatus] = useState<OrderStatus | null>(null)
  const [confirmRefund, setConfirmRefund] = useState(false)
  const [busy, setBusy] = useState(false)

  const { data: order, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin', 'order', id],
    queryFn: () => getOrder(id!),
    enabled: isSupabaseConfigured && Boolean(id),
  })

  useEffect(() => {
    if (order?.tracking_number) {
      setTracking(order.tracking_number)
    }
  }, [order?.tracking_number])

  const nextStatuses = order
    ? allowedNextStatuses(order.status).filter((s) => s !== 'refunded')
    : []
  const payment = order?.payments[0]
  const canRefund =
    order &&
    order.status !== 'cancelled' &&
    order.status !== 'refunded' &&
    allowedNextStatuses(order.status).includes('refunded')

  const runTransition = async (status: OrderStatus) => {
    if (!id) return
    setBusy(true)
    try {
      await transitionOrder(
        id,
        status,
        status === 'shipped' ? tracking : undefined,
      )
      toast.success(`Status updated to ${STATUS_LABELS[status]}`)
      setPendingStatus(null)
      if (status === 'shipped') {
        void sendOrderEmail(id, 'order_shipped')
      } else if (status === 'cancelled') {
        void sendOrderEmail(id, 'order_cancelled')
      }
      await qc.invalidateQueries({ queryKey: ['admin', 'order', id] })
      await qc.invalidateQueries({ queryKey: ['admin', 'orders'] })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Transition failed')
    } finally {
      setBusy(false)
    }
  }

  const onMarkCodPaid = async () => {
    if (!id) return
    setBusy(true)
    try {
      await markCodPaid(id)
      toast.success('COD marked as paid')
      void sendOrderEmail(id, 'payment_received')
      await qc.invalidateQueries({ queryKey: ['admin', 'order', id] })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not mark paid')
    } finally {
      setBusy(false)
    }
  }

  const onMarkBankPaid = async () => {
    if (!id) return
    setBusy(true)
    try {
      await markBankPaid(id)
      toast.success('Bank transfer marked as paid')
      void sendOrderEmail(id, 'payment_received')
      await qc.invalidateQueries({ queryKey: ['admin', 'order', id] })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not mark paid')
    } finally {
      setBusy(false)
    }
  }

  const onRefund = async () => {
    if (!id) return
    setBusy(true)
    try {
      await refundOrder(id)
      toast.success('Refund recorded (stock restored only if you cancel)')
      setConfirmRefund(false)
      await qc.invalidateQueries({ queryKey: ['admin', 'order', id] })
      await qc.invalidateQueries({ queryKey: ['admin', 'orders'] })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Refund failed')
    } finally {
      setBusy(false)
    }
  }

  if (!isSupabaseConfigured) {
    return <p className="text-sm text-muted">Supabase is not configured.</p>
  }

  if (isLoading) {
    return <Skeleton className="h-96 w-full max-w-4xl rounded-(--radius-card)" />
  }

  if (isError || !order) {
    return (
      <div className="space-y-4">
        <p className="text-muted">Order not found.</p>
        <Button variant="secondary" onClick={() => void refetch()}>
          Retry
        </Button>
        <Button variant="ghost" asChild>
          <Link to="/admin/orders">← Orders</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8 pb-12">
      <div>
        <Button variant="ghost" size="sm" className="mb-2 px-0" asChild>
          <Link to="/admin/orders">← Orders</Link>
        </Button>
        <h1 className="font-display text-2xl font-bold">{order.order_number}</h1>
        <p className="text-sm text-muted">
          Placed {new Date(order.created_at).toLocaleString()} ·{' '}
          {STATUS_LABELS[order.status]}
        </p>
      </div>

      <section className="rounded-(--radius-card) border border-border bg-surface p-6 space-y-4">
        <h2 className="font-display text-lg font-semibold">Status</h2>
        <p className="text-sm text-muted">
          Allowed next steps from current status.
        </p>
        {nextStatuses.includes('shipped') ? (
          <div className="space-y-1 max-w-md">
            <Label htmlFor="tracking">Tracking number (required to ship)</Label>
            <Input
              id="tracking"
              value={tracking}
              onChange={(e) => setTracking(e.target.value)}
              placeholder="Courier tracking ID"
            />
          </div>
        ) : null}
        <div className="flex flex-wrap gap-2">
          {nextStatuses.map((s) => (
            <Button
              key={s}
              type="button"
              variant={s === 'cancelled' ? 'ghost' : 'secondary'}
              className={s === 'cancelled' ? 'text-red-800' : undefined}
              disabled={busy}
              onClick={() =>
                s === 'cancelled' ? setPendingStatus('cancelled') : void runTransition(s)
              }
            >
              → {STATUS_LABELS[s]}
            </Button>
          ))}
          {canRefund ? (
            <Button
              type="button"
              variant="ghost"
              className="text-red-800"
              disabled={busy}
              onClick={() => setConfirmRefund(true)}
            >
              Refund
            </Button>
          ) : null}
        </div>
        {order.payment_method === 'cod' &&
        order.status !== 'cancelled' &&
        order.status !== 'refunded' ? (
          <Button type="button" disabled={busy} onClick={() => void onMarkCodPaid()}>
            Mark COD as paid
          </Button>
        ) : null}
        {order.payment_method === 'bank_transfer' &&
        order.status === 'awaiting_payment' ? (
          <Button type="button" disabled={busy} onClick={() => void onMarkBankPaid()}>
            Mark bank transfer as paid
          </Button>
        ) : null}
        {payment ? (
          <p className="text-xs text-muted">
            Payment: {payment.provider} · {payment.status} · {formatPKR(payment.amount)}
          </p>
        ) : null}
        {order.payment_reference ? (
          <p className="text-xs text-muted">
            Bank reference: <span className="font-mono">{order.payment_reference}</span>
          </p>
        ) : null}
      </section>

      <section className="rounded-(--radius-card) border border-border bg-surface p-6">
        <h2 className="mb-4 font-display text-lg font-semibold">Line items</h2>
        <AdminTable>
          <AdminTableHead>
            <tr>
              <AdminTh>Product</AdminTh>
              <AdminTh>SKU</AdminTh>
              <AdminTh>Qty</AdminTh>
              <AdminTh className="text-right">Total</AdminTh>
            </tr>
          </AdminTableHead>
          <AdminTableBody>
            {order.order_items.map((item) => (
              <tr key={item.id}>
                <AdminTd>
                  {item.product_name}
                  {item.variant_label ? (
                    <span className="block text-xs text-muted">{item.variant_label}</span>
                  ) : null}
                </AdminTd>
                <AdminTd className="font-mono text-xs">{item.sku}</AdminTd>
                <AdminTd>{item.quantity}</AdminTd>
                <AdminTd className="text-right">{formatPKR(item.line_total)}</AdminTd>
              </tr>
            ))}
          </AdminTableBody>
        </AdminTable>
        <dl className="mt-4 space-y-1 border-t border-border pt-4 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted">Subtotal</dt>
            <dd>{formatPKR(order.subtotal)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted">Discount</dt>
            <dd>{formatPKR(order.discount)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted">Delivery</dt>
            <dd>{formatPKR(order.delivery_fee)}</dd>
          </div>
          <div className="flex justify-between font-semibold">
            <dt>Total</dt>
            <dd>{formatPKR(order.total)}</dd>
          </div>
        </dl>
      </section>

      <section className="grid gap-6 sm:grid-cols-2">
        <div className="rounded-(--radius-card) border border-border bg-surface p-6">
          <h2 className="font-display text-lg font-semibold">Customer</h2>
          <p className="mt-2 text-sm">{order.shipping_name}</p>
          <p className="text-sm text-muted">{order.email}</p>
          <p className="text-sm text-muted">{order.phone}</p>
        </div>
        <div className="rounded-(--radius-card) border border-border bg-surface p-6">
          <h2 className="font-display text-lg font-semibold">Shipping</h2>
          <p className="mt-2 text-sm whitespace-pre-line">{order.shipping_address}</p>
          <p className="text-sm text-muted">
            {order.shipping_city}, {order.shipping_province}
            {order.shipping_postal ? ` ${order.shipping_postal}` : ''}
          </p>
          <p className="text-sm text-muted">{order.shipping_phone}</p>
          {order.tracking_number ? (
            <p className="mt-2 text-sm">
              Tracking: <span className="font-medium">{order.tracking_number}</span>
            </p>
          ) : null}
        </div>
      </section>

      <ConfirmDialog
        open={pendingStatus === 'cancelled'}
        onOpenChange={(o) => !o && setPendingStatus(null)}
        title="Cancel order?"
        description="Stock for line items will be restored. This cannot be undone from the admin panel."
        confirmLabel="Cancel order"
        destructive
        loading={busy}
        onConfirm={() => runTransition('cancelled')}
      />

      <ConfirmDialog
        open={confirmRefund}
        onOpenChange={(o) => !o && setConfirmRefund(false)}
        title="Refund this order?"
        description="Calls the payment provider, marks the payment refunded, and sets the order to refunded. Stock is restored only when an order is cancelled — not by refund alone."
        confirmLabel="Refund"
        destructive
        loading={busy}
        onConfirm={() => void onRefund()}
      />
    </div>
  )
}
