import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
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
import { getOrderActionStates, type OrderActionId } from '@/lib/admin/orderActions'
import { STATUS_LABELS } from '@/lib/admin/orderStatus'
import { formatPKR } from '@/lib/format'

export function AdminOrderDetailPage() {
  const { id } = useParams()
  const qc = useQueryClient()
  const [tracking, setTracking] = useState('')
  const [cancelReason, setCancelReason] = useState('')
  const [dialog, setDialog] = useState<'ship' | 'cancel' | 'refund' | null>(null)
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

  const payment = order?.payments[0]
  const actions = useMemo(
    () =>
      order
        ? getOrderActionStates({
            status: order.status,
            paymentMethod: order.payment_method,
            paymentStatus: payment?.status ?? null,
          })
        : [],
    [order, payment?.status],
  )

  const refresh = async () => {
    if (!id) return
    await qc.invalidateQueries({ queryKey: ['admin', 'order', id] })
    await qc.invalidateQueries({ queryKey: ['admin', 'orders'] })
  }

  const runAction = async (action: OrderActionId) => {
    if (!id || !order) return

    if (action === 'ship') {
      setDialog('ship')
      return
    }
    if (action === 'cancel') {
      setDialog('cancel')
      return
    }
    if (action === 'refund') {
      setDialog('refund')
      return
    }

    setBusy(true)
    try {
      if (action === 'mark_cod_paid') {
        await markCodPaid(id)
        toast.success('COD marked as paid')
        void sendOrderEmail(id, 'payment_received')
      } else if (action === 'mark_bank_paid') {
        await markBankPaid(id)
        toast.success('Bank transfer marked as paid')
        void sendOrderEmail(id, 'payment_received')
      } else if (action === 'mark_delivered') {
        await transitionOrder(id, 'delivered')
        toast.success('Order marked delivered')
      }
      await refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Action failed')
    } finally {
      setBusy(false)
    }
  }

  const confirmShip = async () => {
    if (!id) return
    const trackingNumber = tracking.trim()
    if (!trackingNumber) {
      toast.error('Tracking number is required to ship')
      return
    }
    setBusy(true)
    try {
      await transitionOrder(id, 'shipped', trackingNumber)
      toast.success('Order shipped')
      setDialog(null)
      void sendOrderEmail(id, 'order_shipped')
      await refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not ship order')
    } finally {
      setBusy(false)
    }
  }

  const confirmCancel = async () => {
    if (!id) return
    const reason = cancelReason.trim()
    if (!reason) {
      toast.error('A cancel reason is required')
      return
    }
    setBusy(true)
    try {
      await transitionOrder(id, 'cancelled', null, reason)
      toast.success('Order cancelled — stock restored')
      setDialog(null)
      setCancelReason('')
      void sendOrderEmail(id, 'order_cancelled')
      await refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not cancel order')
    } finally {
      setBusy(false)
    }
  }

  const confirmRefund = async () => {
    if (!id) return
    setBusy(true)
    try {
      await refundOrder(id)
      toast.success('Refund recorded')
      setDialog(null)
      await refresh()
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
          Placed {new Date(order.created_at).toLocaleString()}
        </p>
      </div>

      <section className="rounded-(--radius-card) border border-border bg-surface p-6 space-y-5">
        <div>
          <h2 className="font-display text-lg font-semibold">Actions</h2>
          <p className="mt-1 text-sm">
            Current status:{' '}
            <span className="font-semibold text-text">
              {STATUS_LABELS[order.status] ?? order.status}
            </span>
          </p>
          {payment ? (
            <p className="mt-1 text-xs text-muted">
              Payment: {payment.provider} · {payment.status} · {formatPKR(payment.amount)}
            </p>
          ) : null}
          {order.payment_reference ? (
            <p className="mt-1 text-xs text-muted">
              Bank reference: <span className="font-mono">{order.payment_reference}</span>
            </p>
          ) : null}
        </div>

        <ul className="space-y-3">
          {actions.map((action) => (
            <li
              key={action.id}
              className="flex flex-col gap-1 rounded-lg border border-border/70 px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-text">{action.label}</p>
                {!action.enabled && action.disabledReason ? (
                  <p className="mt-0.5 text-xs text-muted">{action.disabledReason}</p>
                ) : null}
              </div>
              <Button
                type="button"
                variant={
                  action.id === 'cancel' || action.id === 'refund' ? 'ghost' : 'secondary'
                }
                className={
                  action.id === 'cancel' || action.id === 'refund'
                    ? 'shrink-0 text-red-800'
                    : 'shrink-0'
                }
                disabled={!action.enabled || busy}
                onClick={() => void runAction(action.id)}
              >
                {action.label}
              </Button>
            </li>
          ))}
        </ul>
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
        open={dialog === 'ship'}
        onOpenChange={(o) => !o && setDialog(null)}
        title="Ship order?"
        description="Enter the courier tracking number. The customer will be emailed."
        confirmLabel="Ship"
        loading={busy}
        onConfirm={() => void confirmShip()}
      >
        <div className="space-y-1">
          <Label htmlFor="ship-tracking">Tracking number</Label>
          <Input
            id="ship-tracking"
            value={tracking}
            onChange={(e) => setTracking(e.target.value)}
            placeholder="Courier tracking ID"
          />
        </div>
      </ConfirmDialog>

      <ConfirmDialog
        open={dialog === 'cancel'}
        onOpenChange={(o) => !o && setDialog(null)}
        title="Cancel order?"
        description="Stock for line items will be restored. Provide a reason for the audit log."
        confirmLabel="Cancel order"
        destructive
        loading={busy}
        onConfirm={() => void confirmCancel()}
      >
        <div className="space-y-1">
          <Label htmlFor="cancel-reason">Reason</Label>
          <Input
            id="cancel-reason"
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            placeholder="e.g. Customer requested cancellation"
          />
        </div>
      </ConfirmDialog>

      <ConfirmDialog
        open={dialog === 'refund'}
        onOpenChange={(o) => !o && setDialog(null)}
        title="Refund this card order?"
        description="Calls the payment provider and marks the payment refunded. Stock is restored only when you cancel — not by refund alone."
        confirmLabel="Refund"
        destructive
        loading={busy}
        onConfirm={() => void confirmRefund()}
      />
    </div>
  )
}
