import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
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
import { cn } from '@/lib/utils'

const EVENT_FILTERS = [
  { id: 'all', label: 'All', type: null },
  { id: 'order_created', label: 'Orders', type: 'order_created' },
  { id: 'payment_failed', label: 'Payment failed', type: 'payment_failed' },
  { id: 'email_send_failed', label: 'Email failed', type: 'email_send_failed' },
  { id: 'rate_limit_hit', label: 'Rate limits', type: 'rate_limit_hit' },
  { id: 'admin_action', label: 'Admin actions', type: 'admin_action' },
] as const

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
  const [filterId, setFilterId] = useState<(typeof EVENT_FILTERS)[number]['id']>(
    'all',
  )
  const activeFilter = useMemo(
    () => EVENT_FILTERS.find((f) => f.id === filterId) ?? EVENT_FILTERS[0],
    [filterId],
  )

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin', 'events', activeFilter.type],
    queryFn: () => listAppEvents(200, activeFilter.type),
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

      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Event filters">
        {EVENT_FILTERS.map((f) => (
          <Button
            key={f.id}
            type="button"
            size="sm"
            variant={filterId === f.id ? 'primary' : 'secondary'}
            aria-pressed={filterId === f.id}
            className={cn(filterId === f.id && 'pointer-events-none')}
            onClick={() => setFilterId(f.id)}
          >
            {f.label}
          </Button>
        ))}
      </div>

      {isError ? (
        <Button variant="secondary" onClick={() => void refetch()}>
          Retry load
        </Button>
      ) : null}

      {(filterId === 'all' || filterId === 'email_send_failed') && (
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
      )}

      <section className="space-y-3">
        <h2 className="font-display text-lg font-semibold">
          {activeFilter.label === 'All' ? 'Latest events' : activeFilter.label}
        </h2>
        {isLoading ? (
          <Skeleton className="h-64 w-full rounded-(--radius-card)" />
        ) : events.length === 0 ? (
          <p className="text-sm text-muted">No events for this filter.</p>
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
