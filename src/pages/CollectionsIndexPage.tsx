import { Link } from 'react-router-dom'

import { Seo } from '@/components/seo/Seo'
import { getCollections } from '@/lib/catalog'
import { store } from '@/config/store'

export function CollectionsIndexPage() {
  const collections = getCollections()

  return (
    <>
      <Seo
        title="Collections"
        description={`Curated edits from ${store.name}.`}
      />
      <div className="section-pad bg-background">
        <div className="container-eo">
          <header className="max-w-2xl">
            <h1 className="text-3xl md:text-4xl">Collections</h1>
            <p className="mt-3 text-muted">
              Curated mood boards — fragrance, ceramics, and textiles together.
            </p>
          </header>
          <ul className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {collections.map((col) => (
              <li key={col.id}>
                <Link
                  to={`/collections/${col.slug}`}
                  className="group block overflow-hidden rounded-(--radius-card) bg-surface"
                >
                  <div className="aspect-banner overflow-hidden">
                    {col.image_url ? (
                      <img
                        src={col.image_url}
                        alt=""
                        className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                        loading="lazy"
                      />
                    ) : (
                      <div className="size-full bg-border" aria-hidden />
                    )}
                  </div>
                  <div className="border border-t-0 border-border p-5">
                    <h2 className="text-lg font-bold">{col.name}</h2>
                    {col.description ? (
                      <p className="mt-2 text-sm text-muted line-clamp-2">
                        {col.description}
                      </p>
                    ) : null}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </>
  )
}
