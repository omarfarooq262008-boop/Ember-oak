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
import { isSupabaseConfigured, listNewsletterSubscribers } from '@/lib/admin/api'

function toCsv(rows: { email: string; source: string | null; created_at: string }[]) {
  const header = 'email,source,subscribed_at'
  const lines = rows.map(
    (r) =>
      `"${r.email.replace(/"/g, '""')}","${(r.source ?? '').replace(/"/g, '""')}","${r.created_at}"`,
  )
  return [header, ...lines].join('\n')
}

export function AdminNewsletterPage() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin', 'newsletter'],
    queryFn: listNewsletterSubscribers,
    enabled: isSupabaseConfigured,
  })

  const exportCsv = () => {
    if (!data?.length) return
    const blob = new Blob([toCsv(data)], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `newsletter-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (!isSupabaseConfigured) {
    return <p className="text-sm text-muted">Supabase is not configured.</p>
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Newsletter</h1>
          <p className="text-sm text-muted">
            {data?.length ?? 0} subscriber{(data?.length ?? 0) === 1 ? '' : 's'}.
          </p>
        </div>
        <Button type="button" variant="secondary" disabled={!data?.length} onClick={exportCsv}>
          Export CSV
        </Button>
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
              <AdminTh>Email</AdminTh>
              <AdminTh>Source</AdminTh>
              <AdminTh>Subscribed</AdminTh>
            </tr>
          </AdminTableHead>
          <AdminTableBody>
            {(data ?? []).map((s) => (
              <tr key={s.id}>
                <AdminTd>{s.email}</AdminTd>
                <AdminTd className="text-muted">{s.source ?? '—'}</AdminTd>
                <AdminTd className="text-muted">
                  {new Date(s.created_at).toLocaleString()}
                </AdminTd>
              </tr>
            ))}
          </AdminTableBody>
        </AdminTable>
      )}
    </div>
  )
}
