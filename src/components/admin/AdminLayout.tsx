import {
  CalendarDaysIcon,
  LayoutDashboardIcon,
  MailIcon,
  MenuIcon,
  MessageSquareIcon,
  PackageIcon,
  PercentIcon,
  SettingsIcon,
  ShoppingBagIcon,
  StarIcon,
  WarehouseIcon,
} from 'lucide-react'
import { useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { Toaster } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { store } from '@/config/store'
import { cn } from '@/lib/utils'

const NAV = [
  { to: '/admin', end: true, label: 'Dashboard', icon: LayoutDashboardIcon },
  { to: '/admin/products', label: 'Products', icon: PackageIcon },
  { to: '/admin/inventory', label: 'Inventory', icon: WarehouseIcon },
  { to: '/admin/orders', label: 'Orders', icon: ShoppingBagIcon },
  { to: '/admin/discounts', label: 'Discount codes', icon: PercentIcon },
  { to: '/admin/reviews', label: 'Reviews', icon: StarIcon },
  { to: '/admin/messages', label: 'Contact messages', icon: MessageSquareIcon },
  { to: '/admin/newsletter', label: 'Newsletter', icon: MailIcon },
  { to: '/admin/settings', label: 'Settings', icon: SettingsIcon },
  { to: '/admin/events', label: 'Events log', icon: CalendarDaysIcon },
] as const

function navActive(pathname: string, to: string, end?: boolean) {
  if (end) return pathname === to
  return pathname === to || pathname.startsWith(`${to}/`)
}

function NavItems({
  onNavigate,
  pathname,
}: {
  onNavigate?: () => void
  pathname: string
}) {
  return (
    <ul className="flex flex-col gap-1">
      {NAV.map(({ to, label, icon: Icon, ...rest }) => {
        const end = 'end' in rest ? Boolean(rest.end) : false
        const active = navActive(pathname, to, end)
        return (
          <li key={to}>
            <NavLink
              to={to}
              end={end}
              onClick={onNavigate}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex items-center gap-3 rounded-(--radius-sm) px-3 py-2.5 text-sm font-medium transition-colors',
                active
                  ? 'bg-primary text-brand-band-text'
                  : 'text-text hover:bg-background',
              )}
            >
              <Icon className="size-4 shrink-0 opacity-80" aria-hidden />
              {label}
            </NavLink>
          </li>
        )
      })}
    </ul>
  )
}

export function AdminLayout() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const { pathname } = useLocation()
  const current =
    NAV.find((item) =>
      navActive(pathname, item.to, 'end' in item ? Boolean(item.end) : false),
    )?.label ?? 'Admin'

  return (
    <div className="flex min-h-dvh flex-col bg-background md:flex-row">
      <aside className="hidden w-64 shrink-0 border-r border-border bg-surface md:flex md:flex-col">
        <div className="border-b border-border px-4 py-5">
          <p className="font-display text-lg font-bold text-text">Admin</p>
          <p className="text-xs text-muted">{store.name}</p>
        </div>
        <nav className="flex-1 overflow-y-auto p-3" aria-label="Admin">
          <NavItems pathname={pathname} />
        </nav>
        <div className="border-t border-border p-3">
          <Button variant="secondary" className="w-full" asChild>
            <Link to="/">← Storefront</Link>
          </Button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-border bg-surface/95 px-4 py-3 backdrop-blur md:hidden">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button type="button" variant="secondary" aria-label="Open admin menu">
                <MenuIcon className="size-5" aria-hidden />
                Menu
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-full max-w-xs p-0">
              <SheetHeader className="border-b border-border">
                <SheetTitle>Admin menu</SheetTitle>
              </SheetHeader>
              <nav className="p-3" aria-label="Admin mobile">
                <NavItems
                  pathname={pathname}
                  onNavigate={() => setMobileOpen(false)}
                />
              </nav>
              <div className="border-t border-border p-3">
                <Button variant="secondary" className="w-full" asChild>
                  <Link to="/" onClick={() => setMobileOpen(false)}>
                    ← Storefront
                  </Link>
                </Button>
              </div>
            </SheetContent>
          </Sheet>
          <span className="truncate font-display font-semibold text-text">{current}</span>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/">Store</Link>
          </Button>
        </header>

        <main className="flex-1 overflow-x-hidden p-4 md:p-8">
          <Outlet />
        </main>
      </div>
      <Toaster position="bottom-center" closeButton richColors />
    </div>
  )
}
