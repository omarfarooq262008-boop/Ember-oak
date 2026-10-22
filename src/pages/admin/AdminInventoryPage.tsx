import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronDownIcon, ChevronUpIcon } from 'lucide-react'
import { Fragment, useState } from 'react'
import { toast } from 'sonner'

import {
  AdminTable,
  AdminTableBody,
  AdminTableHead,
  AdminTd,
  AdminTh,
} from '@/components/admin/AdminTable'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  adjustStock,
  getInventorySettings,
  isSupabaseConfigured,
  listInventory,
  listStockHistory,
} from '@/lib/admin/api'

function HistoryBlock({ variantId }: { variantId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'stock-history', variantId],
    queryFn: () => listStockHistory(variantId),
    enabled: isSupabaseConfigured,
  })

  if (isLoading) return <p className="p-4 text-xs text-muted">Loading history…</p>
  if (!data?.length) return <p className="p-4 text-xs text-muted">No stock changes yet.</p>

  return (
    <ul className="space-y-2 p-4 text-xs">
      {data.map((h) => (
        <li key={h.id} className="flex flex-wrap gap-x-3 gap-y-1 text-muted">
          <span>{new Date(h.created_at).toLocaleString()}</span>
          <span>
            {h.stock_before} → {h.stock_after}
          </span>
          <span className="text-text">{h.reason}</span>
        </li>
      ))}
    </ul>
  )
}

export function AdminInventoryPage() {
  const qc = useQueryClient()
  const [expanded, setExpanded] = useState<string | null>(null)
  const [edits, setEdits] = useState<Record<string, { stock: string; reason: string }>>({})
  const [savingId, setSavingId] = useState<string | null>(null)
  const [page, setPage] = useState(1)

  const thresholdQuery = useQuery({
    queryKey: ['admin', 'inventory-settings'],
    queryFn: getInventorySettings,
    enabled: isSupabaseConfigured,
  })

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin', 'inventory', page],
    queryFn: () => listInventory({ page, pageSize: 100 }),
    enabled: isSupabaseConfigured,
  })
  const rows = data?.items ?? []

  const threshold = thresholdQuery.data?.lowStockThreshold ?? 5

  const saveRow = async (variantId: string, current: number) => {
    const edit = edits[variantId] ?? { stock: String(current), reason: '' }
    const next = Number(edit.stock)
    if (Number.isNaN(next) || next < 0) {
      toast.error('Enter a valid stock amount.')
      return
    }
    setSavingId(variantId)
    try {
      await adjustStock(variantId, next, edit.reason.trim() || 'Inventory page adjustment')
      toast.success('Stock updated')
      await qc.invalidateQueries({ queryKey: ['admin', 'inventory'] })
      await qc.invalidateQueries({ queryKey: ['admin', 'stock-history', variantId] })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Update failed')
    } finally {
      setSavingId(null)
    }
  }

  if (!isSupabaseConfigured) {
    return <p className="text-sm text-muted">Supabase is not configured.</p>
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Inventory</h1>
        <p className="text-sm text-muted">
          Low-stock alert at {threshold} units or fewer (change in Settings).
        </p>
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
              <AdminTh>SKU</AdminTh>
              <AdminTh>Stock</AdminTh>
              <AdminTh>New stock</AdminTh>
              <AdminTh>Reason</AdminTh>
              <AdminTh className="text-right">Actions</AdminTh>
            </tr>
          </AdminTableHead>
          <AdminTableBody>
            {rows.map((row) => {
              const low = row.stock <= threshold
              const edit = edits[row.variant_id] ?? {
                stock: String(row.stock),
                reason: '',
              }
              const isOpen = expanded === row.variant_id
              return (
                <Fragment key={row.variant_id}>
                  <tr className={low ? 'bg-amber-50/80' : undefined}>
                    <AdminTd>{row.product_name}</AdminTd>
                    <AdminTd className="font-mono text-xs">{row.sku}</AdminTd>
                    <AdminTd>
                      <span className={low ? 'font-semibold text-amber-900' : ''}>
                        {row.stock}
                      </span>
                    </AdminTd>
                    <AdminTd>
                      <Input
                        type="number"
                        min={0}
                        className="max-w-[6rem]"
                        value={edit.stock}
                        onChange={(e) =>
                          setEdits((prev) => ({
                            ...prev,
                            [row.variant_id]: { ...edit, stock: e.target.value },
                          }))
                        }
                      />
                    </AdminTd>
                    <AdminTd>
                      <Input
                        className="min-w-[8rem]"
                        placeholder="Reason"
                        value={edit.reason}
                        onChange={(e) =>
                          setEdits((prev) => ({
                            ...prev,
                            [row.variant_id]: { ...edit, reason: e.target.value },
                          }))
                        }
                      />
                    </AdminTd>
                    <AdminTd className="text-right">
                      <Button
                        type="button"
                        size="sm"
                        disabled={savingId === row.variant_id}
                        onClick={() => void saveRow(row.variant_id, row.stock)}
                      >
                        Save
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setExpanded(isOpen ? null : row.variant_id)
                        }
                      >
                        {isOpen ? (
                          <ChevronUpIcon className="size-4" />
                        ) : (
                          <ChevronDownIcon className="size-4" />
                        )}
                        History
                      </Button>
                    </AdminTd>
                  </tr>
                  {isOpen ? (
                    <tr>
                      <td colSpan={6} className="border-t border-border bg-background">
                        <HistoryBlock variantId={row.variant_id} />
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              )
            })}
          </AdminTableBody>
        </AdminTable>
      )}

      {rows.length > 0 ? (
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
