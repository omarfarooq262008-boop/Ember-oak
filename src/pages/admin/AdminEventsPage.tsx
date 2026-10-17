import { useQuery } from '@tanstack/react-query'

import {
  AdminTable,
  AdminTableBody,
  AdminTableHead,
  AdminTd,
  AdminTh,
} from '@/components/admin/AdminTable'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { isSupabaseConfigured, listAppEvents } from '@/lib/admin/api'

export function AdminEventsPage() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin', 'events'],
    queryFn: () => listAppEvents(150),
    enabled: isSupabaseConfigured,
  })

  if (!isSupabaseConfigured) {
    return <p className="text-sm text-muted">Supabase is not configured.</p>
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Events</h1>
        <p className="text-sm text-muted">Application event log (read-only).</p>
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
              <AdminTh>Time</AdminTh>
              <AdminTh>Type</AdminTh>
              <AdminTh>Payload</AdminTh>
            </tr>
          </AdminTableHead>
          <AdminTableBody>
            {(data ?? []).map((ev) => (
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
    </div>
  )
}
