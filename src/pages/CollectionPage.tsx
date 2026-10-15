import { useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'

import { ProductCard } from '@/components/product/ProductCard'
import { Seo } from '@/components/seo/Seo'
import { Button } from '@/components/ui/button'
import { getCollectionBySlug, getProducts } from '@/lib/catalog'

export function CollectionPage() {
  const { slug } = useParams<{ slug: string }>()
  const collection = slug ? getCollectionBySlug(slug) : undefined

  const { items: products, total } = useMemo(
    () =>
      slug
        ? getProducts({ collectionSlug: slug, pageSize: 48 })
        : { items: [], total: 0 },
    [slug],
  )

  if (!collection) {
    return (
      <div className="section-pad bg-background">
        <div className="container-eo text-center">
          <h1 className="text-2xl">Collection not found</h1>
          <Button asChild className="mt-6" variant="secondary">
            <Link to="/collections">All collections</Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <>
      <Seo
        title={collection.name}
        description={collection.description ?? undefined}
        image={collection.image_url ?? undefined}
      />
      <div className="bg-background">
        {collection.image_url ? (
          <div className="aspect-banner w-full overflow-hidden">
            <img
              src={collection.image_url}
              alt=""
              className="size-full object-cover"
            />
          </div>
        ) : null}
        <div className="section-pad">
          <div className="container-eo">
            <nav className="text-sm text-muted">
              <Link to="/collections" className="hover:text-accent">
                Collections
              </Link>
              <span aria-hidden> / </span>
              <span className="text-text">{collection.name}</span>
            </nav>
            <header className="mt-4 max-w-2xl">
              <h1 className="text-3xl md:text-4xl">{collection.name}</h1>
              {collection.description ? (
                <p className="mt-3 text-muted">{collection.description}</p>
              ) : null}
              <p className="mt-4 text-sm text-muted">
                {total} product{total === 1 ? '' : 's'}
              </p>
            </header>

            {total === 0 ? (
              <p className="mt-12 text-muted">
                No products in this collection yet.
              </p>
            ) : (
              <ul className="mt-10 grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 xl:grid-cols-4">
                {products.map((product) => (
                  <li key={product.id}>
                    <ProductCard product={product} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
