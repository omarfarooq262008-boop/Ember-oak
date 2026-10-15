import { MinusIcon, PlusIcon, Trash2Icon } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'

import { FreeDeliveryBar } from '@/components/cart/FreeDeliveryBar'
import { Seo } from '@/components/seo/Seo'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useCart } from '@/contexts/CartContext'
import { formatPKR } from '@/lib/format'

export function CartPage() {
  const {
    items,
    subtotal,
    deliveryFee,
    discountAmount,
    discountCode,
    total,
    updateQty,
    removeItem,
    applyDiscount,
    clearDiscount,
  } = useCart()

  const [codeInput, setCodeInput] = useState(discountCode ?? '')
  const [codeError, setCodeError] = useState<string | null>(null)
  const [codeSuccess, setCodeSuccess] = useState(false)

  const afterDiscount = Math.max(0, subtotal - discountAmount)

  const handleApplyCode = (e: FormEvent) => {
    e.preventDefault()
    setCodeError(null)
    setCodeSuccess(false)
    const result = applyDiscount(codeInput)
    if (!result.ok) {
      setCodeError(result.message)
      return
    }
    setCodeSuccess(true)
  }

  const handleClearCode = () => {
    clearDiscount()
    setCodeInput('')
    setCodeError(null)
    setCodeSuccess(false)
  }

  return (
    <>
      <Seo title="Your cart" description="Review items and proceed to checkout." />

      <div className="section-pad container-eo">
        <h1 className="text-3xl">Your cart</h1>

        {items.length === 0 ? (
          <div className="mt-10 max-w-md">
            <p className="text-muted">Your cart is empty.</p>
            <Button asChild className="mt-6">
              <Link to="/shop">Continue shopping</Link>
            </Button>
          </div>
        ) : (
          <div className="mt-10 grid gap-12 lg:grid-cols-[1fr_22rem] lg:items-start">
            <ul className="divide-y divide-border">
              {items.map((item) => {
                const lineTotal = item.price * item.quantity
                return (
                  <li key={item.variantId} className="flex gap-4 py-6 first:pt-0">
                    <Link
                      to={`/product/${item.productSlug}`}
                      className="shrink-0 overflow-hidden rounded-(--radius-sm) bg-background"
                    >
                      <img
                        src={item.imageUrl}
                        alt={item.imageAlt}
                        className="aspect-product w-24 object-cover sm:w-28"
                        width={112}
                        height={140}
                      />
                    </Link>
                    <div className="flex min-w-0 flex-1 flex-col gap-3">
                      <div>
                        <Link
                          to={`/product/${item.productSlug}`}
                          className="font-medium text-text hover:text-accent"
                        >
                          {item.productName}
                        </Link>
                        {item.variantLabel ? (
                          <p className="text-sm text-muted">{item.variantLabel}</p>
                        ) : null}
                        <p className="mt-1 text-sm tabular-nums">{formatPKR(item.price)} each</p>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center rounded-(--radius-sm) border border-border">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="size-11 rounded-none"
                            aria-label={`Decrease quantity of ${item.productName}`}
                            onClick={() => updateQty(item.variantId, item.quantity - 1)}
                          >
                            <MinusIcon className="size-4" aria-hidden />
                          </Button>
                          <span className="min-w-[2.5rem] text-center text-sm tabular-nums">
                            {item.quantity}
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="size-11 rounded-none"
                            aria-label={`Increase quantity of ${item.productName}`}
                            disabled={item.quantity >= item.maxStock}
                            onClick={() => updateQty(item.variantId, item.quantity + 1)}
                          >
                            <PlusIcon className="size-4" aria-hidden />
                          </Button>
                        </div>
                        <div className="flex items-center gap-4">
                          <p className="text-sm font-medium tabular-nums">
                            {formatPKR(lineTotal)}
                          </p>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label={`Remove ${item.productName}`}
                            onClick={() => removeItem(item.variantId)}
                          >
                            <Trash2Icon className="size-4 text-muted" aria-hidden />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>

            <aside className="space-y-6 rounded-(--radius-card) border border-border bg-surface p-6 lg:sticky lg:top-24">
              <FreeDeliveryBar subtotalAfterDiscount={afterDiscount} />

              <form onSubmit={handleApplyCode} className="space-y-2">
                <Label htmlFor="discount-code">Discount code</Label>
                <div className="flex gap-2">
                  <Input
                    id="discount-code"
                    name="discount"
                    autoComplete="off"
                    value={codeInput}
                    onChange={(e) => setCodeInput(e.target.value)}
                    placeholder="Enter code"
                    aria-invalid={codeError ? true : undefined}
                    aria-describedby={codeError ? 'discount-error' : undefined}
                  />
                  <Button type="submit" variant="secondary">
                    Apply
                  </Button>
                </div>
                {codeError ? (
                  <p id="discount-error" className="text-sm text-error" role="alert">
                    {codeError}
                  </p>
                ) : null}
                {codeSuccess && discountCode ? (
                  <p className="text-sm text-success" role="status">
                    Code {discountCode} applied.
                  </p>
                ) : null}
                {discountCode ? (
                  <Button type="button" variant="ghost" size="sm" onClick={handleClearCode}>
                    Remove code
                  </Button>
                ) : null}
              </form>

              <dl className="space-y-2 border-t border-border pt-4 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted">Subtotal</dt>
                  <dd className="tabular-nums">{formatPKR(subtotal)}</dd>
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
                <div className="flex justify-between border-t border-border pt-3 text-base font-medium">
                  <dt>Total</dt>
                  <dd className="tabular-nums">{formatPKR(total)}</dd>
                </div>
              </dl>

              <Button asChild size="lg" className="w-full">
                <Link to="/checkout">Checkout</Link>
              </Button>
              <Button asChild variant="secondary" className="w-full">
                <Link to="/shop">Continue shopping</Link>
              </Button>
            </aside>
          </div>
        )}
      </div>
    </>
  )
}
