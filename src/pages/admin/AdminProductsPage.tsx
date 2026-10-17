import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
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
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { archiveProduct, isSupabaseConfigured, listProducts } from '@/lib/admin/api'

export function AdminProductsPage() {
  const [search, setSearch] = useState('')
  const [debounced, setDebounced] = useState('')
  const [archiveId, setArchiveId] = useState<string | null>(null)
  const [archiving, setArchiving] = useState(false)
  const qc = useQueryClient()

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin', 'products', debounced],
    queryFn: () => listProducts(debounced),
    enabled: isSupabaseConfigured,
  })

  const onSearch = (e: FormEvent) => {
    e.preventDefault()
    setDebounced(search.trim())
  }

  const confirmArchive = async () => {
    if (!archiveId) return
    setArchiving(true)
    try {
      await archiveProduct(archiveId)
      toast.success('Product archived')
      setArchiveId(null)
      await qc.invalidateQueries({ queryKey: ['admin', 'products'] })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Archive failed')
    } finally {
      setArchiving(false)
    }
  }

  if (!isSupabaseConfigured) {
    return <p className="text-sm text-muted">Supabase is not configured.</p>
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Products</h1>
          <p className="text-sm text-muted">Manage catalogue and variants.</p>
        </div>
        <Button asChild>
          <Link to="/admin/products/new">New product</Link>
        </Button>
      </div>

      <form onSubmit={onSearch} className="flex max-w-md gap-2">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name or slug…"
          aria-label="Search products"
        />
        <Button type="submit" variant="secondary">
          Search
        </Button>
      </form>

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
              <AdminTh>Name</AdminTh>
              <AdminTh>Slug</AdminTh>
              <AdminTh>Status</AdminTh>
              <AdminTh className="text-right">Actions</AdminTh>
            </tr>
          </AdminTableHead>
          <AdminTableBody>
            {(data ?? []).map((p) => (
              <tr key={p.id}>
                <AdminTd>
                  <Link
                    to={`/admin/products/${p.id}`}
                    className="font-medium hover:text-accent hover:underline"
                  >
                    {p.name}
                  </Link>
                </AdminTd>
                <AdminTd className="text-muted">{p.slug}</AdminTd>
                <AdminTd>{p.is_active ? 'Active' : 'Draft'}</AdminTd>
                <AdminTd className="text-right">
                  <Button variant="ghost" size="sm" asChild>
                    <Link to={`/admin/products/${p.id}`}>Edit</Link>
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-red-800"
                    onClick={() => setArchiveId(p.id)}
                  >
                    Archive
                  </Button>
                </AdminTd>
              </tr>
            ))}
          </AdminTableBody>
        </AdminTable>
      )}

      <ConfirmDialog
        open={archiveId != null}
        onOpenChange={(o) => !o && setArchiveId(null)}
        title="Archive product?"
        description="The product will be hidden from the storefront. You can create a new listing later if needed."
        confirmLabel="Archive"
        destructive
        loading={archiving}
        onConfirm={confirmArchive}
      />
    </div>
  )
}
