import {
  MenuIcon,
  SearchIcon,
  ShoppingBagIcon,
  UserIcon,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, NavLink } from 'react-router-dom'

import { SearchDialog } from '@/components/search/SearchDialog'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { store } from '@/config/store'
import { useCart } from '@/contexts/CartContext'
import { getCategories, getCollections } from '@/lib/catalog'
import { useScrollShrink } from '@/hooks/useScrollShrink'
import { cn } from '@/lib/utils'

export function Header() {
  const shrunk = useScrollShrink(32)
  const { itemCount, openCart } = useCart()
  const [pop, setPop] = useState(false)
  const prevCount = useRef(itemCount)
  const [searchOpen, setSearchOpen] = useState(false)
  const [shopOpen, setShopOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  const categories = getCategories()
  const featuredCollections = getCollections({ featured: true })
  const heroCollection = featuredCollections[0]

  useEffect(() => {
    if (itemCount > prevCount.current) {
      setPop(true)
      const t = window.setTimeout(() => setPop(false), 300)
      prevCount.current = itemCount
      return () => window.clearTimeout(t)
    }
    prevCount.current = itemCount
  }, [itemCount])

  const openSearch = () => {
    setMobileOpen(false)
    setSearchOpen(true)
  }

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      'text-sm font-medium transition-colors hover:text-accent',
      isActive ? 'text-accent' : 'text-text',
    )

  return (
    <>
      <header
        className={cn(
          'sticky top-0 z-40 border-b border-border bg-surface/95 backdrop-blur-md transition-[padding,box-shadow] duration-200',
          shrunk ? 'shadow-sm' : '',
        )}
      >
        <div
          className={cn(
            'container-eo flex items-center justify-between gap-4 px-4 transition-[height,padding] duration-200 md:px-8',
            shrunk ? 'h-14 py-0' : 'h-16 py-2 md:h-[4.5rem]',
          )}
        >
          <div className="flex items-center gap-2 md:gap-6">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="md:hidden"
                  aria-label="Open menu"
                >
                  <MenuIcon className="size-5" aria-hidden />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-full max-w-xs p-0">
                <SheetHeader className="border-b border-border">
                  <SheetTitle>{store.name}</SheetTitle>
                </SheetHeader>
                <nav className="flex flex-col p-4" aria-label="Mobile">
                  <Link
                    to="/shop"
                    className="touch-target flex items-center px-2 text-base font-medium"
                    onClick={() => setMobileOpen(false)}
                  >
                    Shop
                  </Link>
                  {categories.map((cat) => (
                    <Link
                      key={cat.id}
                      to={`/shop/${cat.slug}`}
                      className="touch-target flex items-center px-4 text-sm text-muted"
                      onClick={() => setMobileOpen(false)}
                    >
                      {cat.name}
                    </Link>
                  ))}
                  <Link
                    to="/collections"
                    className="touch-target mt-2 flex items-center px-2 text-base font-medium"
                    onClick={() => setMobileOpen(false)}
                  >
                    Collections
                  </Link>
                  <Link
                    to="/shop?sort=newest"
                    className="touch-target flex items-center px-2 text-base font-medium"
                    onClick={() => setMobileOpen(false)}
                  >
                    New Arrivals
                  </Link>
                  <Link
                    to="/about"
                    className="touch-target flex items-center px-2 text-base font-medium"
                    onClick={() => setMobileOpen(false)}
                  >
                    About
                  </Link>
                  <Button
                    type="button"
                    variant="secondary"
                    className="mx-2 mt-6"
                    onClick={openSearch}
                  >
                    <SearchIcon className="size-4" aria-hidden />
                    Search
                  </Button>
                </nav>
              </SheetContent>
            </Sheet>

            <Link
              to="/"
              className="font-display text-lg font-extrabold tracking-tight text-text md:text-xl"
            >
              {store.name}
            </Link>
          </div>

          <nav className="hidden items-center gap-8 md:flex" aria-label="Main">
            <div
              className="relative"
              onMouseEnter={() => setShopOpen(true)}
              onMouseLeave={() => setShopOpen(false)}
            >
              <NavLink to="/shop" className={navLinkClass}>
                Shop
              </NavLink>
              {shopOpen ? (
                <div className="absolute left-1/2 top-full z-50 w-[min(100vw-2rem,42rem)] -translate-x-1/2 pt-3">
                  <div className="grid overflow-hidden rounded-(--radius-card) border border-border bg-surface shadow-lg md:grid-cols-[1fr_14rem]">
                    <ul className="grid gap-1 p-4 sm:grid-cols-2">
                      {categories.map((cat) => (
                        <li key={cat.id}>
                          <Link
                            to={`/shop/${cat.slug}`}
                            className="block rounded-(--radius-sm) px-3 py-2 text-sm hover:bg-background"
                            onClick={() => setShopOpen(false)}
                          >
                            <span className="font-medium text-text">
                              {cat.name}
                            </span>
                            {cat.description ? (
                              <span className="mt-0.5 line-clamp-1 block text-xs text-muted">
                                {cat.description}
                              </span>
                            ) : null}
                          </Link>
                        </li>
                      ))}
                    </ul>
                    {heroCollection?.image_url ? (
                      <Link
                        to={`/collections/${heroCollection.slug}`}
                        className="relative hidden min-h-[12rem] bg-background md:block"
                        onClick={() => setShopOpen(false)}
                      >
                        <img
                          src={heroCollection.image_url}
                          alt=""
                          className="absolute inset-0 size-full object-cover"
                        />
                        <span className="absolute inset-x-0 bottom-0 bg-linear-to-t from-primary/80 to-transparent p-4 text-sm font-medium text-brand-band-text">
                          {heroCollection.name}
                        </span>
                      </Link>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>
            {store.navigation.main.slice(1).map((item) => (
              <NavLink key={item.href} to={item.href} className={navLinkClass}>
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-1 sm:gap-2">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Open search"
              onClick={() => setSearchOpen(true)}
            >
              <SearchIcon className="size-5" aria-hidden />
            </Button>
            <Button variant="ghost" size="icon" asChild>
              <Link to="/account" aria-label="Account">
                <UserIcon className="size-5" aria-hidden />
              </Link>
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="relative"
              aria-label={`Cart, ${itemCount} items`}
              onClick={() => openCart()}
            >
              <ShoppingBagIcon className="size-5" aria-hidden />
              {itemCount > 0 ? (
                <span
                  className={cn(
                    'absolute -right-0.5 -top-0.5 flex size-5 items-center justify-center rounded-full bg-accent text-[10px] font-semibold text-brand-band-text',
                    pop && 'cart-count-pop',
                  )}
                >
                  {itemCount > 99 ? '99+' : itemCount}
                </span>
              ) : null}
            </Button>
          </div>
        </div>
      </header>

      <SearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
    </>
  )
}
