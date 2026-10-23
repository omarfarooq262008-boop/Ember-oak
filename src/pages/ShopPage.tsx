import { useMemo, type ReactNode } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { XIcon } from 'lucide-react'

import {
  CatalogError,
  ProductGridSkeleton,
} from '@/components/CatalogState'
import { ProductCard } from '@/components/product/ProductCard'
import { Seo } from '@/components/seo/Seo'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { store } from '@/config/store'
import {
  useAttributeOptions,
  useCategories,
  usePriceBounds,
  useProductList,
} from '@/hooks/useCatalog'
import type { ProductSort } from '@/lib/api/queryBuilders'
import { formatPKR } from '@/lib/format'
import {
  parseShopSearchParams,
  SHOP_PAGE_SIZE,
  shopParamsToSearchParams,
  type ShopSearchParams,
} from '@/lib/shopParams'
import { cn } from '@/lib/utils'
import type { ProductAttributeKey } from '@/types'

const SORT_OPTIONS: { value: ProductSort; label: string }[] = [
  { value: 'featured', label: 'Featured' },
  { value: 'price-asc', label: 'Price: low to high' },
  { value: 'price-desc', label: 'Price: high to low' },
  { value: 'newest', label: 'Newest' },
]

const ATTR_LABELS: Record<ProductAttributeKey, string> = {
  size: 'Size',
  scent: 'Scent',
  color: 'Color',
}

function useShopState() {
  const navigate = useNavigate()
  const { category: pathCategory } = useParams<{ category?: string }>()
  const [searchParams, setSearchParams] = useSearchParams()
  const parsed = useMemo(() => {
    const fromQuery = parseShopSearchParams(searchParams)
    return {
      ...fromQuery,
      categorySlug: pathCategory ?? fromQuery.categorySlug,
    }
  }, [searchParams, pathCategory])

  const update = (patch: Partial<ShopSearchParams>, resetPage = true) => {
    const next: ShopSearchParams = {
      ...parsed,
      ...patch,
      page: resetPage ? 1 : (patch.page ?? parsed.page),
    }
    const categoryChanged =
      patch.categorySlug !== undefined &&
      patch.categorySlug !== (pathCategory ?? parsed.categorySlug)
    const sp = shopParamsToSearchParams({
      ...next,
      categorySlug: undefined,
    })
    const qs = sp.toString()
    if (categoryChanged || patch.categorySlug !== undefined) {
      const base = next.categorySlug
        ? `/shop/${next.categorySlug}`
        : '/shop'
      navigate(qs ? `${base}?${qs}` : base, { replace: resetPage })
      return
    }
    setSearchParams(sp, { replace: resetPage })
  }

  const clearAll = () => navigate('/shop', { replace: true })

  return { parsed, update, clearAll }
}

export function ShopPage() {
  const { parsed, update, clearAll } = useShopState()
  const categoriesQuery = useCategories()
  const attrQuery = useAttributeOptions()
  const boundsQuery = usePriceBounds()

  const listQuery = useProductList({
    categorySlug: parsed.categorySlug,
    collectionSlug: parsed.collectionSlug,
    minPrice: parsed.minPrice,
    maxPrice: parsed.maxPrice,
    inStock: parsed.inStock,
    attributes: parsed.attributes,
    sort: parsed.sort,
    pageSize: SHOP_PAGE_SIZE,
    visiblePages: parsed.page,
  })

  const categories = categoriesQuery.data ?? []
  const attrOptions = attrQuery.data ?? { size: [], scent: [], color: [] }
  const priceBounds = boundsQuery.data ?? { min: 0, max: 0 }
  const products = listQuery.data?.items ?? []
  const total = listQuery.data?.total ?? 0

  const chips = useMemo(() => {
    const list: { key: string; label: string; clear: () => void }[] = []
    if (parsed.categorySlug) {
      const cat = categories.find((c) => c.slug === parsed.categorySlug)
      list.push({
        key: 'category',
        label: cat?.name ?? parsed.categorySlug,
        clear: () => update({ categorySlug: undefined }),
      })
    }
    if (parsed.minPrice != null || parsed.maxPrice != null) {
      const min = parsed.minPrice ?? priceBounds.min
      const max = parsed.maxPrice ?? priceBounds.max
      list.push({
        key: 'price',
        label: `${formatPKR(min)} – ${formatPKR(max)}`,
        clear: () => update({ minPrice: undefined, maxPrice: undefined }),
      })
    }
    if (parsed.inStock === true) {
      list.push({
        key: 'inStock',
        label: 'In stock',
        clear: () => update({ inStock: undefined }),
      })
    }
    if (parsed.attributes) {
      for (const [k, v] of Object.entries(parsed.attributes)) {
        list.push({
          key: k,
          label: `${ATTR_LABELS[k as ProductAttributeKey] ?? k}: ${v}`,
          clear: () => {
            const next = { ...parsed.attributes }
            delete next[k]
            update({
              attributes: Object.keys(next).length > 0 ? next : undefined,
            })
          },
        })
      }
    }
    return list
  }, [parsed, priceBounds, categories, update])

  const hasMore = products.length < total
  const loading = listQuery.isLoading || categoriesQuery.isLoading
  const error = listQuery.isError
  const gridKey = [
    parsed.categorySlug ?? '',
    parsed.sort ?? 'featured',
    parsed.minPrice ?? '',
    parsed.maxPrice ?? '',
    parsed.inStock ? '1' : '0',
    JSON.stringify(parsed.attributes ?? {}),
    String(parsed.page),
  ].join('|')

  return (
    <>
      <Seo title="Shop" description={store.whatWeSell} />
      <div className="section-pad bg-background">
        <div className="container-eo">
          <header className="max-w-2xl">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-accent">
              Catalog
            </p>
            <h1 className="mt-2 text-3xl md:text-4xl">Shop</h1>
            <p className="mt-3 text-muted">{store.whatWeSell}</p>
          </header>

          <div className="mt-10 grid gap-8 lg:grid-cols-[17.5rem_1fr] lg:gap-12">
            <aside className="lg:sticky lg:top-24 lg:self-start">
              <div className="space-y-5 rounded-(--radius-card) border border-border bg-surface p-5 shadow-[0_1px_0_rgba(28,25,23,0.04)]">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-text">Filters</p>
                  {chips.length > 0 ? (
                    <button
                      type="button"
                      onClick={clearAll}
                      className="text-xs font-medium text-muted underline-offset-2 transition-colors hover:text-accent hover:underline"
                    >
                      Clear all
                    </button>
                  ) : null}
                </div>

                <FilterField label="Category">
                  <Select
                    value={parsed.categorySlug ?? '__all__'}
                    onValueChange={(v) =>
                      update({
                        categorySlug: v === '__all__' ? undefined : v,
                      })
                    }
                  >
                    <SelectTrigger aria-label="Category">
                      <SelectValue placeholder="All categories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">All categories</SelectItem>
                      {categories.map((c) => (
                        <SelectItem key={c.id} value={c.slug}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FilterField>

                <FilterField label="Price range">
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      type="number"
                      min={priceBounds.min}
                      max={priceBounds.max}
                      placeholder="Min"
                      inputMode="numeric"
                      aria-label="Minimum price"
                      value={parsed.minPrice ?? ''}
                      onChange={(e) => {
                        const v = e.target.value
                        update({
                          minPrice: v === '' ? undefined : Number(v),
                        })
                      }}
                    />
                    <Input
                      type="number"
                      min={priceBounds.min}
                      max={priceBounds.max}
                      placeholder="Max"
                      inputMode="numeric"
                      aria-label="Maximum price"
                      value={parsed.maxPrice ?? ''}
                      onChange={(e) => {
                        const v = e.target.value
                        update({
                          maxPrice: v === '' ? undefined : Number(v),
                        })
                      }}
                    />
                  </div>
                </FilterField>

                <label className="flex cursor-pointer items-center gap-3 rounded-(--radius-sm) border border-border/80 bg-background/60 px-3 py-3 transition-colors hover:bg-background">
                  <Checkbox
                    id="in-stock"
                    checked={parsed.inStock === true}
                    onCheckedChange={(checked) =>
                      update({
                        inStock: checked === true ? true : undefined,
                      })
                    }
                  />
                  <span className="text-sm text-text">In stock only</span>
                </label>

                {(Object.keys(attrOptions) as ProductAttributeKey[]).map(
                  (key) =>
                    (attrOptions[key] ?? []).length > 0 ? (
                      <FilterField key={key} label={ATTR_LABELS[key]}>
                        <Select
                          value={parsed.attributes?.[key] ?? '__any__'}
                          onValueChange={(v) => {
                            const next = { ...parsed.attributes }
                            if (v && v !== '__any__') next[key] = v
                            else delete next[key]
                            update({
                              attributes:
                                Object.keys(next).length > 0
                                  ? next
                                  : undefined,
                            })
                          }}
                        >
                          <SelectTrigger aria-label={ATTR_LABELS[key]}>
                            <SelectValue placeholder="Any" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__any__">Any</SelectItem>
                            {(attrOptions[key] ?? []).map((opt) => (
                              <SelectItem key={opt} value={opt}>
                                {opt}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FilterField>
                    ) : null,
                )}
              </div>
            </aside>

            <div>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <p className="text-sm text-muted">
                  {loading
                    ? 'Loading…'
                    : total === 0
                      ? 'No products'
                      : `${total} product${total === 1 ? '' : 's'}`}
                </p>
                <FilterField label="Sort" className="sm:w-56">
                  <Select
                    value={parsed.sort ?? 'featured'}
                    onValueChange={(v) =>
                      update({ sort: v as ProductSort })
                    }
                  >
                    <SelectTrigger aria-label="Sort products">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SORT_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FilterField>
              </div>

              {chips.length > 0 ? (
                <ul className="mt-4 flex flex-wrap gap-2">
                  {chips.map((chip) => (
                    <li key={chip.key}>
                      <button
                        type="button"
                        className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium text-text transition-colors hover:border-accent/40 hover:bg-background"
                        onClick={chip.clear}
                      >
                        {chip.label}
                        <XIcon className="size-3 text-muted" aria-hidden />
                        <span className="sr-only">Remove filter</span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}

              {loading ? (
                <div className="mt-8">
                  <ProductGridSkeleton count={12} />
                </div>
              ) : error ? (
                <div className="mt-8">
                  <CatalogError onRetry={() => void listQuery.refetch()} />
                </div>
              ) : total === 0 ? (
                <div className="mt-12 rounded-(--radius-card) border border-dashed border-border bg-surface px-6 py-16 text-center">
                  <p className="text-muted">No products match your filters.</p>
                  <Button
                    type="button"
                    variant="secondary"
                    className="mt-6"
                    onClick={clearAll}
                  >
                    Clear filters
                  </Button>
                </div>
              ) : (
                <>
                  <ul
                    key={gridKey}
                    className={cn(
                      'product-grid-enter mt-8 grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 xl:grid-cols-4',
                    )}
                  >
                    {products.map((product) => (
                      <li key={product.id}>
                        <ProductCard product={product} />
                      </li>
                    ))}
                  </ul>
                  {hasMore ? (
                    <div className="mt-10 text-center">
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() =>
                          update({ page: parsed.page + 1 }, false)
                        }
                      >
                        Load more
                      </Button>
                    </div>
                  ) : null}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

function FilterField({
  label,
  children,
  className,
}: {
  label: string
  children: ReactNode
  className?: string
}) {
  return (
    <div className={className}>
      <Label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
        {label}
      </Label>
      {children}
    </div>
  )
}
