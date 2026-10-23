import { Loader2Icon, MinusIcon, PlusIcon, StarIcon } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import { CatalogError } from '@/components/CatalogState'
import { ProductCard } from '@/components/product/ProductCard'
import { ProductGallery } from '@/components/product/ProductGallery'
import {
  VariantSelector,
  findVariantBySelection,
  formatVariantLabel,
  getDefaultSelection,
  getVariantAttributeKeys,
} from '@/components/product/VariantSelector'
import { ProductStructuredData } from '@/components/seo/JsonLd'
import { Seo } from '@/components/seo/Seo'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { store } from '@/config/store'
import { useCart } from '@/contexts/CartContext'
import {
  useApprovedReviews,
  useProductBySlug,
  useRelatedProducts,
} from '@/hooks/useCatalog'
import { getStockState } from '@/lib/api/stock'
import { formatPKR, savingsAmount } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { Product, ProductAttributeKey, Review } from '@/types'

const RETURNS_SUMMARY =
  'Unused items in original packaging may be returned within 14 days of delivery. Contact us to start a return — see our Returns page for details.'

export function ProductPage() {
  const { slug = '' } = useParams<{ slug: string }>()
  const productQuery = useProductBySlug(slug)
  const product = productQuery.data ?? null
  const reviewsQuery = useApprovedReviews(product?.id)
  const relatedQuery = useRelatedProducts(product, 4)

  const { addItem, openCart } = useCart()
  const [adding, setAdding] = useState(false)
  const [quantity, setQuantity] = useState(1)

  const variants = useMemo(
    () => (product?.variants ?? []).filter((v) => v.is_active),
    [product],
  )
  const attributeKeys = useMemo(
    () => getVariantAttributeKeys(variants),
    [variants],
  )

  const [selection, setSelection] = useState<
    Partial<Record<ProductAttributeKey, string>>
  >({})

  useEffect(() => {
    if (variants.length === 0) {
      setSelection({})
      return
    }
    setSelection(getDefaultSelection(variants, attributeKeys))
    setQuantity(1)
  }, [product?.id, variants, attributeKeys])

  const selectedVariant = useMemo(
    () => findVariantBySelection(variants, selection, attributeKeys) ?? null,
    [variants, selection, attributeKeys],
  )

  const stockState = getStockState(selectedVariant)
  const related = relatedQuery.data ?? []
  const reviews = reviewsQuery.data ?? []
  const reviewCount = reviews.length
  const avgRating =
    reviewCount > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviewCount
      : product?.avg_rating ?? null

  const primaryImage =
    product?.images?.find((i) => i.is_primary) ?? product?.images?.[0]

  // Preload the product LCP image (WebP when local) once the slug resolves.
  useEffect(() => {
    if (!primaryImage?.url?.startsWith('/images/')) return
    const base = primaryImage.url.replace(/\.(jpe?g|png|webp)$/i, '')
    const href = `${base}-800.webp`
    const existing = document.head.querySelector(
      `link[rel="preload"][href="${href}"]`,
    )
    if (existing) return
    const link = document.createElement('link')
    link.rel = 'preload'
    link.as = 'image'
    link.type = 'image/webp'
    link.href = href
    link.setAttribute(
      'imagesrcset',
      `${base}-480.webp 480w, ${base}-800.webp 800w, ${base}-1200.webp 1200w`,
    )
    link.setAttribute('imagesizes', '(min-width: 768px) 50vw, 100vw')
    link.fetchPriority = 'high'
    document.head.appendChild(link)
    return () => {
      link.remove()
    }
  }, [primaryImage?.url])

  const handleSelect = useCallback(
    (key: ProductAttributeKey, value: string) => {
      setSelection((prev) => {
        const next = { ...prev, [key]: value }
        if (!findVariantBySelection(variants, next, attributeKeys)) {
          for (const otherKey of attributeKeys) {
            if (otherKey === key) continue
            delete next[otherKey]
          }
        }
        return { ...next }
      })
      setQuantity(1)
    },
    [attributeKeys, variants],
  )

  const handleAddToCart = async () => {
    if (!product || !selectedVariant || selectedVariant.stock <= 0) return
    setAdding(true)
    await new Promise((r) => setTimeout(r, 400))
    const image = primaryImage
    addItem({
      variantId: selectedVariant.id,
      productId: product.id,
      productSlug: product.slug,
      productName: product.name,
      variantLabel: formatVariantLabel(selectedVariant.options),
      sku: selectedVariant.sku,
      price: selectedVariant.price,
      compareAtPrice: selectedVariant.compare_at_price,
      quantity,
      imageUrl: image?.url ?? '',
      imageAlt: image?.alt ?? product.name,
      maxStock: selectedVariant.stock,
    })
    setAdding(false)
    openCart()
  }

  if (productQuery.isLoading) {
    return <ProductPageSkeleton />
  }

  if (productQuery.isError) {
    return (
      <div className="section-pad container-eo max-w-lg">
        <Seo title="Couldn’t load product" />
        <CatalogError onRetry={() => void productQuery.refetch()} />
      </div>
    )
  }

  if (!product) {
    return (
      <div className="section-pad container-eo mx-auto max-w-lg text-center">
        <Seo title="Product not found" />
        <h1 className="text-2xl">Product not found</h1>
        <p className="mt-2 text-muted">
          This item may have been removed or the link is incorrect.
        </p>
        <Button asChild className="mt-6">
          <Link to="/shop">Back to shop</Link>
        </Button>
      </div>
    )
  }

  const price = selectedVariant?.price ?? variants[0]?.price ?? 0
  const compareAt = selectedVariant?.compare_at_price ?? null
  const saved = savingsAmount(price, compareAt)
  const canAdd =
    selectedVariant != null && selectedVariant.stock > 0 && quantity > 0
  const offerInStock =
    selectedVariant != null
      ? selectedVariant.stock > 0
      : (variants[0]?.stock ?? 0) > 0

  return (
    <>
      <Seo
        title={product.name}
        description={product.short_description}
        image={primaryImage?.url}
        url={`${store.seo.siteUrl}/product/${product.slug}`}
        type="product"
      />
      <ProductStructuredData
        name={product.name}
        description={product.short_description}
        imageUrl={primaryImage?.url}
        sku={selectedVariant?.sku}
        url={`${store.seo.siteUrl}/product/${product.slug}`}
        priceCurrency={store.currency.code}
        price={price}
        inStock={offerInStock}
      />

      <div className="section-pad container-eo pb-24 md:pb-16">
        <nav className="mb-6 text-sm text-muted" aria-label="Breadcrumb">
          <Link to="/shop" className="hover:text-accent">
            Shop
          </Link>
          {product.category ? (
            <>
              <span aria-hidden className="mx-2">
                /
              </span>
              <Link
                to={`/shop/${product.category.slug}`}
                className="hover:text-accent"
              >
                {product.category.name}
              </Link>
            </>
          ) : null}
        </nav>

        <div className="grid gap-10 lg:grid-cols-2 lg:gap-14">
          <ProductGallery
            images={product.images ?? []}
            productName={product.name}
          />

          <div className="flex flex-col gap-6">
            <div>
              <h1 className="text-3xl md:text-4xl">{product.name}</h1>
              <RatingArea reviewCount={reviewCount} avgRating={avgRating} />
            </div>

            <div className="flex flex-wrap items-baseline gap-3">
              <span className="text-2xl font-medium tabular-nums">
                {formatPKR(price)}
              </span>
              {compareAt != null && compareAt > price ? (
                <>
                  <span className="text-lg text-muted line-through tabular-nums">
                    {formatPKR(compareAt)}
                  </span>
                  {saved != null ? (
                    <span className="text-sm font-medium text-success">
                      Save {formatPKR(saved)}
                    </span>
                  ) : null}
                </>
              ) : null}
            </div>

            <p
              className={cn(
                'text-sm font-medium',
                stockState.kind === 'out_of_stock' && 'text-error',
                stockState.kind === 'low_stock' && 'text-accent',
                stockState.kind === 'in_stock' && 'text-success',
              )}
              role="status"
            >
              {stockState.label}
            </p>

            <p className="leading-relaxed text-muted">
              {product.short_description}
            </p>

            {variants.length > 0 ? (
              <VariantSelector
                variants={variants}
                attributeKeys={attributeKeys}
                selection={selection}
                selectedVariant={selectedVariant}
                onSelect={handleSelect}
              />
            ) : null}

            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center rounded-(--radius-sm) border border-border">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-11 rounded-none"
                  aria-label="Decrease quantity"
                  disabled={quantity <= 1}
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                >
                  <MinusIcon className="size-4" aria-hidden />
                </Button>
                <span
                  className="min-w-[2.5rem] text-center text-sm font-medium tabular-nums"
                  aria-live="polite"
                >
                  {quantity}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-11 rounded-none"
                  aria-label="Increase quantity"
                  disabled={
                    !selectedVariant || quantity >= selectedVariant.stock
                  }
                  onClick={() =>
                    setQuantity((q) =>
                      selectedVariant
                        ? Math.min(q + 1, selectedVariant.stock)
                        : q,
                    )
                  }
                >
                  <PlusIcon className="size-4" aria-hidden />
                </Button>
              </div>

              <Button
                type="button"
                size="lg"
                className="hidden min-h-[44px] flex-1 md:inline-flex"
                disabled={!canAdd || adding}
                onClick={handleAddToCart}
              >
                {adding ? (
                  <>
                    <Loader2Icon className="size-4 animate-spin" aria-hidden />
                    Adding…
                  </>
                ) : (
                  'Add to cart'
                )}
              </Button>
            </div>

            <Button
              type="button"
              size="lg"
              className="w-full md:hidden"
              disabled={!canAdd || adding}
              onClick={handleAddToCart}
            >
              {adding ? (
                <>
                  <Loader2Icon className="size-4 animate-spin" aria-hidden />
                  Adding…
                </>
              ) : (
                'Add to cart'
              )}
            </Button>

            <div className="space-y-2 rounded-(--radius-card) border border-border bg-background/60 p-4 text-sm text-muted">
              <p>
                <span className="font-medium text-text">Delivery:</span>{' '}
                {store.delivery.summary}
              </p>
              <p>
                <span className="font-medium text-text">Returns:</span>{' '}
                {RETURNS_SUMMARY}
              </p>
            </div>

            <ProductAccordion product={product} />
          </div>
        </div>

        <ReviewsBlock
          reviews={reviews}
          isLoading={reviewsQuery.isLoading}
          isError={reviewsQuery.isError}
          onRetry={() => void reviewsQuery.refetch()}
        />

        {relatedQuery.isLoading ? (
          <div className="mt-16 grid grid-cols-2 gap-4 md:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="aspect-product rounded-(--radius-card)" />
            ))}
          </div>
        ) : related.length > 0 ? (
          <section className="mt-16" aria-labelledby="related-heading">
            <h2 id="related-heading" className="text-2xl">
              You may also like
            </h2>
            <ul className="mt-8 grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-4">
              {related.map((p) => (
                <li key={p.id}>
                  <ProductCard product={p} />
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>

      <div
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/95 p-4 backdrop-blur-md md:hidden"
        role="region"
        aria-label="Add to cart"
      >
        <div className="container-eo flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{product.name}</p>
            <p className="text-sm tabular-nums">{formatPKR(price)}</p>
          </div>
          <Button
            type="button"
            className="shrink-0"
            disabled={!canAdd || adding}
            onClick={handleAddToCart}
          >
            {adding ? 'Adding…' : 'Add to cart'}
          </Button>
        </div>
      </div>
    </>
  )
}

function ReviewsBlock({
  reviews,
  isLoading,
  isError,
  onRetry,
}: {
  reviews: Review[]
  isLoading: boolean
  isError: boolean
  onRetry: () => void
}) {
  return (
    <section className="mt-16" aria-labelledby="product-reviews-heading">
      <h2 id="product-reviews-heading" className="text-2xl">
        Reviews
      </h2>
      {isLoading ? (
        <div className="mt-6 space-y-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : isError ? (
        <div className="mt-6">
          <CatalogError onRetry={onRetry} />
        </div>
      ) : reviews.length === 0 ? (
        <div className="mt-6 rounded-(--radius-card) border border-dashed border-border bg-surface px-6 py-12 text-center">
          <p className="text-sm text-muted">
            No reviews yet. Verified reviews from delivered orders will appear
            here once approved.
          </p>
        </div>
      ) : (
        <ul className="mt-6 space-y-4">
          {reviews.map((review) => (
            <li
              key={review.id}
              className="rounded-(--radius-card) border border-border bg-surface p-5"
            >
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex text-accent" aria-hidden>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <StarIcon
                      key={i}
                      className={cn(
                        'size-3.5',
                        i < review.rating ? 'fill-current' : 'opacity-30',
                      )}
                    />
                  ))}
                </div>
                <span className="text-sm font-medium">{review.customer_name}</span>
                {review.is_verified ? (
                  <span className="text-xs text-success">Verified purchase</span>
                ) : null}
              </div>
              {review.title ? (
                <p className="mt-2 text-sm font-medium">{review.title}</p>
              ) : null}
              <p className="mt-2 text-sm leading-relaxed text-muted">
                {review.body}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function RatingArea({
  reviewCount,
  avgRating,
}: {
  reviewCount: number
  avgRating?: number | null
}) {
  if (reviewCount === 0) {
    return (
      <p className="mt-2 text-sm text-muted" role="status">
        No reviews yet
      </p>
    )
  }

  const rating = avgRating ?? 0
  return (
    <div
      className="mt-2 flex items-center gap-2"
      aria-label={`Rated ${rating} out of 5`}
    >
      <div className="flex text-accent">
        {Array.from({ length: 5 }).map((_, i) => (
          <StarIcon
            key={i}
            className={cn(
              'size-4',
              i < Math.round(rating) ? 'fill-current' : 'opacity-30',
            )}
            aria-hidden
          />
        ))}
      </div>
      <span className="text-sm text-muted">
        {rating.toFixed(1)} · {reviewCount} review
        {reviewCount === 1 ? '' : 's'}
      </span>
    </div>
  )
}

function ProductAccordion({ product }: { product: Product }) {
  return (
    <Accordion type="multiple" defaultValue={['details']} className="w-full">
      <AccordionItem value="details">
        <AccordionTrigger>Details</AccordionTrigger>
        <AccordionContent>
          <p className="whitespace-pre-line">{product.description}</p>
        </AccordionContent>
      </AccordionItem>
      {product.materials ? (
        <AccordionItem value="materials">
          <AccordionTrigger>Materials</AccordionTrigger>
          <AccordionContent>{product.materials}</AccordionContent>
        </AccordionItem>
      ) : null}
      {product.dimensions ? (
        <AccordionItem value="dimensions">
          <AccordionTrigger>Dimensions</AccordionTrigger>
          <AccordionContent>{product.dimensions}</AccordionContent>
        </AccordionItem>
      ) : null}
      {product.care ? (
        <AccordionItem value="care">
          <AccordionTrigger>Care</AccordionTrigger>
          <AccordionContent>{product.care}</AccordionContent>
        </AccordionItem>
      ) : null}
      <AccordionItem value="shipping">
        <AccordionTrigger>Shipping</AccordionTrigger>
        <AccordionContent>
          <p>{store.delivery.summary}</p>
          <p className="mt-2">
            Estimated {store.delivery.workingDaysMin}–
            {store.delivery.workingDaysMax} working days nationwide after
            dispatch.
          </p>
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="returns">
        <AccordionTrigger>Returns</AccordionTrigger>
        <AccordionContent>{RETURNS_SUMMARY}</AccordionContent>
      </AccordionItem>
    </Accordion>
  )
}

function ProductPageSkeleton() {
  return (
    <div className="section-pad container-eo">
      <div className="grid gap-10 lg:grid-cols-2">
        <Skeleton className="aspect-gallery w-full rounded-(--radius-card)" />
        <div className="space-y-4">
          <Skeleton className="h-10 w-3/4" />
          <Skeleton className="h-6 w-1/3" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      </div>
    </div>
  )
}
