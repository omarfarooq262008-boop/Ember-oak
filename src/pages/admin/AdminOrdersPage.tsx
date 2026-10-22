import { useQuery } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'

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
import { isSupabaseConfigured, listOrders, type OrderListFilters } from '@/lib/admin/api'
import { ORDER_STATUSES, STATUS_LABELS } from '@/lib/admin/orderStatus'
import { formatPKR } from '@/lib/format'
import type { OrderStatus, PaymentMethod } from '@/types'

export function AdminOrdersPage() {
  const [filters, setFilters] = useState<OrderListFilters>({})
  const [draft, setDraft] = useState<OrderListFilters>({})
  const [page, setPage] = useState(1)

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin', 'orders', filters, page],
    queryFn: () => listOrders(filters, { page, pageSize: 50 }),
    enabled: isSupabaseConfigured,
  })
  const orders = data?.items ?? []

  const apply = (e: FormEvent) => {
    e.preventDefault()
    setPage(1)
    setFilters({ ...draft })
  }

  if (!isSupabaseConfigured) {
    return <p className="text-sm text-muted">Supabase is not configured.</p>
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Orders</h1>
        <p className="text-sm text-muted">Search and filter customer orders.</p>
      </div>

      <form
        onSubmit={apply}
        className="grid gap-4 rounded-(--radius-card) border border-border bg-surface p-4 sm:grid-cols-2 lg:grid-cols-3"
      >
        <div className="space-y-1 sm:col-span-2 lg:col-span-3">
          <Label htmlFor="search">Search</Label>
          <Input
            id="search"
            placeholder="Order #, email, name…"
            value={draft.search ?? ''}
            onChange={(e) => setDraft((d) => ({ ...d, search: e.target.value }))}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="status">Status</Label>
          <select
            id="status"
            className="flex h-11 w-full rounded-(--radius-sm) border border-border bg-surface px-3 text-sm"
            value={draft.status ?? ''}
            onChange={(e) =>
              setDraft((d) => ({
                ...d,
                status: e.target.value as OrderStatus | '',
              }))
            }
          >
            <option value="">All</option>
            {ORDER_STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="payment">Payment</Label>
          <select
            id="payment"
            className="flex h-11 w-full rounded-(--radius-sm) border border-border bg-surface px-3 text-sm"
            value={draft.payment_method ?? ''}
            onChange={(e) =>
              setDraft((d) => ({
                ...d,
                payment_method: e.target.value as PaymentMethod | '',
              }))
            }
          >
            <option value="">All</option>
            <option value="cod">COD</option>
            <option value="bank_transfer">Bank transfer</option>
            <option value="card">Card</option>
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="from">From</Label>
          <Input
            id="from"
            type="date"
            value={draft.from?.slice(0, 10) ?? ''}
            onChange={(e) =>
              setDraft((d) => ({
                ...d,
                from: e.target.value ? `${e.target.value}T00:00:00.000Z` : undefined,
              }))
            }
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="to">To</Label>
          <Input
            id="to"
            type="date"
            value={draft.to?.slice(0, 10) ?? ''}
            onChange={(e) =>
              setDraft((d) => ({
                ...d,
                to: e.target.value ? `${e.target.value}T23:59:59.999Z` : undefined,
              }))
            }
          />
        </div>
        <div className="flex items-end">
          <Button type="submit">Apply filters</Button>
        </div>
      </form>

      {isError ? (
        <Button variant="secondary" onClick={() => void refetch()}>
          Retry
        </Button>
      ) : null}

      {isLoading ? (
        <Skeleton className="h-64 w-full rounded-(--radius-card)" />
      ) : (
        <AdminTable>
          <AdminTableHead>
            <tr>
              <AdminTh>Order</AdminTh>
              <AdminTh>Customer</AdminTh>
              <AdminTh>Status</AdminTh>
              <AdminTh>Payment</AdminTh>
              <AdminTh className="text-right">Total</AdminTh>
              <AdminTh>Date</AdminTh>
            </tr>
          </AdminTableHead>
          <AdminTableBody>
            {orders.map((o) => (
              <tr key={o.id}>
                <AdminTd>
                  <Link
                    to={`/admin/orders/${o.id}`}
                    className="font-medium text-accent hover:underline"
                  >
                    {o.order_number}
                  </Link>
                </AdminTd>
                <AdminTd>{o.shipping_name}</AdminTd>
                <AdminTd>{STATUS_LABELS[o.status]}</AdminTd>
                <AdminTd className="uppercase">{o.payment_method.replace('_', ' ')}</AdminTd>
                <AdminTd className="text-right tabular-nums">{formatPKR(o.total)}</AdminTd>
                <AdminTd className="text-muted">
                  {new Date(o.created_at).toLocaleDateString()}
                </AdminTd>
              </tr>
            ))}
          </AdminTableBody>
        </AdminTable>
      )}

      {orders.length > 0 ? (
        <div className="flex items-center justify-between gap-3">
          <Button
            type="button"
            variant="secondary"
            disabled={page <= 1 || isLoading}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Previous
          </Button>
          <p className="text-sm text-muted">Page {page}</p>
          <Button
            type="button"
            variant="secondary"
            disabled={!data?.hasMore || isLoading}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      ) : null}
    </div>
  )
}
