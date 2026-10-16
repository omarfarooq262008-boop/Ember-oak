import { Link, useSearchParams } from 'react-router-dom'

import {
  CatalogError,
  ProductGridSkeleton,
} from '@/components/CatalogState'
import { ProductCard } from '@/components/product/ProductCard'
import { Seo } from '@/components/seo/Seo'
import { Button } from '@/components/ui/button'
import { useProductSearch } from '@/hooks/useCatalog'

export function SearchPage() {
  const [searchParams] = useSearchParams()
  const query = searchParams.get('q')?.trim() ?? ''
  const { data: results = [], isLoading, isError, refetch } = useProductSearch(
    query,
    48,
  )

  return (
    <>
      <Seo
        title={query ? `Search: ${query}` : 'Search'}
        description={
          query
            ? `Results for “${query}” at Ember & Oak.`
            : 'Search our catalog.'
        }
      />
      <div className="section-pad bg-background">
        <div className="container-eo">
          <h1 className="text-3xl md:text-4xl">Search</h1>
          {query ? (
            <p className="mt-3 text-muted">
              Results for{' '}
              <span className="font-medium text-text">“{query}”</span>
              {!isLoading ? (
                <>
                  {' · '}
                  {results.length} match{results.length === 1 ? '' : 'es'}
                </>
              ) : null}
            </p>
          ) : (
            <p className="mt-3 text-muted">
              Enter a search term from the header to find products.
            </p>
          )}

          {!query ? null : isLoading ? (
            <div className="mt-10">
              <ProductGridSkeleton count={8} />
            </div>
          ) : isError ? (
            <div className="mt-10">
              <CatalogError onRetry={() => void refetch()} />
            </div>
          ) : results.length === 0 ? (
            <div className="mt-12 rounded-(--radius-card) border border-border bg-surface px-6 py-16 text-center">
              <p className="text-muted">
                No products matched “{query}”. Try another spelling or browse the
                shop.
              </p>
              <Button asChild variant="secondary" className="mt-6">
                <Link to="/shop">Browse shop</Link>
              </Button>
            </div>
          ) : (
            <ul className="mt-10 grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 lg:grid-cols-4">
              {results.map((product) => (
                <li key={product.id}>
                  <ProductCard product={product} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </>
  )
}
