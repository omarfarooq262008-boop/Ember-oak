import { HeartIcon } from 'lucide-react'
import { Link } from 'react-router-dom'

import { SoftImage } from '@/components/ui/soft-image'
import { Button } from '@/components/ui/button'
import { useWishlist } from '@/contexts/WishlistContext'
import { formatPKR } from '@/lib/format'
import { getMinVariantPrice } from '@/lib/api/stock'
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
  const price = getMinVariantPrice(product.variants)
  const compareVariants = (product.variants ?? [])
    .map((v) => v.compare_at_price)
    .filter(Boolean)
  const compareAt =
    compareVariants.length > 0
      ? Math.min(...compareVariants.map((c) => c as number))
      : null
  const wishlisted = isWishlisted(product.id)
  const onSale = compareAt != null && compareAt > price

  return (
    <article
      className={cn(
        'group relative flex flex-col hover-lift',
        className,
      )}
    >
      <div className="relative aspect-product overflow-hidden rounded-(--radius-card) border border-border/70 bg-background">
        <Link
          to={`/product/${product.slug}`}
          className="absolute inset-0 z-[1]"
          aria-label={`View ${product.name}`}
        />
        {primary ? (
          <SoftImage
            src={primary.url}
            alt={primary.alt}
            className={cn(
              'img-zoom',
              secondary &&
                'transition-opacity duration-300 group-hover:opacity-0',
            )}
            loading="lazy"
            decoding="async"
            width={600}
            height={750}
          />
        ) : null}
        {secondary ? (
          <span className="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
            <SoftImage
              src={secondary.url}
              alt=""
              aria-hidden
              className="img-zoom"
              loading="lazy"
              decoding="async"
              width={600}
              height={750}
            />
          </span>
        ) : null}
        {onSale ? (
          <span className="pointer-events-none absolute left-2 top-2 z-[2] rounded-(--radius-sm) bg-surface/95 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-accent shadow-sm">
            Sale
          </span>
        ) : null}
        <Button
          type="button"
          variant="secondary"
          size="icon"
          className="absolute right-2 top-2 z-[2] size-10 min-h-[44px] min-w-[44px] rounded-full border-border/80 bg-surface/95 shadow-sm backdrop-blur-sm transition-transform duration-200 hover:scale-105"
          aria-label={wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
          aria-pressed={wishlisted}
          onClick={(e) => {
            e.preventDefault()
            toggle(product.id)
          }}
        >
          <HeartIcon
            className={cn(
              'size-4 transition-colors duration-200',
              wishlisted && 'fill-error text-error',
            )}
            aria-hidden
          />
        </Button>
      </div>
      <div className="mt-3 flex flex-col gap-1 px-0.5">
        <h3 className="font-medium leading-snug text-text">
          <Link
            to={`/product/${product.slug}`}
            className="transition-colors duration-200 hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
          >
            {product.name}
          </Link>
        </h3>
        <p className="line-clamp-1 text-xs text-muted">
          {product.short_description}
        </p>
        <p className="mt-0.5 flex flex-wrap items-baseline gap-2 text-sm">
          <span className="font-semibold text-text">{formatPKR(price)}</span>
          {onSale ? (
            <span className="text-muted line-through">{formatPKR(compareAt)}</span>
          ) : null}
        </p>
      </div>
    </article>
  )
}
