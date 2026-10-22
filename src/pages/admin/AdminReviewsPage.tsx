import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'

import {
  AdminTable,
  AdminTableBody,
  AdminTableHead,
  AdminTd,
  AdminTh,
} from '@/components/admin/AdminTable'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { isSupabaseConfigured, listPendingReviews, moderateReview } from '@/lib/admin/api'

export function AdminReviewsPage() {
  const qc = useQueryClient()
  const [busyId, setBusyId] = useState<string | null>(null)
  const [page, setPage] = useState(1)

  useEffect(() => {
    document.title = 'Reviews | Admin'
  }, [])

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin', 'reviews', page],
    queryFn: () => listPendingReviews({ page, pageSize: 50 }),
    enabled: isSupabaseConfigured,
  })
  const reviews = data?.items ?? []

  const moderate = async (id: string, action: 'approve' | 'reject') => {
    setBusyId(id)
    try {
      await moderateReview(id, action)
      toast.success(action === 'approve' ? 'Review approved' : 'Review rejected')
      await qc.invalidateQueries({ queryKey: ['admin', 'reviews'] })
      await qc.invalidateQueries({ queryKey: ['admin', 'dashboard'] })
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Moderation failed')
    } finally {
      setBusyId(null)
    }
  }

  if (!isSupabaseConfigured) {
    return <p className="text-sm text-muted">Supabase is not configured.</p>
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Reviews</h1>
        <p className="text-sm text-muted">
          Pending reviews first — approve to publish, or reject to remove from the queue.
        </p>
      </div>

      {isError ? (
        <div className="rounded-(--radius-card) border border-border bg-surface p-4">
          <p className="text-sm text-muted">Could not load reviews.</p>
          <Button variant="secondary" className="mt-3" onClick={() => void refetch()}>
            Retry
          </Button>
        </div>
      ) : null}

      {isLoading ? (
        <Skeleton className="h-64 w-full rounded-(--radius-card)" />
      ) : reviews.length === 0 ? (
        <div className="rounded-(--radius-card) border border-dashed border-border bg-surface p-10 text-center">
          <p className="font-medium text-text">No pending reviews</p>
          <p className="mt-1 text-sm text-muted">
            New customer reviews will appear here for approval.
          </p>
        </div>
      ) : (
        <AdminTable>
          <AdminTableHead>
            <tr>
              <AdminTh>Product</AdminTh>
              <AdminTh>Rating</AdminTh>
              <AdminTh>Reviewer</AdminTh>
              <AdminTh>Review</AdminTh>
              <AdminTh className="text-right">Actions</AdminTh>
            </tr>
          </AdminTableHead>
          <AdminTableBody>
            {reviews.map((r) => (
              <tr key={r.id}>
                <AdminTd>
                  {r.products?.slug ? (
                    <Link
                      to={`/product/${r.products.slug}`}
                      className="font-medium hover:text-accent hover:underline"
                      target="_blank"
                      rel="noreferrer"
                    >
                      {r.products.name}
                    </Link>
                  ) : (
                    (r.products?.name ?? r.product_id.slice(0, 8))
                  )}
                </AdminTd>
                <AdminTd className="tabular-nums">{r.rating} / 5</AdminTd>
                <AdminTd>{r.customer_name}</AdminTd>
                <AdminTd className="max-w-sm">
                  {r.title ? <p className="font-medium">{r.title}</p> : null}
                  <p className="line-clamp-4 text-sm text-muted">{r.body}</p>
                  <p className="mt-1 text-xs text-muted">
                    {new Date(r.created_at).toLocaleString()}
                  </p>
                </AdminTd>
                <AdminTd className="text-right whitespace-nowrap">
                  <Button
                    type="button"
                    size="sm"
                    disabled={busyId === r.id}
                    onClick={() => void moderate(r.id, 'approve')}
                  >
                    Approve
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-error"
                    disabled={busyId === r.id}
                    onClick={() => void moderate(r.id, 'reject')}
                  >
                    Reject
                  </Button>
                </AdminTd>
              </tr>
            ))}
          </AdminTableBody>
        </AdminTable>
      )}

      {reviews.length > 0 ? (
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
