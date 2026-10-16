import { Outlet } from 'react-router-dom'
import { Toaster } from 'sonner'

import { CartDrawer } from '@/components/cart/CartDrawer'
import { AnnouncementBar } from '@/components/layout/AnnouncementBar'
import { Footer } from '@/components/layout/Footer'
import { Header } from '@/components/layout/Header'
import { AuthProvider } from '@/contexts/AuthContext'
import { CartProvider } from '@/contexts/CartContext'
import { WishlistProvider } from '@/contexts/WishlistContext'

export function RootLayout() {
  return (
    <AuthProvider>
      <CartProvider>
        <WishlistProvider>
          <div className="flex min-h-dvh flex-col">
            <AnnouncementBar />
            <Header />
            <main id="main-content" className="flex-1">
              <Outlet />
            </main>
            <Footer />
            <CartDrawer />
            <Toaster position="bottom-center" closeButton richColors />
          </div>
        </WishlistProvider>
      </CartProvider>
    </AuthProvider>
  )
}
