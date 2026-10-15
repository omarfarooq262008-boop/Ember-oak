import { useMemo, type ReactNode } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'

import { ProductCard } from '@/components/product/ProductCard'
import { Seo } from '@/components/seo/Seo'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { store } from '@/config/store'
import {
  getCatalogAttributeOptions,
  getCatalogPriceBounds,
} from '@/lib/catalogAttributes'
import {
  getCategories,
  getCategoryBySlug,
  getProducts,
  type ProductSort,
} from '@/lib/catalog'
import {
  parseShopSearchParams,
  SHOP_PAGE_SIZE,
  shopParamsToSearchParams,
  type ShopSearchParams,
} from '@/lib/shopParams'
import { formatPKR } from '@/lib/format'
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

  return { parsed, update, clearAll, setSearchParams }
}

export function ShopPage() {
  const categories = getCategories()
  const attrOptions = useMemo(() => getCatalogAttributeOptions(), [])
  const priceBounds = useMemo(() => getCatalogPriceBounds(), [])
  const { parsed, update, clearAll } = useShopState()

  const total = useMemo(
    () =>
      getProducts({
        categorySlug: parsed.categorySlug,
        collectionSlug: parsed.collectionSlug,
        minPrice: parsed.minPrice,
        maxPrice: parsed.maxPrice,
        inStock: parsed.inStock,
        attributes: parsed.attributes,
        sort: parsed.sort,
        page: 1,
        pageSize: SHOP_PAGE_SIZE,
      }).total,
    [
      parsed.categorySlug,
      parsed.collectionSlug,
      parsed.minPrice,
      parsed.maxPrice,
      parsed.inStock,
      parsed.attributes,
      parsed.sort,
    ],
  )

  const products = useMemo(() => {
    const all: ReturnType<typeof getProducts>['items'] = []
    for (let p = 1; p <= parsed.page; p++) {
      const { items } = getProducts({
        categorySlug: parsed.categorySlug,
        collectionSlug: parsed.collectionSlug,
        minPrice: parsed.minPrice,
        maxPrice: parsed.maxPrice,
        inStock: parsed.inStock,
        attributes: parsed.attributes,
        sort: parsed.sort,
        page: p,
        pageSize: SHOP_PAGE_SIZE,
      })
      all.push(...items)
    }
    return all
  }, [
    parsed.page,
    parsed.categorySlug,
    parsed.collectionSlug,
    parsed.minPrice,
    parsed.maxPrice,
    parsed.inStock,
    parsed.attributes,
    parsed.sort,
  ])

  const chips = useMemo(() => {
    const list: { key: string; label: string; clear: () => void }[] = []
    if (parsed.categorySlug) {
      const cat = getCategoryBySlug(parsed.categorySlug)
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
              attributes:
                Object.keys(next).length > 0 ? next : undefined,
            })
          },
        })
      }
    }
    return list
  }, [parsed, priceBounds, update])

  const hasMore = products.length < total

  return (
    <>
      <Seo title="Shop" description={store.whatWeSell} />
      <div className="section-pad bg-background">
        <div className="container-eo">
          <header className="max-w-2xl">
            <h1 className="text-3xl md:text-4xl">Shop</h1>
            <p className="mt-3 text-muted">{store.whatWeSell}</p>
          </header>

          <div className="mt-10 grid gap-10 lg:grid-cols-[14rem_1fr] lg:gap-12">
            <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
              <FilterField label="Category">
                <select
                  className="w-full rounded-(--radius-sm) border border-border bg-surface px-3 py-2.5 text-sm"
                  value={parsed.categorySlug ?? ''}
                  onChange={(e) =>
                    update({
                      categorySlug: e.target.value || undefined,
                    })
                  }
                >
                  <option value="">All categories</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.slug}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </FilterField>

              <FilterField label="Price range">
                <div className="flex gap-2">
                  <input
                    type="number"
                    min={priceBounds.min}
                    max={priceBounds.max}
                    placeholder="Min"
                    className="w-full rounded-(--radius-sm) border border-border bg-surface px-3 py-2 text-sm"
                    value={parsed.minPrice ?? ''}
                    onChange={(e) => {
                      const v = e.target.value
                      update({
                        minPrice: v === '' ? undefined : Number(v),
                      })
                    }}
                  />
                  <input
                    type="number"
                    min={priceBounds.min}
                    max={priceBounds.max}
                    placeholder="Max"
                    className="w-full rounded-(--radius-sm) border border-border bg-surface px-3 py-2 text-sm"
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

              <div className="flex items-center gap-2">
                <Checkbox
                  id="in-stock"
                  checked={parsed.inStock === true}
                  onCheckedChange={(checked) =>
                    update({
                      inStock: checked === true ? true : undefined,
                    })
                  }
                />
                <Label htmlFor="in-stock" className="text-sm font-normal">
                  In stock only
                </Label>
              </div>

              {(Object.keys(attrOptions) as ProductAttributeKey[]).map(
                (key) =>
                  attrOptions[key].length > 0 ? (
                    <FilterField key={key} label={ATTR_LABELS[key]}>
                      <select
                        className="w-full rounded-(--radius-sm) border border-border bg-surface px-3 py-2.5 text-sm"
                        value={parsed.attributes?.[key] ?? ''}
                        onChange={(e) => {
                          const v = e.target.value
                          const next = { ...parsed.attributes }
                          if (v) next[key] = v
                          else delete next[key]
                          update({
                            attributes:
                              Object.keys(next).length > 0 ? next : undefined,
                          })
                        }}
                      >
                        <option value="">Any</option>
                        {attrOptions[key].map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    </FilterField>
                  ) : null,
              )}

              {chips.length > 0 ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="w-full"
                  onClick={clearAll}
                >
                  Clear all filters
                </Button>
              ) : null}
            </aside>

            <div>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-muted">
                  {total === 0
                    ? 'No products'
                    : `${total} product${total === 1 ? '' : 's'}`}
                </p>
                <FilterField label="Sort" className="sm:w-52">
                  <select
                    className="w-full rounded-(--radius-sm) border border-border bg-surface px-3 py-2.5 text-sm"
                    value={parsed.sort ?? 'featured'}
                    onChange={(e) =>
                      update({ sort: e.target.value as ProductSort })
                    }
                  >
                    {SORT_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </FilterField>
              </div>

              {chips.length > 0 ? (
                <ul className="mt-4 flex flex-wrap gap-2">
                  {chips.map((chip) => (
                    <li key={chip.key}>
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium hover:bg-background"
                        onClick={chip.clear}
                      >
                        {chip.label}
                        <span aria-hidden>×</span>
                        <span className="sr-only">Remove filter</span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}

              {total === 0 ? (
                <div className="mt-12 rounded-(--radius-card) border border-border bg-surface px-6 py-16 text-center">
                  <p className="text-muted">
                    No products match your filters.
                  </p>
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
                  <ul className="mt-8 grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 xl:grid-cols-4">
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
      <Label className="mb-2 block text-xs font-medium uppercase tracking-wide text-muted">
        {label}
      </Label>
      {children}
    </div>
  )
}
