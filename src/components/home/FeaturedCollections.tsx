import { ArrowUpRightIcon } from 'lucide-react'
import { Link } from 'react-router-dom'

import {
  CatalogError,
  ProductGridSkeleton,
} from '@/components/CatalogState'
import { SoftImage } from '@/components/ui/soft-image'
import { useCollections } from '@/hooks/useCatalog'
import { useInViewFade } from '@/hooks/useInViewFade'
import { cn } from '@/lib/utils'

export function FeaturedCollections() {
  const { data, isLoading, isError, refetch } = useCollections(true)
  const collections = data ?? []
  const { ref, inView } = useInViewFade<HTMLElement>()

  return (
    <section
      ref={ref}
      className="section-pad bg-background"
      aria-labelledby="featured-collections-heading"
    >
      <div className="container-eo">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p
              className={cn(
                'text-xs font-medium uppercase tracking-[0.2em] text-accent',
                inView && 'fade-in',
              )}
            >
              Curated
            </p>
            <h2
              id="featured-collections-heading"
              className={cn(
                'mt-2 text-2xl md:text-3xl',
                inView && 'fade-in-up',
              )}
            >
              Featured collections
            </h2>
          </div>
          <Link
            to="/collections"
            className={cn(
              'inline-flex min-h-11 items-center gap-1 text-sm font-medium text-muted transition-colors hover:text-accent',
              inView && 'fade-in',
            )}
            style={inView ? { animationDelay: '120ms' } : undefined}
          >
            View all
            <ArrowUpRightIcon className="size-4" aria-hidden />
          </Link>
        </div>

        {isLoading ? (
          <div className="mt-8">
            <ProductGridSkeleton count={3} />
          </div>
        ) : isError ? (
          <div className="mt-8">
            <CatalogError onRetry={() => void refetch()} />
          </div>
        ) : (
          <ul className="mt-8 grid gap-5 md:grid-cols-3 md:gap-6">
            {collections.map((col, i) => (
              <li
                key={col.id}
                className={cn(inView && 'fade-in-up')}
                style={
                  inView ? { animationDelay: `${100 + i * 90}ms` } : undefined
                }
              >
                <Link
                  to={`/collections/${col.slug}`}
                  className="group hover-lift block overflow-hidden rounded-(--radius-card) border border-border bg-surface"
                >
                  <div className="aspect-product overflow-hidden md:aspect-banner">
                    {col.image_url ? (
                      <SoftImage
                        src={col.image_url}
                        alt=""
                        className="img-zoom"
                        loading="lazy"
                        decoding="async"
                        width={1200}
                        height={750}
                        sizes="(min-width: 768px) 33vw, 100vw"
                      />
                    ) : (
                      <div className="size-full bg-border" aria-hidden />
                    )}
                  </div>
                  <div className="border-t border-border px-5 py-4 md:px-5 md:py-5">
                    <span className="flex items-center justify-between gap-2 text-lg font-bold md:text-xl">
                      {col.name}
                      <ArrowUpRightIcon
                        className="size-4 shrink-0 text-muted transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-accent"
                        aria-hidden
                      />
                    </span>
                    {col.description ? (
                      <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-muted">
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
    </section>
  )
}
