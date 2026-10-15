import { SearchIcon } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { getCategories, searchProducts } from '@/lib/catalog'
import { cn } from '@/lib/utils'

type SearchDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SearchDialog({ open, onOpenChange }: SearchDialogProps) {
  const [query, setQuery] = useState('')
  const navigate = useNavigate()

  const trimmed = query.trim()

  const handleOpenChange = (next: boolean) => {
    if (!next) setQuery('')
    onOpenChange(next)
  }
  const suggestions = useMemo(() => {
    if (trimmed.length < 2) {
      return { products: [], categories: [] as ReturnType<typeof getCategories> }
    }
    const q = trimmed.toLowerCase()
    const categories = getCategories().filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.description?.toLowerCase().includes(q) ?? false),
    )
    const products = searchProducts(trimmed).slice(0, 6)
    return { products, categories: categories.slice(0, 4) }
  }, [trimmed])

  const goToSearch = () => {
    if (!trimmed) return
    onOpenChange(false)
    navigate(`/search?q=${encodeURIComponent(trimmed)}`)
  }

  const hasResults =
    suggestions.products.length > 0 || suggestions.categories.length > 0

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="gap-0 p-0 sm:max-w-lg">
        <DialogHeader className="border-b border-border px-4 py-3">
          <DialogTitle className="text-left text-base font-medium">
            Search
          </DialogTitle>
        </DialogHeader>
        <div className="p-4">
          <form
            role="search"
            onSubmit={(e) => {
              e.preventDefault()
              goToSearch()
            }}
          >
            <div className="relative">
              <SearchIcon
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted"
                aria-hidden
              />
              <Input
                type="search"
                placeholder="Search candles, ceramics, throws…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-9"
                autoFocus
                aria-label="Search products"
              />
            </div>
          </form>

          {trimmed.length >= 2 ? (
            <div className="mt-4 max-h-[min(50vh,20rem)] overflow-y-auto">
              {!hasResults ? (
                <p className="py-6 text-center text-sm text-muted">
                  No matches — try another term or{' '}
                  <button
                    type="button"
                    className="font-medium text-accent underline-offset-2 hover:underline"
                    onClick={goToSearch}
                  >
                    view all results
                  </button>
                  .
                </p>
              ) : (
                <div className="space-y-4">
                  {suggestions.categories.length > 0 ? (
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-muted">
                        Categories
                      </p>
                      <ul className="mt-2">
                        {suggestions.categories.map((cat) => (
                          <li key={cat.id}>
                            <Link
                              to={`/shop?category=${cat.slug}`}
                              className="block rounded-(--radius-sm) px-2 py-2 text-sm hover:bg-background"
                              onClick={() => onOpenChange(false)}
                            >
                              {cat.name}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  {suggestions.products.length > 0 ? (
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-muted">
                        Products
                      </p>
                      <ul className="mt-2">
                        {suggestions.products.map((product) => {
                          const img = product.images?.[0]
                          return (
                            <li key={product.id}>
                              <Link
                                to={`/product/${product.slug}`}
                                className={cn(
                                  'flex items-center gap-3 rounded-(--radius-sm) px-2 py-2 hover:bg-background',
                                )}
                                onClick={() => onOpenChange(false)}
                              >
                                {img ? (
                                  <img
                                    src={img.url}
                                    alt=""
                                    className="size-12 rounded-(--radius-sm) object-cover"
                                  />
                                ) : (
                                  <span
                                    className="size-12 rounded-(--radius-sm) bg-border"
                                    aria-hidden
                                  />
                                )}
                                <span className="text-sm font-medium">
                                  {product.name}
                                </span>
                              </Link>
                            </li>
                          )
                        })}
                      </ul>
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          ) : (
            <p className="mt-4 text-sm text-muted">
              Type at least two characters for suggestions.
            </p>
          )}

          {trimmed.length >= 2 ? (
            <button
              type="button"
              className="mt-4 w-full rounded-(--radius-sm) border border-border py-2.5 text-sm font-medium hover:bg-background"
              onClick={goToSearch}
            >
              Search for “{trimmed}”
            </button>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  )
}
