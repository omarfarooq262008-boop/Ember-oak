import { Link, useParams } from 'react-router-dom'

import {
  CatalogError,
  ProductGridSkeleton,
} from '@/components/CatalogState'
import { ProductCard } from '@/components/product/ProductCard'
import { Seo } from '@/components/seo/Seo'
import { Button } from '@/components/ui/button'
import { useCollectionBySlug, useProductList } from '@/hooks/useCatalog'

export function CollectionPage() {
  const { slug = '' } = useParams<{ slug: string }>()
  const collectionQuery = useCollectionBySlug(slug)
  const listQuery = useProductList({
    collectionSlug: slug,
    sort: 'featured',
    pageSize: 48,
    visiblePages: 1,
  })

  const collection = collectionQuery.data
  const products = listQuery.data?.items ?? []
  const loading = collectionQuery.isLoading || listQuery.isLoading
  const error = collectionQuery.isError || listQuery.isError

  if (!loading && !error && !collection) {
    return (
      <div className="section-pad container-eo max-w-lg text-center">
        <Seo title="Collection not found" />
        <h1 className="text-3xl">Collection not found</h1>
        <Button asChild className="mt-8">
          <Link to="/collections">Browse collections</Link>
        </Button>
      </div>
    )
  }

  return (
    <>
      <Seo
        title={collection?.name ?? 'Collection'}
        description={collection?.description ?? undefined}
      />
      <div className="section-pad bg-background">
        <div className="container-eo">
          {loading ? (
            <ProductGridSkeleton count={8} />
          ) : error ? (
            <CatalogError
              onRetry={() => {
                void collectionQuery.refetch()
                void listQuery.refetch()
              }}
            />
          ) : (
            <>
              <header className="max-w-2xl">
                <p className="text-xs font-medium uppercase tracking-[0.2em] text-accent">
                  Collection
                </p>
                <h1 className="mt-2 text-3xl md:text-4xl">{collection?.name}</h1>
                {collection?.description ? (
                  <p className="mt-3 text-muted">{collection.description}</p>
                ) : null}
              </header>
              <ul className="mt-10 grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 lg:grid-cols-4">
                {products.map((product) => (
                  <li key={product.id}>
                    <ProductCard product={product} />
                  </li>
                ))}
              </ul>
              {products.length === 0 ? (
                <p className="mt-10 text-muted">
                  No products in this collection yet.
                </p>
              ) : null}
            </>
          )}
        </div>
      </div>
    </>
  )
}
