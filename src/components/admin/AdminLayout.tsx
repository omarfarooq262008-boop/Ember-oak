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
import { Link, NavLink, Outlet } from 'react-router-dom'
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
  { to: '/admin/discounts', label: 'Discounts', icon: PercentIcon },
  { to: '/admin/reviews', label: 'Reviews', icon: StarIcon },
  { to: '/admin/messages', label: 'Messages', icon: MessageSquareIcon },
  { to: '/admin/newsletter', label: 'Newsletter', icon: MailIcon },
  { to: '/admin/settings', label: 'Settings', icon: SettingsIcon },
  { to: '/admin/events', label: 'Events', icon: CalendarDaysIcon },
] as const

function NavItems({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <ul className="flex flex-col gap-1">
      {NAV.map(({ to, label, icon: Icon, ...rest }) => (
        <li key={to}>
          <NavLink
            to={to}
            end={'end' in rest ? rest.end : false}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-(--radius-sm) px-3 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-brand-band-text'
                  : 'text-text hover:bg-background',
              )
            }
          >
            <Icon className="size-4 shrink-0 opacity-80" aria-hidden />
            {label}
          </NavLink>
        </li>
      ))}
    </ul>
  )
}

export function AdminLayout() {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="flex min-h-dvh flex-col bg-background md:flex-row">
      <aside className="hidden w-60 shrink-0 border-r border-border bg-surface md:flex md:flex-col">
        <div className="border-b border-border px-4 py-5">
          <p className="font-display text-lg font-bold text-text">Admin</p>
          <p className="text-xs text-muted">{store.name}</p>
        </div>
        <nav className="flex-1 overflow-y-auto p-3" aria-label="Admin">
          <NavItems />
        </nav>
        <div className="border-t border-border p-3">
          <Button variant="secondary" className="w-full" asChild>
            <Link to="/">← Storefront</Link>
          </Button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-3 border-b border-border bg-surface/95 px-4 py-3 backdrop-blur md:hidden">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button type="button" variant="ghost" size="icon" aria-label="Open admin menu">
                <MenuIcon className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-full max-w-xs p-0">
              <SheetHeader className="border-b border-border">
                <SheetTitle>Admin</SheetTitle>
              </SheetHeader>
              <nav className="p-3" aria-label="Admin mobile">
                <NavItems onNavigate={() => setMobileOpen(false)} />
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
          <span className="font-display font-semibold text-text">Admin</span>
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
