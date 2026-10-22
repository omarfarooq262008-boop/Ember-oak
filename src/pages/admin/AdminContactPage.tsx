import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
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
import { isSupabaseConfigured, listContactMessages, markContactHandled } from '@/lib/admin/api'

export function AdminContactPage() {
  const qc = useQueryClient()
  const [page, setPage] = useState(1)
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin', 'contact', page],
    queryFn: () => listContactMessages({ page, pageSize: 50 }),
    enabled: isSupabaseConfigured,
  })
  const messages = data?.items ?? []

  const markHandled = async (id: string) => {
    try {
      await markContactHandled(id)
      toast.success('Marked as handled')
      await qc.invalidateQueries({ queryKey: ['admin', 'contact'] })
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
        <h1 className="font-display text-2xl font-bold">Messages</h1>
        <p className="text-sm text-muted">Contact form submissions.</p>
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
              <AdminTh>From</AdminTh>
              <AdminTh>Message</AdminTh>
              <AdminTh>Date</AdminTh>
              <AdminTh>Status</AdminTh>
              <AdminTh className="text-right">Actions</AdminTh>
            </tr>
          </AdminTableHead>
          <AdminTableBody>
            {messages.map((m) => (
              <tr key={m.id} className={m.is_handled ? 'opacity-60' : undefined}>
                <AdminTd>
                  <p className="font-medium">{m.name}</p>
                  <p className="text-xs text-muted">{m.email}</p>
                  {m.phone ? <p className="text-xs text-muted">{m.phone}</p> : null}
                </AdminTd>
                <AdminTd className="max-w-md whitespace-pre-wrap">{m.message}</AdminTd>
                <AdminTd className="text-muted">
                  {new Date(m.created_at).toLocaleString()}
                </AdminTd>
                <AdminTd>{m.is_handled ? 'Handled' : 'Open'}</AdminTd>
                <AdminTd className="text-right">
                  {!m.is_handled ? (
                    <Button type="button" size="sm" onClick={() => void markHandled(m.id)}>
                      Mark handled
                    </Button>
                  ) : null}
                </AdminTd>
              </tr>
            ))}
          </AdminTableBody>
        </AdminTable>
      )}

      {messages.length > 0 ? (
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
