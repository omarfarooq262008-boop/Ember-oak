import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'

import {
  AdminTable,
  AdminTableBody,
  AdminTableHead,
  AdminTd,
  AdminTh,
} from '@/components/admin/AdminTable'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { dashboardStats, isSupabaseConfigured } from '@/lib/admin/api'
import { STATUS_LABELS } from '@/lib/admin/orderStatus'
import { formatPKR } from '@/lib/format'
import type { OrderStatus } from '@/types'

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-(--radius-card) border border-border bg-surface p-5">
      <p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-2 font-display text-2xl font-bold tabular-nums text-text">{value}</p>
    </div>
  )
}

export function AdminDashboardPage() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin', 'dashboard'],
    queryFn: dashboardStats,
    enabled: isSupabaseConfigured,
  })

  if (!isSupabaseConfigured) {
    return (
      <p className="text-sm text-muted">
        Connect Supabase to view the admin dashboard.
      </p>
    )
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold text-text">Dashboard</h1>
        <p className="mt-1 text-sm text-muted">Store overview at a glance.</p>
      </div>

      {isError ? (
        <div className="rounded-(--radius-card) border border-border bg-surface p-6">
          <p className="text-sm text-muted">Could not load dashboard stats.</p>
          <Button type="button" variant="secondary" className="mt-4" onClick={() => void refetch()}>
            Retry
          </Button>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-(--radius-card)" />
          ))
        ) : data ? (
          <>
            <StatCard label="Orders today" value={String(data.ordersToday)} />
            <StatCard label="Orders this month" value={String(data.ordersMonth)} />
            <StatCard label="Revenue (month)" value={formatPKR(data.revenueMonth)} />
            <StatCard label="Pending fulfilment" value={String(data.pendingFulfilment)} />
            <StatCard label="Low stock SKUs" value={String(data.lowStockCount)} />
            <StatCard label="Reviews to moderate" value={String(data.pendingReviews)} />
          </>
        ) : null}
      </div>

      <section>
        <div className="mb-4 flex items-center justify-between gap-2">
          <h2 className="font-display text-lg font-semibold">Recent orders</h2>
          <Button variant="secondary" size="sm" asChild>
            <Link to="/admin/orders">View all</Link>
          </Button>
        </div>
        {isLoading ? (
          <Skeleton className="h-48 w-full rounded-(--radius-card)" />
        ) : data?.recentOrders.length ? (
          <AdminTable>
            <AdminTableHead>
              <tr>
                <AdminTh>Order</AdminTh>
                <AdminTh>Customer</AdminTh>
                <AdminTh>Status</AdminTh>
                <AdminTh className="text-right">Total</AdminTh>
              </tr>
            </AdminTableHead>
            <AdminTableBody>
              {data.recentOrders.map((o) => (
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
                  <AdminTd>{STATUS_LABELS[o.status as OrderStatus]}</AdminTd>
                  <AdminTd className="text-right tabular-nums">{formatPKR(o.total)}</AdminTd>
                </tr>
              ))}
            </AdminTableBody>
          </AdminTable>
        ) : (
          <p className="text-sm text-muted">No orders yet.</p>
        )}
      </section>
    </div>
  )
}
