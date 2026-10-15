import { HeartIcon } from 'lucide-react'
import { Link } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { useWishlist } from '@/contexts/WishlistContext'
import { formatPKR } from '@/lib/format'
import { getMinVariantPrice } from '@/lib/catalog'
import { cn } from '@/lib/utils'
import type { Product } from '@/types'

interface ProductCardProps {
  product: Product
  className?: string
}

export function ProductCard({ product, className }: ProductCardProps) {
  const { toggle, isWishlisted } = useWishlist()
  const images = product.images ?? []
  const primary = images.find((i) => i.is_primary) ?? images[0]
  const secondary = images.find((i) => !i.is_primary) ?? images[1]
  const price = getMinVariantPrice(product)
  const compareVariants = (product.variants ?? []).map((v) => v.compare_at_price).filter(Boolean)
  const compareAt =
    compareVariants.length > 0
      ? Math.min(...compareVariants.map((c) => c as number))
      : null
  const wishlisted = isWishlisted(product.id)

  return (
    <article className={cn('group relative flex flex-col', className)}>
      <div className="relative aspect-product overflow-hidden rounded-(--radius-card) bg-background">
        <Link
          to={`/product/${product.slug}`}
          className="absolute inset-0 z-[1]"
          aria-label={`View ${product.name}`}
        />
        {primary ? (
          <img
            src={primary.url}
            alt={primary.alt}
            className={cn(
              'size-full object-cover',
              secondary &&
                'transition-opacity duration-300 group-hover:opacity-0',
            )}
            loading="lazy"
            decoding="async"
          />
        ) : null}
        {secondary ? (
          <img
            src={secondary.url}
            alt=""
            aria-hidden
            className="absolute inset-0 size-full object-cover opacity-0 transition-opacity duration-300 group-hover:opacity-100"
            loading="lazy"
            decoding="async"
          />
        ) : null}
        <Button
          type="button"
          variant="secondary"
          size="icon"
          className="absolute right-2 top-2 z-[2] size-10 min-h-[44px] min-w-[44px] rounded-full bg-surface/90 shadow-sm backdrop-blur-sm"
          aria-label={wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
          aria-pressed={wishlisted}
          onClick={(e) => {
            e.preventDefault()
            toggle(product.id)
          }}
        >
          <HeartIcon
            className={cn('size-4', wishlisted && 'fill-error text-error')}
            aria-hidden
          />
        </Button>
      </div>
      <div className="mt-3 flex flex-col gap-1">
        <h3 className="font-medium text-text">
          <Link
            to={`/product/${product.slug}`}
            className="hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
          >
            {product.name}
          </Link>
        </h3>
        <p className="flex flex-wrap items-baseline gap-2 text-sm">
          <span className="font-medium text-text">{formatPKR(price)}</span>
          {compareAt != null && compareAt > price ? (
            <span className="text-muted line-through">{formatPKR(compareAt)}</span>
          ) : null}
        </p>
      </div>
    </article>
  )
}
