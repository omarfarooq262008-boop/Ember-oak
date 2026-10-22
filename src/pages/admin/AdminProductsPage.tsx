import { useQuery, useQueryClient } from '@tanstack/react-query'
import { PlusIcon } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
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
  const [page, setPage] = useState(1)
  const [archiveId, setArchiveId] = useState<string | null>(null)
  const [archiving, setArchiving] = useState(false)
  const qc = useQueryClient()

  useEffect(() => {
    document.title = 'Products | Admin'
  }, [])

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin', 'products', debounced, page],
    queryFn: () => listProducts(debounced, { page, pageSize: 50 }),
    enabled: isSupabaseConfigured,
  })
  const products = data?.items ?? []

  const onSearch = (e: FormEvent) => {
    e.preventDefault()
    setPage(1)
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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Products</h1>
          <p className="text-sm text-muted">
            Create, edit, and archive catalogue items.
          </p>
        </div>
        <Button asChild className="w-full sm:w-auto">
          <Link to="/admin/products/new">
            <PlusIcon className="size-4" aria-hidden />
            New product
          </Link>
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
        <div className="rounded-(--radius-card) border border-border bg-surface p-4">
          <p className="text-sm text-muted">Could not load products.</p>
          <Button variant="secondary" className="mt-3" onClick={() => void refetch()}>
            Retry
          </Button>
        </div>
      ) : null}

      {isLoading ? (
        <Skeleton className="h-64 w-full rounded-(--radius-card)" />
      ) : products.length === 0 ? (
        <div className="rounded-(--radius-card) border border-dashed border-border bg-surface p-10 text-center">
          <p className="font-medium text-text">No products yet</p>
          <p className="mt-1 text-sm text-muted">
            Add your first product to the catalogue.
          </p>
          <Button asChild className="mt-6">
            <Link to="/admin/products/new">
              <PlusIcon className="size-4" aria-hidden />
              New product
            </Link>
          </Button>
        </div>
      ) : (
        <AdminTable>
          <AdminTableHead>
            <tr>
              <AdminTh className="w-14"> </AdminTh>
              <AdminTh>Name</AdminTh>
              <AdminTh>Status</AdminTh>
              <AdminTh className="text-right">Stock</AdminTh>
              <AdminTh className="text-right">Actions</AdminTh>
            </tr>
          </AdminTableHead>
          <AdminTableBody>
            {products.map((p) => (
              <tr key={p.id}>
                <AdminTd>
                  {p.thumbnail_url ? (
                    <img
                      src={p.thumbnail_url}
                      alt=""
                      width={48}
                      height={48}
                      loading="lazy"
                      className="size-12 rounded-(--radius-sm) object-cover"
                    />
                  ) : (
                    <div className="flex size-12 items-center justify-center rounded-(--radius-sm) bg-background text-[10px] text-muted">
                      No img
                    </div>
                  )}
                </AdminTd>
                <AdminTd>
                  <Link
                    to={`/admin/products/${p.id}`}
                    className="font-medium hover:text-accent hover:underline"
                  >
                    {p.name}
                  </Link>
                  <p className="text-xs text-muted">{p.slug}</p>
                </AdminTd>
                <AdminTd>
                  <span
                    className={
                      p.is_active
                        ? 'text-success'
                        : 'text-muted'
                    }
                  >
                    {p.is_active ? 'Active' : 'Draft'}
                  </span>
                </AdminTd>
                <AdminTd className="text-right tabular-nums">
                  {p.stock_total}
                  <span className="block text-xs text-muted">
                    {p.variant_count} variant{p.variant_count === 1 ? '' : 's'}
                  </span>
                </AdminTd>
                <AdminTd className="text-right whitespace-nowrap">
                  <Button variant="ghost" size="sm" asChild>
                    <Link to={`/admin/products/${p.id}`}>Edit</Link>
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-error"
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

      {products.length > 0 ? (
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
