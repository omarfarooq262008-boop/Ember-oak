import { Link } from 'react-router-dom'

import { ProductCard } from '@/components/product/ProductCard'
import { Button } from '@/components/ui/button'
import { getBestsellers } from '@/lib/catalog'
import { useInViewFade } from '@/hooks/useInViewFade'
import { cn } from '@/lib/utils'

export function BestSellers() {
  const products = getBestsellers(8)
  const { ref, inView } = useInViewFade<HTMLElement>()

  return (
    <section
      ref={ref}
      className="section-pad bg-surface"
      aria-labelledby="bestsellers-heading"
    >
      <div className="container-eo">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <h2
            id="bestsellers-heading"
            className={cn('text-2xl md:text-3xl', inView && 'fade-in-up')}
          >
            Bestsellers
          </h2>
          <Button variant="ghost" asChild className="self-start sm:self-auto">
            <Link to="/shop">View all</Link>
          </Button>
        </div>
        <ul className="mt-8 grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 lg:grid-cols-4">
          {products.map((product) => (
            <li key={product.id}>
              <ProductCard product={product} />
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
