import { Link } from 'react-router-dom'

import { getCollections } from '@/lib/catalog'
import { useInViewFade } from '@/hooks/useInViewFade'
import { cn } from '@/lib/utils'

export function FeaturedCollections() {
  const collections = getCollections({ featured: true })
  const { ref, inView } = useInViewFade<HTMLElement>()

  return (
    <section
      ref={ref}
      className="section-pad bg-background"
      aria-labelledby="featured-collections-heading"
    >
      <div className="container-eo">
        <h2
          id="featured-collections-heading"
          className={cn('text-2xl md:text-3xl', inView && 'fade-in-up')}
        >
          Featured collections
        </h2>
        <ul className="mt-8 grid gap-4 md:gap-6">
          {collections.map((col, i) => (
            <li
              key={col.id}
              className={cn(inView && 'fade-in-up')}
              style={inView ? { animationDelay: `${i * 80}ms` } : undefined}
            >
              <Link
                to={`/collections/${col.slug}`}
                className="group block overflow-hidden rounded-(--radius-card) bg-surface"
              >
                <div className="aspect-banner overflow-hidden">
                  {col.image_url ? (
                    <img
                      src={col.image_url}
                      alt=""
                      className="size-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.02]"
                      loading="lazy"
                      decoding="async"
                    />
                  ) : (
                    <div className="size-full bg-border" aria-hidden />
                  )}
                </div>
                <div className="border border-t-0 border-border px-5 py-4 md:px-6 md:py-5">
                  <span className="text-lg font-bold md:text-xl">{col.name}</span>
                  {col.description ? (
                    <p className="mt-1 text-sm text-muted line-clamp-2">
                      {col.description}
                    </p>
                  ) : null}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
