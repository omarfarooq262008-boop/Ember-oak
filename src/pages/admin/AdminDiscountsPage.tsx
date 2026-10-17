import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'

import { ConfirmDialog } from '@/components/admin/ConfirmDialog'
import {
  AdminTable,
  AdminTableBody,
  AdminTableHead,
  AdminTd,
  AdminTh,
} from '@/components/admin/AdminTable'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import {
  deactivateDiscount,
  isSupabaseConfigured,
  listDiscounts,
  upsertDiscount,
  type DiscountRow,
} from '@/lib/admin/api'
import { formatPKR } from '@/lib/format'

type DiscountForm = {
  id?: string
  code: string
  type: 'percent' | 'fixed'
  value: number
  min_spend: number | null
  max_uses: number | null
  starts_at: string | null
  ends_at: string | null
  is_active: boolean
}

const emptyForm = (): DiscountForm => ({
  code: '',
  type: 'percent',
  value: 10,
  min_spend: null,
  max_uses: null,
  starts_at: null,
  ends_at: null,
  is_active: true,
})

export function AdminDiscountsPage() {
  const qc = useQueryClient()
  const [form, setForm] = useState(emptyForm())
  const [deactivateId, setDeactivateId] = useState<string | null>(null)

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin', 'discounts'],
    queryFn: listDiscounts,
    enabled: isSupabaseConfigured,
  })

  const saveMutation = useMutation({
    mutationFn: () => upsertDiscount(form),
    onSuccess: async () => {
      toast.success(form.id ? 'Discount updated' : 'Discount created')
      setForm(emptyForm())
      await qc.invalidateQueries({ queryKey: ['admin', 'discounts'] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const edit = (row: DiscountRow) => {
    setForm({
      id: row.id,
      code: row.code,
      type: row.type,
      value: row.value,
      min_spend: row.min_spend,
      max_uses: row.max_uses,
      starts_at: row.starts_at,
      ends_at: row.ends_at,
      is_active: row.is_active,
    })
  }

  const confirmDeactivate = async () => {
    if (!deactivateId) return
    try {
      await deactivateDiscount(deactivateId)
      toast.success('Discount deactivated')
      setDeactivateId(null)
      await qc.invalidateQueries({ queryKey: ['admin', 'discounts'] })
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed')
    }
  }

  if (!isSupabaseConfigured) {
    return <p className="text-sm text-muted">Supabase is not configured.</p>
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold">Discounts</h1>
        <p className="text-sm text-muted">Promo codes for checkout.</p>
      </div>

      <form
        className="grid gap-4 rounded-(--radius-card) border border-border bg-surface p-6 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault()
          saveMutation.mutate()
        }}
      >
        <h2 className="font-display text-lg font-semibold sm:col-span-2">
          {form.id ? 'Edit discount' : 'New discount'}
        </h2>
        <div className="space-y-1">
          <Label htmlFor="code">Code</Label>
          <Input
            id="code"
            value={form.code}
            onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
            required
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="type">Type</Label>
          <select
            id="type"
            className="flex h-11 w-full rounded-(--radius-sm) border border-border bg-surface px-3 text-sm"
            value={form.type}
            onChange={(e) =>
              setForm((f) => ({ ...f, type: e.target.value as 'percent' | 'fixed' }))
            }
          >
            <option value="percent">Percent</option>
            <option value="fixed">Fixed (PKR)</option>
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="value">Value</Label>
          <Input
            id="value"
            type="number"
            min={0}
            value={form.value}
            onChange={(e) => setForm((f) => ({ ...f, value: Number(e.target.value) }))}
            required
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="min">Min spend (PKR)</Label>
          <Input
            id="min"
            type="number"
            min={0}
            value={form.min_spend ?? ''}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                min_spend: e.target.value ? Number(e.target.value) : null,
              }))
            }
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="max">Usage limit</Label>
          <Input
            id="max"
            type="number"
            min={1}
            value={form.max_uses ?? ''}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                max_uses: e.target.value ? Number(e.target.value) : null,
              }))
            }
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="starts">Starts</Label>
          <Input
            id="starts"
            type="datetime-local"
            value={form.starts_at?.slice(0, 16) ?? ''}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                starts_at: e.target.value ? new Date(e.target.value).toISOString() : null,
              }))
            }
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="ends">Ends</Label>
          <Input
            id="ends"
            type="datetime-local"
            value={form.ends_at?.slice(0, 16) ?? ''}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                ends_at: e.target.value ? new Date(e.target.value).toISOString() : null,
              }))
            }
          />
        </div>
        <label className="flex items-center gap-2 text-sm sm:col-span-2">
          <Checkbox
            checked={form.is_active}
            onCheckedChange={(c) => setForm((f) => ({ ...f, is_active: c === true }))}
          />
          Active
        </label>
        <div className="flex gap-2 sm:col-span-2">
          <Button type="submit" disabled={saveMutation.isPending}>
            {saveMutation.isPending ? 'Saving…' : 'Save'}
          </Button>
          {form.id ? (
            <Button type="button" variant="secondary" onClick={() => setForm(emptyForm())}>
              Cancel edit
            </Button>
          ) : null}
        </div>
      </form>

      {isError ? (
        <Button variant="secondary" onClick={() => void refetch()}>
          Retry
        </Button>
      ) : null}

      {isLoading ? (
        <Skeleton className="h-48 w-full rounded-(--radius-card)" />
      ) : (
        <AdminTable>
          <AdminTableHead>
            <tr>
              <AdminTh>Code</AdminTh>
              <AdminTh>Type</AdminTh>
              <AdminTh>Value</AdminTh>
              <AdminTh>Uses</AdminTh>
              <AdminTh>Active</AdminTh>
              <AdminTh className="text-right">Actions</AdminTh>
            </tr>
          </AdminTableHead>
          <AdminTableBody>
            {(data ?? []).map((d) => (
              <tr key={d.id}>
                <AdminTd className="font-medium">{d.code}</AdminTd>
                <AdminTd>{d.type}</AdminTd>
                <AdminTd>
                  {d.type === 'percent' ? `${d.value}%` : formatPKR(d.value)}
                </AdminTd>
                <AdminTd>
                  {d.used_count}
                  {d.max_uses != null ? ` / ${d.max_uses}` : ''}
                </AdminTd>
                <AdminTd>{d.is_active ? 'Yes' : 'No'}</AdminTd>
                <AdminTd className="text-right">
                  <Button type="button" variant="ghost" size="sm" onClick={() => edit(d)}>
                    Edit
                  </Button>
                  {d.is_active ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeactivateId(d.id)}
                    >
                      Deactivate
                    </Button>
                  ) : null}
                </AdminTd>
              </tr>
            ))}
          </AdminTableBody>
        </AdminTable>
      )}

      <ConfirmDialog
        open={deactivateId != null}
        onOpenChange={(o) => !o && setDeactivateId(null)}
        title="Deactivate discount?"
        description="Customers will no longer be able to apply this code."
        confirmLabel="Deactivate"
        onConfirm={confirmDeactivate}
      />
    </div>
  )
}
