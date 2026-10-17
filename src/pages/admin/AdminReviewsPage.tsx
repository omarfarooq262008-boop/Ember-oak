import { useQuery, useQueryClient } from '@tanstack/react-query'
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
import { isSupabaseConfigured, listPendingReviews, setReviewApproved } from '@/lib/admin/api'

export function AdminReviewsPage() {
  const qc = useQueryClient()
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin', 'reviews'],
    queryFn: listPendingReviews,
    enabled: isSupabaseConfigured,
  })

  const moderate = async (id: string, approved: boolean) => {
    try {
      await setReviewApproved(id, approved)
      toast.success(approved ? 'Review approved' : 'Review rejected')
      await qc.invalidateQueries({ queryKey: ['admin', 'reviews'] })
      await qc.invalidateQueries({ queryKey: ['admin', 'dashboard'] })
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed')
    }
  }

  if (!isSupabaseConfigured) {
    return <p className="text-sm text-muted">Supabase is not configured.</p>
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Reviews</h1>
        <p className="text-sm text-muted">Approve or reject customer reviews.</p>
      </div>

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
              <AdminTh>Product</AdminTh>
              <AdminTh>Rating</AdminTh>
              <AdminTh>Review</AdminTh>
              <AdminTh>Status</AdminTh>
              <AdminTh className="text-right">Actions</AdminTh>
            </tr>
          </AdminTableHead>
          <AdminTableBody>
            {(data ?? []).map((r) => (
              <tr key={r.id}>
                <AdminTd>{r.products?.name ?? r.product_id.slice(0, 8)}</AdminTd>
                <AdminTd>{r.rating} / 5</AdminTd>
                <AdminTd className="max-w-xs">
                  {r.title ? <p className="font-medium">{r.title}</p> : null}
                  <p className="line-clamp-3 text-muted">{r.body}</p>
                  <p className="mt-1 text-xs text-muted">— {r.customer_name}</p>
                </AdminTd>
                <AdminTd>{r.is_approved ? 'Approved' : 'Pending'}</AdminTd>
                <AdminTd className="text-right whitespace-nowrap">
                  {!r.is_approved ? (
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => void moderate(r.id, true)}
                    >
                      Approve
                    </Button>
                  ) : null}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => void moderate(r.id, false)}
                  >
                    Reject
                  </Button>
                </AdminTd>
              </tr>
            ))}
          </AdminTableBody>
        </AdminTable>
      )}
    </div>
  )
}
