import { Link } from 'react-router-dom'

import {
  CatalogError,
  ProductGridSkeleton,
} from '@/components/CatalogState'
import { ProductCard } from '@/components/product/ProductCard'
import { Button } from '@/components/ui/button'
import { useBestsellers } from '@/hooks/useCatalog'
import { useInViewFade } from '@/hooks/useInViewFade'
import { cn } from '@/lib/utils'

export function BestSellers() {
  const { data, isLoading, isError, refetch } = useBestsellers(8)
  const products = data ?? []
  const { ref, inView } = useInViewFade<HTMLElement>()

  return (
    <section
      ref={ref}
      className="section-pad bg-surface"
      aria-labelledby="bestsellers-heading"
    >
      <div className="container-eo">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p
              className={cn(
                'text-xs font-medium uppercase tracking-[0.2em] text-accent',
                inView && 'fade-in',
              )}
            >
              Most loved
            </p>
            <h2
              id="bestsellers-heading"
              className={cn(
                'mt-2 text-2xl md:text-3xl',
                inView && 'fade-in-up',
              )}
            >
              Bestsellers
            </h2>
          </div>
          <Button
            variant="secondary"
            asChild
            className="self-start sm:self-auto"
          >
            <Link to="/shop">View all</Link>
          </Button>
        </div>

        {isLoading ? (
          <div className="mt-8">
            <ProductGridSkeleton count={8} />
          </div>
        ) : isError ? (
          <div className="mt-8">
            <CatalogError onRetry={() => void refetch()} />
          </div>
        ) : (
          <ul
            className={cn(
              'mt-8 grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 lg:grid-cols-4',
              inView && 'stagger-children',
            )}
          >
            {products.map((product) => (
              <li key={product.id}>
                <ProductCard product={product} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
