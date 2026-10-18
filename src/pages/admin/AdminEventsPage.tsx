import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
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
import {
  isSupabaseConfigured,
  listAppEvents,
  retryFailedEmail,
  type AppEventRow,
} from '@/lib/admin/api'

function isEmailFailure(ev: AppEventRow): boolean {
  return ev.event_type === 'email_send_failed' || ev.event_type === 'email_claim_failed'
}

function payloadError(ev: AppEventRow): string {
  const err = ev.payload?.error
  return typeof err === 'string' && err.trim() ? err : JSON.stringify(ev.payload)
}

function outboxIdFrom(ev: AppEventRow): string | null {
  const id = ev.payload?.outboxId
  return typeof id === 'string' && id.length > 0 ? id : null
}

export function AdminEventsPage() {
  const qc = useQueryClient()
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin', 'events'],
    queryFn: () => listAppEvents(200),
    enabled: isSupabaseConfigured,
  })

  const retry = useMutation({
    mutationFn: (outboxId: string) => retryFailedEmail(outboxId),
    onSuccess: () => {
      toast.success('Email retry queued')
      void qc.invalidateQueries({ queryKey: ['admin', 'events'] })
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Retry failed')
    },
  })

  if (!isSupabaseConfigured) {
    return <p className="text-sm text-muted">Supabase is not configured.</p>
  }

  const events = data ?? []
  const emailFailures = events.filter(isEmailFailure)

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold">Events</h1>
        <p className="text-sm text-muted">
          Application event log. Failed emails never block orders — retry them here.
        </p>
      </div>

      {isError ? (
        <Button variant="secondary" onClick={() => void refetch()}>
          Retry load
        </Button>
      ) : null}

      <section className="space-y-3">
        <h2 className="font-display text-lg font-semibold">Failed emails</h2>
        {isLoading ? (
          <Skeleton className="h-40 w-full rounded-(--radius-card)" />
        ) : emailFailures.length === 0 ? (
          <p className="text-sm text-muted">No failed email events in the recent log.</p>
        ) : (
          <AdminTable>
            <AdminTableHead>
              <tr>
                <AdminTh>Time</AdminTh>
                <AdminTh>Template</AdminTh>
                <AdminTh>Error</AdminTh>
                <AdminTh className="w-28">Retry</AdminTh>
              </tr>
            </AdminTableHead>
            <AdminTableBody>
              {emailFailures.map((ev) => {
                const outboxId = outboxIdFrom(ev)
                const template =
                  typeof ev.payload?.template === 'string'
                    ? ev.payload.template
                    : '—'
                return (
                  <tr key={ev.id}>
                    <AdminTd className="whitespace-nowrap text-muted">
                      {new Date(ev.created_at).toLocaleString()}
                    </AdminTd>
                    <AdminTd className="font-mono text-xs">{template}</AdminTd>
                    <AdminTd className="max-w-xl whitespace-pre-wrap break-words font-mono text-xs text-red-900">
                      {payloadError(ev)}
                    </AdminTd>
                    <AdminTd>
                      {outboxId ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          disabled={retry.isPending}
                          onClick={() => retry.mutate(outboxId)}
                        >
                          Retry
                        </Button>
                      ) : (
                        <span className="text-xs text-muted">No outbox id</span>
                      )}
                    </AdminTd>
                  </tr>
                )
              })}
            </AdminTableBody>
          </AdminTable>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-lg font-semibold">All events</h2>
        {isLoading ? (
          <Skeleton className="h-64 w-full rounded-(--radius-card)" />
        ) : (
          <AdminTable>
            <AdminTableHead>
              <tr>
                <AdminTh>Time</AdminTh>
                <AdminTh>Type</AdminTh>
                <AdminTh>Payload</AdminTh>
              </tr>
            </AdminTableHead>
            <AdminTableBody>
              {events.map((ev) => (
                <tr key={ev.id}>
                  <AdminTd className="whitespace-nowrap text-muted">
                    {new Date(ev.created_at).toLocaleString()}
                  </AdminTd>
                  <AdminTd className="font-mono text-xs">{ev.event_type}</AdminTd>
                  <AdminTd className="max-w-lg truncate font-mono text-xs text-muted">
                    {JSON.stringify(ev.payload)}
                  </AdminTd>
                </tr>
              ))}
            </AdminTableBody>
          </AdminTable>
        )}
      </section>
    </div>
  )
}
