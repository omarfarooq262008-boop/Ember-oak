import { Link } from 'react-router-dom'

import {
  CatalogError,
  ProductGridSkeleton,
} from '@/components/CatalogState'
import { SoftImage } from '@/components/ui/soft-image'
import { Seo } from '@/components/seo/Seo'
import { useCollections } from '@/hooks/useCatalog'

export function CollectionsIndexPage() {
  const { data: collections = [], isLoading, isError, refetch } =
    useCollections()

  return (
    <>
      <Seo
        title="Collections"
        description="Curated home fragrance and homeware collections from Ember & Oak."
      />
      <div className="section-pad bg-background">
        <div className="container-eo">
          <h1 className="text-3xl md:text-4xl">Collections</h1>
          <p className="mt-3 max-w-xl text-muted">
            Rooms and rituals, gathered into considered edits.
          </p>

          {isLoading ? (
            <div className="mt-10">
              <ProductGridSkeleton count={3} />
            </div>
          ) : isError ? (
            <div className="mt-10">
              <CatalogError onRetry={() => void refetch()} />
            </div>
          ) : (
            <ul className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {collections.map((col) => (
                <li key={col.id}>
                  <Link
                    to={`/collections/${col.slug}`}
                    className="group hover-lift block overflow-hidden rounded-(--radius-card) border border-border bg-surface"
                  >
                    <div className="aspect-banner overflow-hidden">
                      {col.image_url ? (
                        <SoftImage
                          src={col.image_url}
                          alt=""
                          className="img-zoom"
                          loading="lazy"
                        />
                      ) : (
                        <div className="size-full bg-border" aria-hidden />
                      )}
                    </div>
                    <div className="border-t border-border px-5 py-4">
                      <h2 className="text-lg font-bold">{col.name}</h2>
                      {col.description ? (
                        <p className="mt-1 line-clamp-2 text-sm text-muted">
                          {col.description}
                        </p>
                      ) : null}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </>
  )
}
