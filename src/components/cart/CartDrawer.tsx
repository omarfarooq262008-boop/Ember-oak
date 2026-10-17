import { MinusIcon, PlusIcon, Trash2Icon } from 'lucide-react'
import { Link } from 'react-router-dom'

import { DiscountCodeField } from '@/components/cart/DiscountCodeField'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { SoftImage } from '@/components/ui/soft-image'
import { useCart } from '@/contexts/CartContext'
import { useStoreSettings } from '@/hooks/useStoreSettings'
import { formatPKR } from '@/lib/format'
import { cn } from '@/lib/utils'

export function CartDrawer() {
  const {
    items,
    cartOpen,
    setCartOpen,
    subtotal,
    deliveryFee,
    discountAmount,
    total,
    updateQty,
    removeItem,
  } = useCart()

  const { delivery } = useStoreSettings()
  const { freeAbovePKR } = delivery
  const afterDiscount = Math.max(0, subtotal - discountAmount)
  const remainingForFree = Math.max(0, freeAbovePKR - afterDiscount)
  const progress = Math.min(100, (afterDiscount / freeAbovePKR) * 100)

  return (
    <Sheet open={cartOpen} onOpenChange={setCartOpen}>
      <SheetContent side="right" className="flex w-full max-w-md flex-col p-0">
        <SheetHeader>
          <SheetTitle>Your cart</SheetTitle>
          <SheetDescription>
            {items.length === 0
              ? 'Your cart is empty.'
              : `${items.length} line item${items.length === 1 ? '' : 's'}`}
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-1 flex-col overflow-y-auto px-6 pb-4">
          {items.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted">
              Explore the shop to find something you love.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {items.map((item) => (
                <li key={item.variantId} className="flex gap-4 py-4">
                  <Link
                    to={`/product/${item.productSlug}`}
                    onClick={() => setCartOpen(false)}
                    className="shrink-0 overflow-hidden rounded-(--radius-sm) bg-background"
                  >
                    <SoftImage
                      src={item.imageUrl}
                      alt={item.imageAlt}
                      className="aspect-product w-20 object-cover"
                      width={80}
                      height={100}
                    />
                  </Link>
                  <div className="flex min-w-0 flex-1 flex-col gap-2">
                    <div>
                      <Link
                        to={`/product/${item.productSlug}`}
                        onClick={() => setCartOpen(false)}
                        className="font-medium text-text hover:text-accent"
                      >
                        {item.productName}
                      </Link>
                      {item.variantLabel ? (
                        <p className="text-xs text-muted">{item.variantLabel}</p>
                      ) : null}
                    </div>
                    <p className="text-sm font-medium">{formatPKR(item.price)}</p>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center rounded-(--radius-sm) border border-border">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-10 rounded-none"
                          aria-label={`Decrease quantity of ${item.productName}`}
                          onClick={() => updateQty(item.variantId, item.quantity - 1)}
                        >
                          <MinusIcon className="size-4" aria-hidden />
                        </Button>
                        <span className="min-w-[2rem] text-center text-sm tabular-nums">
                          {item.quantity}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-10 rounded-none"
                          aria-label={`Increase quantity of ${item.productName}`}
                          disabled={item.quantity >= item.maxStock}
                          onClick={() => updateQty(item.variantId, item.quantity + 1)}
                        >
                          <PlusIcon className="size-4" aria-hidden />
                        </Button>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label={`Remove ${item.productName} from cart`}
                        onClick={() => removeItem(item.variantId)}
                      >
                        <Trash2Icon className="size-4 text-muted" aria-hidden />
                      </Button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {items.length > 0 ? (
          <SheetFooter className="gap-4">
            <div className="w-full space-y-2 text-sm">
              {remainingForFree > 0 ? (
                <p className="text-muted">
                  Add {formatPKR(remainingForFree)} more for free delivery
                </p>
              ) : (
                <p className="text-success">You qualify for free delivery</p>
              )}
              <div
                className="h-1.5 w-full overflow-hidden rounded-full bg-border"
                role="progressbar"
                aria-valuenow={Math.round(progress)}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Progress toward free delivery"
              >
                <div
                  className={cn('h-full bg-accent transition-all duration-300')}
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            <DiscountCodeField
              idPrefix="drawer"
              compact
              className="w-full border-t border-border pt-3"
            />

            <dl className="w-full space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted">Subtotal</dt>
                <dd className="font-medium tabular-nums">{formatPKR(subtotal)}</dd>
              </div>
              {discountAmount > 0 ? (
                <div className="flex justify-between text-success">
                  <dt>Discount</dt>
                  <dd className="tabular-nums">−{formatPKR(discountAmount)}</dd>
                </div>
              ) : null}
              <div className="flex justify-between">
                <dt className="text-muted">Delivery</dt>
                <dd className="tabular-nums">
                  {deliveryFee === 0 ? 'Free' : formatPKR(deliveryFee)}
                </dd>
              </div>
              <div className="flex justify-between border-t border-border pt-2 text-base font-medium">
                <dt>Total</dt>
                <dd className="tabular-nums">{formatPKR(total)}</dd>
              </div>
            </dl>

            <Button asChild className="w-full" size="lg">
              <Link to="/checkout" onClick={() => setCartOpen(false)}>
                Checkout
              </Link>
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="w-full"
              onClick={() => setCartOpen(false)}
            >
              Continue shopping
            </Button>
          </SheetFooter>
        ) : (
          <SheetFooter>
            <Button
              type="button"
              variant="secondary"
              className="w-full"
              onClick={() => setCartOpen(false)}
            >
              Continue shopping
            </Button>
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  )
}
